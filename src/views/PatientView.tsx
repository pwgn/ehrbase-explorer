import { type CompositionSummary, usePatient } from '../api/browse'
import { CopyButton } from '../components/CopyButton'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { formatDateTime } from '../lib/format'
import type { Navigate } from './location'

export function PatientView({ ehrId, templateId, navigate }: { ehrId: string; templateId?: string; navigate: Navigate }) {
  const { data, isPending, error } = usePatient(ehrId)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Compositions</CardTitle>
            <Badge>{data.compositions.length}</Badge>
          </div>
        </CardHeader>
        <DataTable<CompositionSummary>
          rows={data.compositions}
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
      </Card>
    </div>
  )
}
