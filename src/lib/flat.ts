// Turns a FLAT composition into labelled sections → entries → fields, using the
// web template for labels and ordering. Template-agnostic: nothing here knows
// about IPS or any other specific template.
import type { FlatComposition, WebTemplateNode } from '../api/ehrbase'
import { formatScalar, formatUnit } from './format'
import { EVENT_TYPES, humanizeId, isHiddenId, nodeLabel } from './webTemplate'

type Scalar = string | number | boolean

export interface Field {
  key: string
  label: string
  value: string
}

export interface Entry {
  key: string
  label: string
  fields: Field[]
}

export interface Section {
  key: string
  label: string
  entries: Entry[]
}

interface Segment {
  id: string
  index: number
  order: number // position among the template node's siblings, for sorting
  node?: WebTemplateNode
}

// "a/b:1/c" → one segment per path step, resolved against the web template.
function parseSegments(base: string, root: WebTemplateNode): Segment[] {
  const segments: Segment[] = []
  let node: WebTemplateNode | undefined = root
  base.split('/').forEach((raw, depth) => {
    const [id, index] = raw.split(':')
    let order = 0
    if (depth > 0) {
      const children: WebTemplateNode[] = node?.children ?? []
      order = children.findIndex((c) => c.id === id)
      node = children[order]
      if (order < 0) order = Number.MAX_SAFE_INTEGER
    }
    segments.push({ id, index: index ? Number(index) : 0, order, node })
  })
  return segments
}

function compareSegments(a: Segment[], b: Segment[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = a[i].order - b[i].order || a[i].index - b[i].index
    if (diff !== 0) return diff
  }
  return a.length - b.length
}

const keyOf = (segments: Segment[]) => segments.map((s) => `${s.id}:${s.index}`).join('/')

function labelOf(segment: Segment) {
  return segment.node ? nodeLabel(segment.node) : humanizeId(segment.id)
}

// Events and choice-type value nodes ("quantity_value") repeat their parent's label.
function isTransparent(segment: Segment) {
  const node = segment.node
  return !!node && (EVENT_TYPES.has(node.rmType) || (!!node.inContext && segment.id.endsWith('_value')))
}

function fieldLabel(segments: Segment[]) {
  const parts: string[] = []
  let pendingIndex = ''
  for (const s of segments) {
    const index = s.index > 0 ? ` #${s.index + 1}` : ''
    if (isTransparent(s)) {
      pendingIndex += index
      continue
    }
    parts.push(labelOf(s) + index + pendingIndex)
    pendingIndex = ''
  }
  return parts.join(' › ')
}

// Combines the "|suffix" attributes of one data value into display text.
function formatValue(v: Record<string, Scalar>) {
  if ('magnitude' in v) return `${v.magnitude}${v.unit ? ` ${formatUnit(String(v.unit))}` : ''}`
  if ('numerator' in v) return v.denominator === 100 ? `${v.numerator} %` : `${v.numerator} / ${v.denominator}`
  if ('value' in v) return formatScalar(v.value)
  if ('' in v) return formatScalar(v[''])
  return Object.entries(v)
    .filter(([k]) => k !== 'code' && k !== 'terminology')
    .map(([k, x]) => `${k}: ${formatScalar(x)}`)
    .join(', ')
}

export function toSections(flat: FlatComposition, root: WebTemplateNode): Section[] {
  const values = new Map<string, Record<string, Scalar>>()
  for (const [key, value] of Object.entries(flat)) {
    const [base, suffix = ''] = key.split('|')
    values.set(base, { ...values.get(base), [suffix]: value })
  }

  const items = [...values]
    .map(([base, v]) => ({ segments: parseSegments(base, root), v }))
    .filter(({ segments }) => !segments.some((s) => isHiddenId(s.id)))
    .sort((a, b) => compareSegments(a.segments, b.segments))

  const sections = new Map<string, Section>()
  for (const { segments, v } of items) {
    // Sections may nest; the first non-section node below them is the entry.
    let e = 1
    while (e < segments.length - 1 && segments[e].node?.rmType === 'SECTION') e++
    const sectionSegments = segments.slice(1, e)
    const sectionKey = keyOf(segments.slice(0, e))
    const section = sections.get(sectionKey) ?? {
      key: sectionKey,
      label: sectionSegments.map(labelOf).join(' › ') || 'Document',
      entries: [],
    }
    sections.set(sectionKey, section)

    const entryKey = keyOf(segments.slice(0, e + 1))
    let entry = section.entries.find((x) => x.key === entryKey)
    if (!entry) {
      const index = segments[e].index > 0 ? ` #${segments[e].index + 1}` : ''
      entry = { key: entryKey, label: labelOf(segments[e]) + index, fields: [] }
      section.entries.push(entry)
    }

    const fieldSegments = segments.slice(e + 1)
    entry.fields.push({
      key: keyOf(segments),
      label: fieldLabel(fieldSegments) || entry.label,
      value: formatValue(v),
    })
  }
  return [...sections.values()]
}
