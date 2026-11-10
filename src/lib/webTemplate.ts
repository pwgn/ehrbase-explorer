// Shared helpers for reading EHRbase web templates.
import type { WebTemplateNode } from '../api/ehrbase'

// Reference-model bookkeeping that adds noise without clinical content.
const HIDDEN_IDS = new Set([
  'language',
  'encoding',
  'subject',
  'composer',
  'category',
  'territory',
  'ism_transition',
  'action_archetype_id',
])

export const EVENT_TYPES = new Set(['EVENT', 'POINT_EVENT', 'INTERVAL_EVENT'])

// Ids starting with "_" are optional RM attributes (_uid, _work_flow_id, ...).
export const isHiddenId = (id: string) => id.startsWith('_') || HIDDEN_IDS.has(id)

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const humanizeId = (id: string) => capitalize(id.replace(/_/g, ' '))

// RM attributes like "context" have lower-case names, so capitalize those too.
export function nodeLabel(node: WebTemplateNode) {
  return node.localizedName ? capitalize(node.localizedName) : humanizeId(node.id)
}
