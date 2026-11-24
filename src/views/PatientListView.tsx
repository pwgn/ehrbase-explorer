import { ListTree } from 'lucide-react'
import { type PatientSummary, usePatients } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { formatDateTime } from '../lib/format'
import type { Navigate } from './location'

export function PatientListView({ templateId, navigate }: { templateId?: string; navigate: Navigate }) {
  const { data, isPending, error } = usePatients(templateId)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  return (
    <div className="space-y-7">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {templateId ? 'Patients' : 'All patients'}
            <Badge>{data.length}</Badge>
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
      <Card>
        <DataTable<PatientSummary>
          rows={data}
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
      </Card>
    </div>
  )
}
