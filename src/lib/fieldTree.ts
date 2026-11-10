// Selectable-field tree for the field explorer, plus AQL generation from the
// web template's aqlPaths. Queries start at the COMPOSITION, so a field that is
// absent in a composition comes back as null instead of dropping the row.
import type { WebTemplateNode } from '../api/ehrbase'
import { isHiddenId, nodeLabel } from './webTemplate'

export interface FieldNode {
  key: string // web template id path below the root, e.g. "vital_signs/body_weight/any_event/weight"
  label: string
  rmType: string
  aqlPath?: string
  entryLabel: string // nearest non-section ancestor, for context ("Body weight")
  selectable: boolean
  repeatable: boolean // this node itself can occur more than once
  repeats: boolean // this node or an ancestor can, so it may yield several rows
  children: FieldNode[]
}

const SKIPPED_TYPES = new Set(['PARTY_PROXY', 'LOCATABLE_REF', 'ISM_TRANSITION', 'STRING', 'CODE_PHRASE'])

export function buildFieldTree(root: WebTemplateNode): FieldNode[] {
  const build = (
    node: WebTemplateNode,
    parent: WebTemplateNode,
    parentKey: string,
    parentRepeats: boolean,
    entryLabel: string | undefined,
  ): FieldNode | null => {
    if (isHiddenId(node.id) || SKIPPED_TYPES.has(node.rmType)) return null

    const key = parentKey ? `${parentKey}/${node.id}` : node.id
    const isValue = node.rmType.startsWith('DV_')
    // Choice elements list one child per allowed data type: "Analyte result (quantity)".
    const label =
      parent.rmType === 'ELEMENT' && isValue
        ? `${nodeLabel(parent)} (${node.rmType.replace(/^DV_/, '').toLowerCase()})`
        : nodeLabel(node)
    const entry = entryLabel ?? (node.rmType === 'SECTION' ? undefined : label)
    const repeatable = node.max === -1 || node.max > 1
    const repeats = parentRepeats || repeatable

    const children = (node.children ?? [])
      .map((child) => build(child, node, key, repeats, entry))
      .filter((child): child is FieldNode => child !== null)
    const selectable = isValue && !!node.aqlPath
    if (!selectable && children.length === 0) return null

    return { key, label, rmType: node.rmType, aqlPath: node.aqlPath, entryLabel: entry ?? label, selectable, repeatable, repeats, children }
  }

  return (root.children ?? [])
    .map((child) => build(child, root, '', false, undefined))
    .filter((child): child is FieldNode => child !== null)
}

// Keeps nodes whose label matches, plus the ancestors leading to them.
export function filterFieldTree(nodes: FieldNode[], query: string): FieldNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes
  return nodes.flatMap((node) => {
    if (node.label.toLowerCase().includes(q)) return [node]
    const children = filterFieldTree(node.children, q)
    return children.length > 0 ? [{ ...node, children }] : []
  })
}

// Sub-paths that pull plain values out of each data type; one column each.
const VALUE_PATHS: Record<string, [suffix: string, path: string][]> = {
  DV_QUANTITY: [['', '/magnitude'], ['unit', '/units']],
  DV_COUNT: [['', '/magnitude']],
  DV_PROPORTION: [['', '/numerator'], ['denominator', '/denominator']],
  DV_ORDINAL: [['', '/value'], ['symbol', '/symbol/value']],
  DV_STATE: [['', '/value/value']],
  DV_IDENTIFIER: [['', '/id']],
  DV_MULTIMEDIA: [['', '/uri/value']],
}

function valuePaths(rmType: string): [string, string][] {
  if (VALUE_PATHS[rmType]) return VALUE_PATHS[rmType]
  // Intervals have no single plain value; return the whole object.
  return rmType.startsWith('DV_INTERVAL') ? [['', '']] : [['', '/value']]
}

function toIdentifier(text: string) {
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^[a-z_]/.test(id) ? id : `_${id}`
}

export function fieldTitle(field: FieldNode) {
  return field.label.startsWith(field.entryLabel) ? field.label : `${field.entryLabel} › ${field.label}`
}

// Quoted AQL string literal.
export function aqlString(text: string) {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function buildAql(templateId: string, fields: FieldNode[]) {
  const used = new Set(['subject_id', 'start_time'])
  const unique = (base: string) => {
    let alias = base
    for (let n = 2; used.has(alias); n++) alias = `${base}_${n}`
    used.add(alias)
    return alias
  }

  const columns = ['e/ehr_status/subject/external_ref/id/value AS subject_id', 'c/context/start_time/value AS start_time']
  for (const field of fields) {
    const base = toIdentifier(fieldTitle(field))
    for (const [suffix, path] of valuePaths(field.rmType)) {
      columns.push(`c${field.aqlPath}${path} AS ${unique(suffix ? `${base}_${suffix}` : base)}`)
    }
  }

  return `SELECT
  ${columns.join(',\n  ')}
FROM EHR e CONTAINS COMPOSITION c
WHERE c/archetype_details/template_id/value = ${aqlString(templateId)}
ORDER BY c/context/start_time/value DESC`
}
