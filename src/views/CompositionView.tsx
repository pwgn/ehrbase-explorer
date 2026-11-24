import { CalendarDays, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useComposition, useWebTemplate } from '../api/browse'
import { CopyButton } from '../components/CopyButton'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { toSections } from '../lib/flat'
import { formatDateTime } from '../lib/format'

type Mode = 'formatted' | 'raw'

export function CompositionView({ ehrId, uid }: { ehrId: string; uid: string }) {
  const composition = useComposition(ehrId, uid)
  const webTemplate = useWebTemplate(composition.data?.templateId)
  const [mode, setMode] = useState<Mode>('formatted')

  const sections = useMemo(
    () => composition.data && webTemplate.data && toSections(composition.data.flat, webTemplate.data.tree),
    [composition.data, webTemplate.data],
  )

  const c = composition.data
  if (!c) return <QueryStatus isPending={composition.isPending} error={composition.error} />

  return (
    <div className="space-y-7">
      <PageHeader
        title={c.name}
        description={
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDateTime(c.startTime)}
              </span>
              {c.composer && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {c.composer}
                </span>
              )}
              <Badge variant="outline">{c.templateId}</Badge>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="truncate">{c.uid}</span>
              <CopyButton value={c.uid} label="Copy composition UID" />
            </div>
          </div>
        }
        actions={
          <Segmented<Mode>
            label="View"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'formatted', label: 'Formatted' },
              { value: 'raw', label: 'Raw FLAT' },
            ]}
          />
        }
      />

      {mode === 'raw' ? (
        <Card>
          <pre className="overflow-auto p-5 font-mono text-xs leading-relaxed">{JSON.stringify(c.flat, null, 2)}</pre>
        </Card>
      ) : !sections ? (
        <QueryStatus isPending={webTemplate.isPending} error={webTemplate.error} />
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[15px] font-semibold">{section.label}</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
              {section.entries.map((entry) => (
                <Card key={entry.key} className="self-start">
                  <h3 className="border-b px-4 py-3 text-sm font-semibold">{entry.label}</h3>
                  <dl className="divide-y divide-muted px-4 py-1">
                    {entry.fields.map((field) => (
                      <div key={field.key} className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-[13px] text-muted-foreground">{field.label}</dt>
                        <dd className="text-right text-sm font-medium break-words tabular-nums">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
