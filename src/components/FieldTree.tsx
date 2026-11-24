import { ChevronRight, Repeat } from 'lucide-react'
import { useState } from 'react'
import type { FieldNode } from '../lib/fieldTree'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'

interface TreeProps {
  nodes: FieldNode[]
  selected: Set<string>
  onToggle: (node: FieldNode) => void
  expandAll: boolean
}

function RepeatsBadge() {
  return (
    <Badge variant="warning" title="Can occur more than once per composition">
      <Repeat />
      repeats
    </Badge>
  )
}

function TreeNode({ node, depth, ...props }: TreeProps & { node: FieldNode; depth: number }) {
  const [open, setOpen] = useState(false)
  const expanded = open || props.expandAll
  const hasChildren = node.children.length > 0
  const id = `field-${node.key}`

  return (
    <li>
      <div
        className="flex min-h-8 items-center gap-1.5 rounded-md pr-2 hover:bg-muted/70"
        style={{ paddingLeft: depth * 18 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {node.selectable ? (
          <>
            <Checkbox id={id} checked={props.selected.has(node.key)} onCheckedChange={() => props.onToggle(node)} />
            <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer truncate pl-1">
              {node.label}
            </label>
            <Badge variant="secondary">{node.rmType.replace(/^DV_/, '').toLowerCase()}</Badge>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            className={cn('min-w-0 flex-1 cursor-pointer truncate text-left font-medium', depth === 0 && 'font-semibold')}
          >
            {node.label}
          </button>
        )}

        {node.repeatable && <RepeatsBadge />}
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
  if (props.nodes.length === 0) return <p className="p-2 text-sm text-muted-foreground">No matching fields.</p>
  return (
    <ul className="text-sm">
      {props.nodes.map((node) => (
        <TreeNode key={node.key} node={node} depth={0} {...props} />
      ))}
    </ul>
  )
}
