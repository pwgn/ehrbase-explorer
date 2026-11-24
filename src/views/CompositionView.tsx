import { CalendarDays, History, Trash2, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useComposition, useCompositionVersions, useWebTemplate } from '../api/browse'
import { CopyButton } from '../components/CopyButton'
import { PageHeader } from '../components/PageHeader'
import { QueryStatus } from '../components/QueryStatus'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { VersionPicker } from '../components/VersionPicker'
import { toSections } from '../lib/flat'
import { formatDateTime } from '../lib/format'
import { cn } from '../lib/utils'
import type { Navigate } from './location'

type Mode = 'formatted' | 'raw'
type Change = { kind: 'changed'; was: string } | { kind: 'added' }

export function CompositionView({
  ehrId,
  uid,
  templateId,
  navigate,
}: {
  ehrId: string
  uid: string
  templateId?: string
  navigate: Navigate
}) {
  const composition = useComposition(ehrId, uid)
  const webTemplate = useWebTemplate(composition.data?.templateId)
  const history = useCompositionVersions(ehrId, uid)
  const [mode, setMode] = useState<Mode>('formatted')

  // Deleted versions have no content to show.
  const versions = useMemo(() => history.data?.filter((v) => v.changeType !== 'deleted') ?? [], [history.data])
  const c = composition.data
  const index = c ? versions.findIndex((v) => v.uid === c.uid) : -1
  const current = versions[index]
  const latest = versions[0] // newest version with content
  // Counts include deleted versions; a deletion as the newest version means the record is gone.
  const total = history.data?.[0]?.version ?? 0
  const deletion = history.data?.[0]?.changeType === 'deleted' ? history.data[0] : undefined
  const previous = index >= 0 ? versions[index + 1] : undefined
  const previousComposition = useComposition(ehrId, previous?.uid)

  const sections = useMemo(
    () => c && webTemplate.data && toSections(c.flat, webTemplate.data.tree),
    [c, webTemplate.data],
  )

  // Field-level differences from the previous version (same template only).
  const diff = useMemo(() => {
    const prev = previousComposition.data
    if (!sections || !prev || !webTemplate.data || prev.templateId !== c?.templateId) return null
    const before = new Map(
      toSections(prev.flat, webTemplate.data.tree).flatMap((s) => s.entries.flatMap((e) => e.fields.map((f) => [f.key, f.value]))),
    )
    const changes = new Map<string, Change>()
    const after = new Set<string>()
    for (const field of sections.flatMap((s) => s.entries.flatMap((e) => e.fields))) {
      after.add(field.key)
      const was = before.get(field.key)
      if (was === undefined) changes.set(field.key, { kind: 'added' })
      else if (was !== field.value) changes.set(field.key, { kind: 'changed', was })
    }
    const removed = [...before.keys()].filter((key) => !after.has(key)).length
    return { changes, removed }
  }, [sections, previousComposition.data, webTemplate.data, c?.templateId])

  if (!c) return <QueryStatus isPending={composition.isPending} error={composition.error} />

  const openVersion = (versionUid: string) => navigate({ view: 'composition', ehrId, uid: versionUid, templateId })
  const changed = diff ? [...diff.changes.values()].filter((x) => x.kind === 'changed').length : 0
  const added = diff ? diff.changes.size - changed : 0

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
          <>
            {versions.length > 1 && current && (
              <VersionPicker versions={versions} total={total} deleted={!!deletion} current={current.uid} onSelect={openVersion} />
            )}
            <Segmented<Mode>
              label="View"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'formatted', label: 'Formatted' },
                { value: 'raw', label: 'Raw FLAT' },
              ]}
            />
          </>
        }
      />

      {current && deletion && (
        <Alert>
          <Trash2 />
          <AlertTitle>Deleted</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground">
            <span>
              This composition was deleted in version {deletion.version}, committed {formatDateTime(deletion.committed)}
              {deletion.committer && ` by ${deletion.committer}`}. You're viewing version {current.version} of {total}.
            </span>
            {current !== latest && (
              <Button variant="outline" size="sm" onClick={() => openVersion(latest.uid)}>
                View last version
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {current && !deletion && current !== latest && (
        <Alert>
          <History />
          <AlertTitle>Older version</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground">
            <span>
              You're viewing version {current.version} of {total}, committed {formatDateTime(current.committed)}
              {current.committer && ` by ${current.committer}`}.
            </span>
            <Button variant="outline" size="sm" onClick={() => openVersion(latest.uid)}>
              View latest
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {mode === 'raw' ? (
        <Card>
          <pre className="overflow-auto p-5 font-mono text-xs leading-relaxed">{JSON.stringify(c.flat, null, 2)}</pre>
        </Card>
      ) : !sections ? (
        <QueryStatus isPending={webTemplate.isPending} error={webTemplate.error} />
      ) : (
        <>
          {diff && previous && (
            <p className="text-[13px] text-muted-foreground">
              {diff.changes.size === 0 && diff.removed === 0 ? (
                <>No field changes since version {previous.version}.</>
              ) : (
                <>
                  Since version {previous.version}:{' '}
                  {[
                    changed > 0 && `${changed} changed`,
                    added > 0 && `${added} added`,
                    diff.removed > 0 && `${diff.removed} removed`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  . Changed and added fields are highlighted; hover a changed value to see the previous one.
                </>
              )}
            </p>
          )}

          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold">{section.label}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
                {section.entries.map((entry) => (
                  <Card key={entry.key} className="self-start">
                    <h3 className="border-b px-4 py-3 text-sm font-semibold">{entry.label}</h3>
                    <dl className="divide-y divide-muted px-2 py-1">
                      {entry.fields.map((field) => {
                        const change = diff?.changes.get(field.key)
                        return (
                          <div
                            key={field.key}
                            className={cn(
                              'flex items-baseline justify-between gap-4 rounded-md px-2 py-2',
                              change && 'bg-primary-soft',
                            )}
                          >
                            <dt className="flex flex-col items-start gap-1 text-[13px] text-muted-foreground">
                              {field.label}
                              {change && <Badge className="px-1.5 py-0 text-[10px]">{change.kind}</Badge>}
                            </dt>
                            <dd
                              className="text-right text-sm font-medium break-words tabular-nums"
                              title={change?.kind === 'changed' ? `Version ${previous?.version}: ${change.was}` : undefined}
                            >
                              {field.value}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
