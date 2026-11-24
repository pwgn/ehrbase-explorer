// AQL-backed queries for the browse views. AQL has no GROUP BY, but EHRbase
// groups aggregates (COUNT, MAX) by the other selected columns, so counts are
// computed in the database rather than by fetching every composition.
import { useQuery } from '@tanstack/react-query'
import {
  getCanonicalComposition,
  getFlatComposition,
  getRevisionHistory,
  getWebTemplate,
  listTemplates,
  RequestError,
  runAql,
} from './ehrbase'

export interface TemplateStats {
  templateId: string
  rootArchetype: string
  uploaded: string
  compositions: number
  patients: number
}

export interface Overview {
  patients: number
  compositions: number
  templates: TemplateStats[]
}

export interface PatientSummary {
  ehrId: string
  subjectId: string | null
  namespace: string | null
  created: string
  compositions: number
  latest: string | null
}

export interface CompositionSummary {
  uid: string
  name: string
  templateId: string
  startTime: string
  composer: string | null
}

async function rows<T extends unknown[]>(q: string, params?: Record<string, unknown>) {
  const result = await runAql(q, params)
  return result.rows as T[]
}

const EHR_COLUMNS = `e/ehr_id/value, e/ehr_status/subject/external_ref/id/value,
e/ehr_status/subject/external_ref/namespace, e/time_created/value`

const COMPOSITION_COLUMNS = `c/uid/value, c/name/value, c/archetype_details/template_id/value,
c/context/start_time/value, c/composer/name`

type EhrRow = [string, string | null, string | null, string]
type CompositionRow = [string, string, string, string, string | null]

function toComposition([uid, name, templateId, startTime, composer]: CompositionRow): CompositionSummary {
  return { uid, name, templateId, startTime, composer }
}

async function getOverview(): Promise<Overview> {
  const [templates, ehrCount, perTemplate] = await Promise.all([
    listTemplates(),
    rows<[number]>('SELECT COUNT(e/ehr_id/value) FROM EHR e'),
    rows<[string, number, number]>(
      `SELECT c/archetype_details/template_id/value, COUNT(c/uid/value), COUNT(DISTINCT e/ehr_id/value)
FROM EHR e CONTAINS COMPOSITION c`,
    ),
  ])

  const counts = new Map(perTemplate.map(([templateId, compositions, patients]) => [templateId, { compositions, patients }]))

  return {
    patients: ehrCount[0]?.[0] ?? 0,
    compositions: perTemplate.reduce((sum, [, n]) => sum + n, 0),
    templates: templates.map((t) => ({
      templateId: t.template_id,
      rootArchetype: t.archetype_id,
      uploaded: t.created_timestamp,
      compositions: counts.get(t.template_id)?.compositions ?? 0,
      patients: counts.get(t.template_id)?.patients ?? 0,
    })),
  }
}

// Rows per page in the paginated lists.
export const PAGE_SIZE = 50

const pageClause = (page: number) => `LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`

// By subject ID; the EHR ID tie-breaker keeps pages stable.
const PATIENT_ORDER = 'ORDER BY e/ehr_status/subject/external_ref/id/value ASC, e/ehr_id/value ASC'

type EhrStatsRow = [...EhrRow, number, string]

const toPatient = ([ehrId, subjectId, namespace, created]: EhrRow, stats?: { count: number; latest: string }) => ({
  ehrId,
  subjectId,
  namespace,
  created,
  compositions: stats?.count ?? 0,
  latest: stats?.latest ?? null,
})

export interface PatientPage {
  total: number
  patients: PatientSummary[]
}

// One page (1-based) of all EHRs, or of those with at least one composition
// of `templateId`.
async function listPatients(templateId: string | undefined, page: number): Promise<PatientPage> {
  if (templateId) {
    // Only EHRs with a matching composition, so the counts come with the page.
    // EHRbase groups the aggregates by the other columns: one row per EHR.
    const params = { template_id: templateId }
    const where = 'WHERE c/archetype_details/template_id/value = $template_id'
    const [total, pageRows] = await Promise.all([
      rows<[number]>(`SELECT COUNT(DISTINCT e/ehr_id/value) FROM EHR e CONTAINS COMPOSITION c ${where}`, params),
      rows<EhrStatsRow>(
        `SELECT ${EHR_COLUMNS}, COUNT(c/uid/value), MAX(c/context/start_time/value)
FROM EHR e CONTAINS COMPOSITION c ${where}
${PATIENT_ORDER} ${pageClause(page)}`,
        params,
      ),
    ])
    return {
      total: total[0]?.[0] ?? 0,
      patients: pageRows.map(([ehrId, subjectId, namespace, created, count, latest]) =>
        toPatient([ehrId, subjectId, namespace, created], { count, latest }),
      ),
    }
  }

  // EHRs without compositions belong in this list too, which a CONTAINS
  // COMPOSITION query would drop: page the EHRs, then count for that page.
  const [total, ehrs] = await Promise.all([
    rows<[number]>('SELECT COUNT(e/ehr_id/value) FROM EHR e'),
    rows<EhrRow>(`SELECT ${EHR_COLUMNS} FROM EHR e ${PATIENT_ORDER} ${pageClause(page)}`),
  ])
  const perEhr =
    ehrs.length === 0
      ? []
      : await rows<[string, number, string]>(
          `SELECT e/ehr_id/value, COUNT(c/uid/value), MAX(c/context/start_time/value)
FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value matches {$ehr_ids}`,
          { ehr_ids: ehrs.map(([ehrId]) => ehrId) },
        )
  const stats = new Map(perEhr.map(([ehrId, count, latest]) => [ehrId, { count, latest }]))
  return { total: total[0]?.[0] ?? 0, patients: ehrs.map((ehr) => toPatient(ehr, stats.get(ehr[0]))) }
}

async function getPatient(ehrId: string) {
  const params = { ehr_id: ehrId }
  const [ehrs, counts] = await Promise.all([
    rows<EhrRow>(`SELECT ${EHR_COLUMNS} FROM EHR e[ehr_id/value=$ehr_id]`, params),
    rows<[number]>('SELECT COUNT(c/uid/value) FROM EHR e[ehr_id/value=$ehr_id] CONTAINS COMPOSITION c', params),
  ])
  if (ehrs.length === 0) throw new Error(`EHR ${ehrId} not found`)
  const [, subjectId, namespace, created] = ehrs[0]
  return { ehrId, subjectId, namespace, created, compositionCount: counts[0]?.[0] ?? 0 }
}

// One page (1-based) of an EHR's compositions, newest first. The uid
// tie-breaker keeps pages stable when start times are equal.
async function listCompositions(ehrId: string, page: number): Promise<CompositionSummary[]> {
  const result = await rows<CompositionRow>(
    `SELECT ${COMPOSITION_COLUMNS} FROM EHR e[ehr_id/value=$ehr_id] CONTAINS COMPOSITION c
ORDER BY c/context/start_time/value DESC, c/uid/value ASC ${pageClause(page)}`,
    { ehr_id: ehrId },
  )
  return result.map(toComposition)
}

// Read from the composition itself rather than AQL, which only sees latest versions.
async function getComposition(ehrId: string, uid: string) {
  const [c, flat] = await Promise.all([getCanonicalComposition(ehrId, uid), getFlatComposition(ehrId, uid)]).catch(
    (error: unknown) => {
      // EHRbase answers 204 for a deleted composition (or its deleting version).
      if (error instanceof RequestError && error.status === 204) throw new RequestError(`Composition ${uid} has been deleted.`, 204)
      if (error instanceof RequestError && error.status === 404) throw new RequestError(`Composition ${uid} not found.`, 404)
      throw error
    },
  )
  return {
    uid: c.uid.value,
    name: c.name.value,
    templateId: c.archetype_details.template_id.value,
    startTime: c.context?.start_time.value ?? '',
    composer: c.composer.name ?? null,
    flat,
  }
}

export interface CompositionVersion {
  uid: string
  version: number
  committed: string
  changeType: string
  committer: string | null
}

// "<id>::<system>::<n>" → "<id>" and n.
export const versionedObjectId = (uid: string) => uid.split('::')[0]
export const versionNumber = (uid: string) => Number(uid.split('::')[2] ?? 1)

async function listVersions(ehrId: string, uid: string): Promise<CompositionVersion[]> {
  const history = await getRevisionHistory(ehrId, versionedObjectId(uid))
  return history
    .map((item) => {
      const audit = item.audits[0]
      return {
        uid: item.version_id.value,
        version: versionNumber(item.version_id.value),
        committed: audit?.time_committed.value ?? '',
        changeType: audit?.change_type.value ?? '',
        committer: audit?.committer?.name ?? null,
      }
    })
    .sort((a, b) => b.version - a.version)
}

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: getOverview })

// For paged queries keyed [name, list, page]: keep showing the current page
// while the next page of the same list loads, but not another list's rows.
function previousPageOf<T>(list: string | undefined) {
  return (previous: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) =>
    previousQuery?.queryKey[1] === list ? previous : undefined
}

export const usePatients = (templateId: string | undefined, page: number) =>
  useQuery({
    queryKey: ['patients', templateId, page],
    queryFn: () => listPatients(templateId, page),
    placeholderData: previousPageOf<PatientPage>(templateId),
  })

export const usePatient = (ehrId: string) =>
  useQuery({ queryKey: ['patient', ehrId], queryFn: () => getPatient(ehrId) })

export const usePatientCompositions = (ehrId: string, page: number) =>
  useQuery({
    queryKey: ['compositions', ehrId, page],
    queryFn: () => listCompositions(ehrId, page),
    placeholderData: previousPageOf<CompositionSummary[]>(ehrId),
  })

export const useComposition = (ehrId: string, uid: string | undefined) =>
  useQuery({
    queryKey: ['composition', ehrId, uid],
    queryFn: () => getComposition(ehrId, uid!),
    enabled: !!uid,
    // A specific version never changes.
    staleTime: uid?.includes('::') ? Infinity : 0,
  })

export const useCompositionVersions = (ehrId: string, uid: string) =>
  useQuery({
    queryKey: ['versions', ehrId, versionedObjectId(uid)],
    queryFn: () => listVersions(ehrId, uid),
  })

export const useWebTemplate = (templateId: string | undefined) =>
  useQuery({
    queryKey: ['webTemplate', templateId],
    queryFn: () => getWebTemplate(templateId!),
    enabled: !!templateId,
    staleTime: Infinity,
  })
