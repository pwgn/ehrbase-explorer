import { useRef } from 'react'
import { PAGE_SIZE, type CompositionSummary, usePatient, usePatientCompositions } from '../api/browse'
import { CopyButton } from '../components/CopyButton'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { Pagination, PastLastPage } from '../components/Pagination'
import { QueryStatus } from '../components/QueryStatus'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { formatDateTime } from '../lib/format'
import { pageCountOf, scrollToListTop } from '../lib/pagination'
import { cn } from '../lib/utils'
import type { Navigate } from './location'

export function PatientView({
  ehrId,
  templateId,
  page,
  navigate,
}: {
  ehrId: string
  templateId?: string
  page: number
  navigate: Navigate
}) {
  const { data, isPending, error } = usePatient(ehrId)
  const compositions = usePatientCompositions(ehrId, page)
  const listRef = useRef<HTMLDivElement>(null)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  const pageCount = pageCountOf(data.compositionCount, PAGE_SIZE)
  const goToPage = (p: number) => {
    navigate({ view: 'patient', ehrId, templateId, page: p })
    scrollToListTop(listRef.current)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={data.subjectId ?? 'Unknown subject'}
        description={
          <dl className="mt-2 grid grid-cols-[max-content_1fr] items-center gap-x-6 gap-y-1">
            <dt>Namespace</dt>
            <dd className="text-foreground">{data.namespace ?? '—'}</dd>
            <dt>EHR ID</dt>
            <dd className="flex items-center gap-1 font-mono text-xs text-foreground">
              {data.ehrId}
              <CopyButton value={data.ehrId} label="Copy EHR ID" />
            </dd>
            <dt>Created</dt>
            <dd className="text-foreground">{formatDateTime(data.created)}</dd>
          </dl>
        }
      />

      <Card ref={listRef} className="scroll-mt-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Compositions</CardTitle>
            <Badge>{data.compositionCount.toLocaleString()}</Badge>
          </div>
        </CardHeader>
        {page > pageCount ? (
          <PastLastPage page={page} onLastPage={() => goToPage(pageCount)} />
        ) : compositions.data ? (
          <div className={cn('transition-opacity', compositions.isPlaceholderData && 'opacity-60')}>
            <DataTable<CompositionSummary>
              rows={compositions.data}
              rowKey={(c) => c.uid}
              onRowClick={(c) => navigate({ view: 'composition', ehrId, uid: c.uid, templateId })}
              empty="No compositions in this EHR."
              columns={[
                { header: 'Name', cell: (c) => c.name, className: 'font-medium' },
                { header: 'Template', cell: (c) => <Badge variant="outline">{c.templateId}</Badge> },
                { header: 'Start time', cell: (c) => formatDateTime(c.startTime), className: 'whitespace-nowrap' },
                { header: 'Composer', cell: (c) => c.composer ?? '—', className: 'text-muted-foreground' },
              ]}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.compositionCount}
              onPageChange={goToPage}
              loading={compositions.isPlaceholderData}
            />
          </div>
        ) : (
          <div className="px-6 pb-6">
            <QueryStatus isPending={compositions.isPending} error={compositions.error} />
          </div>
        )}
      </Card>
    </div>
  )
}
