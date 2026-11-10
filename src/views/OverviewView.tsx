import { type TemplateStats, useOverview } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { QueryStatus } from '../components/QueryStatus'
import { formatDateTime } from '../lib/format'
import type { Navigate } from './location'

function Stat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded border border-gray-200 px-4 py-3 text-left enabled:hover:border-blue-400 enabled:hover:bg-blue-50"
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </button>
  )
}

export function OverviewView({ navigate }: { navigate: Navigate }) {
  const { data, isPending, error } = useOverview()
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Stat label="Patients (EHRs)" value={data.patients} onClick={() => navigate({ view: 'patients' })} />
        <Stat label="Compositions" value={data.compositions} />
        <Stat label="Templates" value={data.templates.length} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Templates</h2>
        <DataTable<TemplateStats>
          rows={data.templates}
          rowKey={(t) => t.templateId}
          onRowClick={(t) => navigate({ view: 'patients', templateId: t.templateId })}
          empty="No templates uploaded."
          columns={[
            { header: 'Template', cell: (t) => t.templateId, className: 'font-medium' },
            { header: 'Root archetype', cell: (t) => t.rootArchetype, className: 'font-mono text-xs text-gray-600' },
            { header: 'Compositions', cell: (t) => t.compositions, className: 'text-right' },
            { header: 'Patients', cell: (t) => t.patients, className: 'text-right' },
            { header: 'Uploaded', cell: (t) => formatDateTime(t.uploaded), className: 'whitespace-nowrap' },
          ]}
        />
      </section>
    </div>
  )
}
