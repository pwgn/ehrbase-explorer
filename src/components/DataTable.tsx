import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { EmptyState } from './EmptyState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: 'right'
}

// Small static table for the browse views; rows are clickable when onRowClick is set.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'Nothing here.',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: string
}) {
  if (rows.length === 0) return <EmptyState title={empty} />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.header} className={cn(col.align === 'right' && 'text-right')}>
              {col.header}
            </TableHead>
          ))}
          {onRowClick && (
            <TableHead className="w-10">
              <span className="sr-only">Open</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={rowKey(row)}
            onClick={onRowClick && (() => onRowClick(row))}
            onKeyDown={onRowClick && ((e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(row))}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn(
              onRowClick && 'group cursor-pointer outline-none hover:bg-muted/60 focus-visible:bg-muted/60',
            )}
          >
            {columns.map((col) => (
              <TableCell key={col.header} className={cn(col.align === 'right' && 'text-right tabular-nums', col.className)}>
                {col.cell(row)}
              </TableCell>
            ))}
            {onRowClick && (
              <TableCell className="pr-4 text-muted-foreground group-hover:text-foreground">
                <ChevronRight className="size-4" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
