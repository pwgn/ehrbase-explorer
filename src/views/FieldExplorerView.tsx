import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useWebTemplate } from '../api/browse'
import { runAql } from '../api/ehrbase'
import { FieldTree } from '../components/FieldTree'
import { QueryStatus } from '../components/QueryStatus'
import { ResultTable } from '../components/ResultTable'
import { buildAql, buildFieldTree, type FieldNode, fieldTitle, filterFieldTree } from '../lib/fieldTree'
import type { Navigate } from './location'

// The selection lives in the URL (fieldKeys), so it survives reloads and can be shared.
export function FieldExplorerView({
  templateId,
  fieldKeys,
  navigate,
  openInAql,
}: {
  templateId: string
  fieldKeys: string[]
  navigate: Navigate
  openInAql: (query: string) => void
}) {
  const webTemplate = useWebTemplate(templateId)
  const tree = useMemo(() => webTemplate.data && buildFieldTree(webTemplate.data.tree), [webTemplate.data])
  const [filter, setFilter] = useState('')
  const selected = useMemo(() => {
    const byKey = new Map<string, FieldNode>()
    const index = (nodes: FieldNode[]) => nodes.forEach((n) => (byKey.set(n.key, n), index(n.children)))
    index(tree ?? [])
    // Unknown keys (e.g. from an older link) are ignored.
    return fieldKeys.map((k) => byKey.get(k)).filter((f): f is FieldNode => !!f?.selectable)
  }, [tree, fieldKeys])
  const setSelected = (fields: FieldNode[]) =>
    navigate({ view: 'fields', templateId, fields: fields.map((f) => f.key) }, { replace: true })

  const query = selected.length > 0 ? buildAql(templateId, selected) : null
  const result = useQuery({
    queryKey: ['aql', query],
    queryFn: () => runAql(query!),
    enabled: !!query,
    placeholderData: keepPreviousData,
  })

  const visibleTree = useMemo(() => tree && filterFieldTree(tree, filter), [tree, filter])
  const selectedKeys = useMemo(() => new Set(selected.map((f) => f.key)), [selected])
  const toggle = (field: FieldNode) =>
    setSelected(selectedKeys.has(field.key) ? selected.filter((f) => f.key !== field.key) : [...selected, field])

  if (!visibleTree) return <QueryStatus isPending={webTemplate.isPending} error={webTemplate.error} />

  return (
    <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2 rounded border border-gray-200 p-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)]">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search fields…"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <FieldTree nodes={visibleTree} selected={selectedKeys} onToggle={toggle} expandAll={filter.trim() !== ''} />
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        {selected.length === 0 ? (
          <p className="text-sm text-gray-500">
            Tick fields on the left to build a table with one row per {templateId} composition.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {selected.map((field) => (
                <li key={field.key} className="flex items-center gap-1 rounded bg-blue-50 py-0.5 pr-1 pl-2 text-sm text-blue-900">
                  {fieldTitle(field)}
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="px-1 text-blue-400 hover:text-blue-700"
                    aria-label={`Remove ${field.label}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setSelected([])} className="px-2 py-0.5 text-sm text-gray-500 hover:underline">
                  Clear
                </button>
              </li>
            </ul>

            {selected.some((f) => f.repeats) && (
              <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">
                Some selected fields can occur more than once per composition (↻), so a composition may span
                several rows.
              </p>
            )}

            <section>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Generated AQL</h3>
                <button
                  type="button"
                  onClick={() => openInAql(query!)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Open in AQL tab
                </button>
              </div>
              <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">{query}</pre>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Results {result.data && <span className="font-normal">{result.data.rows.length} rows</span>}
              </h3>
              {result.data ? (
                <div className={result.isFetching ? 'opacity-60' : ''}>
                  <ResultTable result={result.data} />
                </div>
              ) : (
                <QueryStatus isPending={result.isPending} error={result.error} />
              )}
              {result.data && result.error && <QueryStatus isPending={false} error={result.error} />}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
