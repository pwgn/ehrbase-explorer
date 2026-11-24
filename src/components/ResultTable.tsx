import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { AqlResultSet } from '../api/ehrbase'
import { cn } from '../lib/utils'
import { EmptyState } from './EmptyState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

type Row = unknown[]
const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, Row>()

function formatCell(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// UUIDs, version uids and object/JSON values read better in monospace.
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-|::/i
const isCode = (value: unknown) =>
  (value !== null && typeof value === 'object') || (typeof value === 'string' && ID_PATTERN.test(value))

export function ResultTable({ result }: { result: AqlResultSet }) {
  // AQL result columns are only known at runtime, so build them per result.
  const columns = useMemo(
    () =>
      columnHelper.columns(
        result.columns.map((col, i) => {
          const values = result.rows.map((row) => row[i]).filter((v) => v !== null && v !== undefined)
          const numeric = values.length > 0 && values.every((v) => typeof v === 'number')
          return columnHelper.accessor((row) => row[i], {
            id: `${i}`,
            header: () => <span title={col.path}>{col.name.startsWith('#') ? col.path : col.name}</span>,
            cell: (info) => formatCell(info.getValue()),
            meta: { numeric },
          })
        }),
      ),
    [result.columns, result.rows],
  )

  const table = useTable({ features, columns, data: result.rows })

  if (result.rows.length === 0) return <EmptyState title="No rows" description="The query ran but returned nothing." />

  const numeric = (meta: unknown) => (meta as { numeric?: boolean } | undefined)?.numeric

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn('font-mono text-xs', numeric(header.column.columnDef.meta) && 'text-right')}
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} className="hover:bg-muted/60">
            {row.getAllCells().map((cell) => {
              const value = cell.getValue()
              return (
                <TableCell
                  key={cell.id}
                  className={cn(
                    'align-top',
                    numeric(cell.column.columnDef.meta) && 'text-right tabular-nums',
                    isCode(value) && 'font-mono text-xs break-all text-muted-foreground',
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
