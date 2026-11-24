import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Columns3, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useWebTemplate } from '../api/browse'
import { runAql } from '../api/ehrbase'
import { AqlCode } from '../components/AqlCode'
import { CopyButton } from '../components/CopyButton'
import { EmptyState } from '../components/EmptyState'
import { FieldTree } from '../components/FieldTree'
import { ErrorAlert, QueryStatus } from '../components/QueryStatus'
import { ResultTable } from '../components/ResultTable'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { SearchInput } from '../components/ui/input'
import { buildAql, buildFieldTree, type FieldNode, fieldTitle, filterFieldTree } from '../lib/fieldTree'
import { cn } from '../lib/utils'
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
  const repeating = selected.filter((f) => f.repeats)

  if (!visibleTree) return <QueryStatus isPending={webTemplate.isPending} error={webTemplate.error} />

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="flex flex-col lg:sticky lg:top-0 lg:max-h-[calc(100vh-8.5rem)]">
        <div className="border-b p-3">
          <SearchInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search fields…"
            aria-label="Search fields"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <FieldTree nodes={visibleTree} selected={selectedKeys} onToggle={toggle} expandAll={filter.trim() !== ''} />
        </div>
      </Card>

      <div className="min-w-0 space-y-5">
        {selected.length === 0 ? (
          <Card>
            <EmptyState
              icon={Columns3}
              title="No fields selected"
              description={`Tick fields on the left to build a table with one row per ${templateId} composition.`}
            />
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[13px] font-medium text-muted-foreground">Columns</span>
              {selected.map((field) => (
                <span
                  key={field.key}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-primary-soft-border bg-primary-soft pr-1 pl-2.5 text-[13px] font-medium text-primary-soft-foreground"
                >
                  {fieldTitle(field)}
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-primary-soft-border"
                    aria-label={`Remove ${field.label}`}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear all
              </Button>
            </div>

            {repeating.length > 0 && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertTitle>Some fields repeat</AlertTitle>
                <AlertDescription>
                  {repeating.map(fieldTitle).join(', ')} can occur more than once per composition, so a composition may
                  span several rows.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader className="py-2.5 pr-3 pl-5">
                <CardTitle className="text-sm">Generated AQL</CardTitle>
                <div className="flex gap-1.5">
                  <CopyButton value={query!}>Copy</CopyButton>
                  <Button variant="outline" size="sm" onClick={() => openInAql(query!)}>
                    Open in AQL editor
                    <ArrowUpRight />
                  </Button>
                </div>
              </CardHeader>
              <div className="bg-background">
                <AqlCode value={query!} />
              </div>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">Results</CardTitle>
                  {result.data && <Badge>{result.data.rows.length} rows</Badge>}
                </div>
              </CardHeader>
              {result.error && (
                <div className="p-4">
                  <ErrorAlert error={result.error} title="Query failed" />
                </div>
              )}
              {result.data ? (
                <div className={cn('transition-opacity', result.isFetching && 'opacity-60')}>
                  <ResultTable result={result.data} />
                </div>
              ) : (
                !result.error && (
                  <div className="p-5">
                    <QueryStatus isPending={result.isPending} error={null} />
                  </div>
                )
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
