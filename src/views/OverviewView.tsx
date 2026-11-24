import { ArrowRight, FileText, Layers, type LucideIcon, Users } from 'lucide-react'
import { type TemplateStats, useOverview } from '../api/browse'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { templateColumns } from '../components/templateColumns'
import { Button } from '../components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import type { Navigate } from './location'

const RECENT_TEMPLATES = 5

function Stat({
  label,
  value,
  icon: Icon,
  link,
}: {
  label: string
  value: number
  icon: LucideIcon
  link?: { label: string; onClick: () => void }
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</div>
      {link && (
        <button
          type="button"
          onClick={link.onClick}
          className="inline-flex w-fit cursor-pointer items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          {link.label}
          <ArrowRight className="size-3.5" />
        </button>
      )}
    </Card>
  )
}

export function OverviewView({ navigate }: { navigate: Navigate }) {
  const { data, isPending, error } = useOverview()
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  const recent = [...data.templates].sort((a, b) => b.uploaded.localeCompare(a.uploaded)).slice(0, RECENT_TEMPLATES)

  return (
    <div className="space-y-7">
      <PageHeader title="Overview" description="Patients, compositions and templates stored in this EHRbase." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Patients (EHRs)"
          value={data.patients}
          icon={Users}
          link={{ label: 'View all patients', onClick: () => navigate({ view: 'patients' }) }}
        />
        <Stat label="Compositions" value={data.compositions} icon={FileText} />
        <Stat
          label="Templates"
          value={data.templates.length}
          icon={Layers}
          link={{ label: 'View all templates', onClick: () => navigate({ view: 'templates' }) }}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recently uploaded templates</CardTitle>
            <CardDescription>Select a template to see the patients that have one.</CardDescription>
          </div>
          {data.templates.length > RECENT_TEMPLATES && (
            <Button variant="outline" size="sm" onClick={() => navigate({ view: 'templates' })}>
              All {data.templates.length} templates
              <ArrowRight />
            </Button>
          )}
        </CardHeader>
        <DataTable<TemplateStats>
          rows={recent}
          rowKey={(t) => t.templateId}
          onRowClick={(t) => navigate({ view: 'patients', templateId: t.templateId })}
          empty="No templates uploaded."
          columns={templateColumns}
        />
      </Card>
    </div>
  )
}
