import { useState } from 'react'
import type { FieldNode } from '../lib/fieldTree'

interface TreeProps {
  nodes: FieldNode[]
  selected: Set<string>
  onToggle: (node: FieldNode) => void
  expandAll: boolean
}

function TreeNode({ node, depth, ...props }: TreeProps & { node: FieldNode; depth: number }) {
  const [open, setOpen] = useState(false)
  const expanded = open || props.expandAll
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div className="flex items-center gap-1 rounded py-0.5 pr-1 hover:bg-gray-50" style={{ paddingLeft: depth * 14 }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            className="w-4 shrink-0 text-gray-400"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {node.selectable ? (
          <label className="flex min-w-0 cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={props.selected.has(node.key)} onChange={() => props.onToggle(node)} />
            <span className="truncate">{node.label}</span>
            <span className="shrink-0 text-xs text-gray-400">{node.rmType.replace(/^DV_/, '').toLowerCase()}</span>
          </label>
        ) : (
          <button type="button" onClick={() => setOpen(!expanded)} className="truncate text-left">
            {node.label}
          </button>
        )}

        {node.repeatable && (
          <span className="shrink-0 text-xs text-amber-600" title="Can occur more than once per composition">
            ↻
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.key} node={child} depth={depth + 1} {...props} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FieldTree(props: TreeProps) {
  if (props.nodes.length === 0) return <p className="p-1 text-sm text-gray-500">No matching fields.</p>
  return (
    <ul className="text-sm">
      {props.nodes.map((node) => (
        <TreeNode key={node.key} node={node} depth={0} {...props} />
      ))}
    </ul>
  )
}
