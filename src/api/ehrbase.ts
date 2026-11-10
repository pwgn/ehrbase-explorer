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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`)
  }
  return res.json() as Promise<T>
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

export function getFlatComposition(ehrId: string, uid: string) {
  return request<FlatComposition>(
    `/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(uid)}?format=FLAT`,
  )
}
