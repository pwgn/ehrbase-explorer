import { ListTree } from 'lucide-react'
import { useRef } from 'react'
import { PAGE_SIZE, type PatientSummary, usePatients } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { Pagination, PastLastPage } from '../components/Pagination'
import { QueryStatus } from '../components/QueryStatus'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { formatDateTime } from '../lib/format'
import { pageCountOf, scrollToListTop } from '../lib/pagination'
import { cn } from '../lib/utils'
import type { Navigate } from './location'

export function PatientListView({
  templateId,
  page,
  navigate,
}: {
  templateId?: string
  page: number
  navigate: Navigate
}) {
  const { data, isPending, error, isPlaceholderData } = usePatients(templateId, page)
  const listRef = useRef<HTMLDivElement>(null)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  const pageCount = pageCountOf(data.total, PAGE_SIZE)
  const goToPage = (p: number) => {
    navigate({ view: 'patients', templateId, page: p })
    scrollToListTop(listRef.current)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {templateId ? 'Patients' : 'All patients'}
            <Badge>{data.total.toLocaleString()}</Badge>
          </span>
        }
        description={
          templateId ? (
            <>
              Patients with at least one <span className="font-medium text-foreground">{templateId}</span> composition.
            </>
          ) : (
            'Every EHR in this EHRbase.'
          )
        }
        actions={
          templateId && (
            <Button variant="outline" onClick={() => navigate({ view: 'fields', templateId, fields: [] })}>
              <ListTree />
              Explore fields
            </Button>
          )
        }
      />
      <Card ref={listRef} className="scroll-mt-4">
        {page > pageCount ? (
          <PastLastPage page={page} onLastPage={() => goToPage(pageCount)} />
        ) : (
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            <DataTable<PatientSummary>
              rows={data.patients}
              rowKey={(p) => p.ehrId}
              onRowClick={(p) => navigate({ view: 'patient', ehrId: p.ehrId, templateId })}
              empty="No patients."
              columns={[
                { header: 'Subject ID', cell: (p) => p.subjectId ?? '—', className: 'font-medium' },
                { header: 'Namespace', cell: (p) => p.namespace ?? '—', className: 'text-muted-foreground' },
                {
                  header: templateId ? 'Matching compositions' : 'Compositions',
                  cell: (p) => p.compositions.toLocaleString(),
                  align: 'right',
                },
                {
                  header: 'Latest',
                  cell: (p) => (p.latest ? formatDateTime(p.latest) : '—'),
                  className: 'whitespace-nowrap',
                },
                { header: 'EHR ID', cell: (p) => p.ehrId, className: 'font-mono text-xs text-muted-foreground' },
              ]}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={goToPage}
              loading={isPlaceholderData}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
