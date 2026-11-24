import { ListTree, SquareTerminal, Users } from 'lucide-react'
import { useState } from 'react'
import { type TemplateStats, useOverview } from '../api/browse'
import { type Column, DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { templateColumns } from '../components/templateColumns'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { SearchInput } from '../components/ui/input'
import { compositionsQuery } from '../lib/aql'
import type { Navigate } from './location'

export function TemplatesView({ navigate, openInAql }: { navigate: Navigate; openInAql: (query: string) => void }) {
  const { data, isPending, error } = useOverview()
  const [filter, setFilter] = useState('')
  if (!data) return <QueryStatus isPending={isPending} error={error} />

  const needle = filter.trim().toLowerCase()
  const rows = data.templates.filter(
    (t) => t.templateId.toLowerCase().includes(needle) || t.rootArchetype.toLowerCase().includes(needle),
  )

  const actions: Column<TemplateStats> = {
    header: 'Actions',
    className: 'w-px whitespace-nowrap',
    // Buttons stop propagation so they don't also trigger the row click.
    cell: (t) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ view: 'patients', templateId: t.templateId })}>
          <Users />
          Patients
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate({ view: 'fields', templateId: t.templateId, fields: [] })}>
          <ListTree />
          Fields
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openInAql(compositionsQuery(t.templateId))}>
          <SquareTerminal />
          AQL
        </Button>
      </div>
    ),
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Templates"
        description="Operational templates uploaded to this EHRbase, with how many compositions and patients use each."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>All templates</CardTitle>
            <Badge>{data.templates.length}</Badge>
          </div>
          <SearchInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by template or archetype…"
            aria-label="Filter templates"
            className="w-full sm:w-72"
          />
        </CardHeader>
        <DataTable<TemplateStats>
          rows={rows}
          rowKey={(t) => t.templateId}
          onRowClick={(t) => navigate({ view: 'patients', templateId: t.templateId })}
          empty={data.templates.length === 0 ? 'No templates uploaded.' : 'No matching templates.'}
          columns={[...templateColumns, actions]}
        />
      </Card>
    </div>
  )
}
