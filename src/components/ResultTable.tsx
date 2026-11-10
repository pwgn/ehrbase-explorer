import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { AqlResultSet } from '../api/ehrbase'

type Row = unknown[]
const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, Row>()

function formatCell(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ResultTable({ result }: { result: AqlResultSet }) {
  // AQL result columns are only known at runtime, so build them per result.
  const columns = useMemo(
    () =>
      columnHelper.columns(
        result.columns.map((col, i) =>
          columnHelper.accessor((row) => row[i], {
            id: `${i}`,
            header: () => <span title={col.path}>{col.name.startsWith('#') ? col.path : col.name}</span>,
            cell: (info) => formatCell(info.getValue()),
          }),
        ),
      ),
    [result.columns],
  )

  const table = useTable({ features, columns, data: result.rows })

  if (result.rows.length === 0) {
    return <p className="text-sm text-gray-500">No rows.</p>
  }

  return (
    <div className="overflow-auto rounded border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-medium whitespace-nowrap">
                  <table.FlexRender header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-100 align-top">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-3 py-1.5 font-mono text-xs break-all">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
