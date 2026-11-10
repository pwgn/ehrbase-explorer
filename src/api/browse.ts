// AQL-backed queries for the browse views. EHRbase's AQL has no GROUP BY,
// so counts are aggregated client-side (fine at local-dev scale).
import { useQuery } from '@tanstack/react-query'
import { getFlatComposition, getWebTemplate, listTemplates, runAql } from './ehrbase'

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
  const [templates, ehrs, compositions] = await Promise.all([
    listTemplates(),
    rows<[string]>('SELECT e/ehr_id/value FROM EHR e'),
    rows<[string, string]>(
      'SELECT e/ehr_id/value, c/archetype_details/template_id/value FROM EHR e CONTAINS COMPOSITION c',
    ),
  ])

  const counts = new Map<string, { compositions: number; ehrs: Set<string> }>()
  for (const [ehrId, templateId] of compositions) {
    const entry = counts.get(templateId) ?? { compositions: 0, ehrs: new Set<string>() }
    entry.compositions++
    entry.ehrs.add(ehrId)
    counts.set(templateId, entry)
  }

  return {
    patients: ehrs.length,
    compositions: compositions.length,
    templates: templates.map((t) => ({
      templateId: t.template_id,
      rootArchetype: t.archetype_id,
      uploaded: t.created_timestamp,
      compositions: counts.get(t.template_id)?.compositions ?? 0,
      patients: counts.get(t.template_id)?.ehrs.size ?? 0,
    })),
  }
}

// All EHRs, or only those with at least one composition of `templateId`.
async function listPatients(templateId?: string): Promise<PatientSummary[]> {
  const [ehrs, compositions] = await Promise.all([
    rows<EhrRow>(`SELECT ${EHR_COLUMNS} FROM EHR e`),
    templateId
      ? rows<[string, string]>(
          `SELECT e/ehr_id/value, c/context/start_time/value FROM EHR e CONTAINS COMPOSITION c
WHERE c/archetype_details/template_id/value = $template_id`,
          { template_id: templateId },
        )
      : rows<[string, string]>('SELECT e/ehr_id/value, c/context/start_time/value FROM EHR e CONTAINS COMPOSITION c'),
  ])

  const stats = new Map<string, { count: number; latest: string }>()
  for (const [ehrId, startTime] of compositions) {
    const s = stats.get(ehrId)
    stats.set(ehrId, {
      count: (s?.count ?? 0) + 1,
      latest: s && s.latest > startTime ? s.latest : startTime,
    })
  }

  return ehrs
    .filter(([ehrId]) => !templateId || stats.has(ehrId))
    .map(([ehrId, subjectId, namespace, created]) => ({
      ehrId,
      subjectId,
      namespace,
      created,
      compositions: stats.get(ehrId)?.count ?? 0,
      latest: stats.get(ehrId)?.latest ?? null,
    }))
    .sort((a, b) => (a.subjectId ?? a.ehrId).localeCompare(b.subjectId ?? b.ehrId))
}

async function getPatient(ehrId: string) {
  const params = { ehr_id: ehrId }
  const [ehrs, compositions] = await Promise.all([
    rows<EhrRow>(`SELECT ${EHR_COLUMNS} FROM EHR e[ehr_id/value=$ehr_id]`, params),
    rows<CompositionRow>(
      `SELECT ${COMPOSITION_COLUMNS} FROM EHR e[ehr_id/value=$ehr_id] CONTAINS COMPOSITION c
ORDER BY c/context/start_time/value DESC`,
      params,
    ),
  ])
  if (ehrs.length === 0) throw new Error(`EHR ${ehrId} not found`)
  const [, subjectId, namespace, created] = ehrs[0]
  return { ehrId, subjectId, namespace, created, compositions: compositions.map(toComposition) }
}

async function getComposition(ehrId: string, uid: string) {
  const [meta, flat] = await Promise.all([
    rows<CompositionRow>(
      `SELECT ${COMPOSITION_COLUMNS} FROM EHR e[ehr_id/value=$ehr_id] CONTAINS COMPOSITION c
WHERE c/uid/value = $uid`,
      { ehr_id: ehrId, uid },
    ),
    getFlatComposition(ehrId, uid),
  ])
  if (meta.length === 0) throw new Error(`Composition ${uid} not found`)
  return { ...toComposition(meta[0]), flat }
}

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: getOverview })

export const usePatients = (templateId?: string) =>
  useQuery({ queryKey: ['patients', templateId], queryFn: () => listPatients(templateId) })

export const usePatient = (ehrId: string) =>
  useQuery({ queryKey: ['patient', ehrId], queryFn: () => getPatient(ehrId) })

export const useComposition = (ehrId: string, uid: string) =>
  useQuery({ queryKey: ['composition', ehrId, uid], queryFn: () => getComposition(ehrId, uid) })

export const useWebTemplate = (templateId: string | undefined) =>
  useQuery({
    queryKey: ['webTemplate', templateId],
    queryFn: () => getWebTemplate(templateId!),
    enabled: !!templateId,
    staleTime: Infinity,
  })
