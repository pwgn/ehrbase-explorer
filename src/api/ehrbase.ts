// Minimal client for the openEHR REST API exposed by EHRbase.
const BASE = '/ehrbase/rest/openehr/v1'

export interface TemplateSummary {
  template_id: string
  concept: string
  archetype_id: string
  created_timestamp: string
}

export interface AqlColumn {
  name: string
  path: string
}

export interface AqlResultSet {
  q: string
  columns: AqlColumn[]
  rows: unknown[][]
}

// A failed request with its HTTP status: 204 when EHRbase has nothing to
// return (e.g. a deleted composition version).
export class RequestError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new RequestError(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`, res.status)
  }
  const body = await res.text()
  if (!body) throw new RequestError(`${res.status} ${res.statusText || 'No Content'}`, res.status)
  return JSON.parse(body) as T
}

export function listTemplates() {
  return request<TemplateSummary[]>('/definition/template/adl1.4')
}

export function runAql(q: string, queryParameters?: Record<string, unknown>) {
  return request<AqlResultSet>('/query/aql', {
    method: 'POST',
    body: JSON.stringify({ q, query_parameters: queryParameters }),
  })
}

// Web template (EHRbase's JSON description of an operational template).
export interface WebTemplateNode {
  id: string
  name: string
  localizedName?: string
  rmType: string
  min: number
  max: number
  aqlPath?: string
  inContext?: boolean
  children?: WebTemplateNode[]
}

export interface WebTemplate {
  templateId: string
  defaultLanguage: string
  tree: WebTemplateNode
}

export function getWebTemplate(templateId: string) {
  return request<WebTemplate>(`/definition/template/adl1.4/${encodeURIComponent(templateId)}`, {
    headers: { Accept: 'application/openehr.wt+json' },
  })
}

// FLAT format: path → value, e.g. ".../body_weight/any_event:0/weight|magnitude": 92.4
export type FlatComposition = Record<string, string | number | boolean>

// `uid` may be a versioned object id (→ latest version) or a version uid
// ("<id>::<system>::<n>", → that version).
export function getFlatComposition(ehrId: string, uid: string) {
  return request<FlatComposition>(
    `/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(uid)}?format=FLAT`,
  )
}

// The canonical JSON fields the explorer reads (the rest is ignored).
export interface CanonicalComposition {
  name: { value: string }
  uid: { value: string }
  archetype_details: { template_id: { value: string } }
  composer: { name?: string }
  context?: { start_time: { value: string } }
}

export function getCanonicalComposition(ehrId: string, uid: string) {
  return request<CanonicalComposition>(`/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(uid)}`)
}

export interface RevisionHistoryItem {
  version_id: { value: string }
  audits: {
    time_committed: { value: string }
    change_type: { value: string }
    committer?: { name?: string }
  }[]
}

export async function getRevisionHistory(ehrId: string, versionedObjectId: string) {
  const history = await request<RevisionHistoryItem[] | { items: RevisionHistoryItem[] }>(
    `/ehr/${encodeURIComponent(ehrId)}/versioned_composition/${encodeURIComponent(versionedObjectId)}/revision_history`,
  )
  // The spec's REVISION_HISTORY wraps the items; EHRbase returns the bare array.
  return Array.isArray(history) ? history : history.items
}
