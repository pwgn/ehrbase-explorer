import { type CompositionSummary, usePatient } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { QueryStatus } from '../components/QueryStatus'
import { formatDateTime } from '../lib/format'
import type { Navigate } from './location'

export function PatientView({ ehrId, templateId, navigate }: { ehrId: string; templateId?: string; navigate: Navigate }) {
  const { data, isPending, error } = usePatient(ehrId)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{data.subjectId ?? 'Unknown subject'}</h2>
        <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-4 text-sm">
          <dt className="text-gray-500">Namespace</dt>
          <dd>{data.namespace ?? '—'}</dd>
          <dt className="text-gray-500">EHR ID</dt>
          <dd className="font-mono text-xs leading-5">{data.ehrId}</dd>
          <dt className="text-gray-500">Created</dt>
          <dd>{formatDateTime(data.created)}</dd>
        </dl>
      </header>

      <section>
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Compositions <span className="font-normal">{data.compositions.length}</span>
        </h3>
        <DataTable<CompositionSummary>
          rows={data.compositions}
          rowKey={(c) => c.uid}
          onRowClick={(c) => navigate({ view: 'composition', ehrId, uid: c.uid, templateId })}
          empty="No compositions in this EHR."
          columns={[
            { header: 'Name', cell: (c) => c.name, className: 'font-medium' },
            { header: 'Template', cell: (c) => c.templateId },
            { header: 'Start time', cell: (c) => formatDateTime(c.startTime), className: 'whitespace-nowrap' },
            { header: 'Composer', cell: (c) => c.composer ?? '—' },
          ]}
        />
      </section>
    </div>
  )
}
