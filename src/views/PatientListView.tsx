import { type PatientSummary, usePatients } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { QueryStatus } from '../components/QueryStatus'
import { formatDateTime } from '../lib/format'
import type { Navigate } from './location'

export function PatientListView({ templateId, navigate }: { templateId?: string; navigate: Navigate }) {
  const { data, isPending, error } = usePatients(templateId)
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {templateId ? `Patients with a ${templateId}` : 'All patients'}
          <span className="ml-2 text-sm font-normal text-gray-500">{data.length}</span>
        </h2>
        {templateId && (
          <button
            type="button"
            onClick={() => navigate({ view: 'fields', templateId, fields: [] })}
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Explore fields →
          </button>
        )}
      </div>
      <DataTable<PatientSummary>
        rows={data}
        rowKey={(p) => p.ehrId}
        onRowClick={(p) => navigate({ view: 'patient', ehrId: p.ehrId, templateId })}
        empty="No patients."
        columns={[
          { header: 'Subject ID', cell: (p) => p.subjectId ?? '—', className: 'font-medium' },
          { header: 'Namespace', cell: (p) => p.namespace ?? '—', className: 'text-gray-600' },
          { header: templateId ? 'Matching compositions' : 'Compositions', cell: (p) => p.compositions, className: 'text-right' },
          { header: 'Latest', cell: (p) => (p.latest ? formatDateTime(p.latest) : '—'), className: 'whitespace-nowrap' },
          { header: 'EHR ID', cell: (p) => p.ehrId, className: 'font-mono text-xs text-gray-500' },
        ]}
      />
    </section>
  )
}
