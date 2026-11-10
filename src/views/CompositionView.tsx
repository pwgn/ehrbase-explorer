import { useMemo, useState } from 'react'
import { useComposition, useWebTemplate } from '../api/browse'
import { QueryStatus } from '../components/QueryStatus'
import { toSections } from '../lib/flat'
import { formatDateTime } from '../lib/format'

export function CompositionView({ ehrId, uid }: { ehrId: string; uid: string }) {
  const composition = useComposition(ehrId, uid)
  const webTemplate = useWebTemplate(composition.data?.templateId)
  const [showRaw, setShowRaw] = useState(false)

  const sections = useMemo(
    () => composition.data && webTemplate.data && toSections(composition.data.flat, webTemplate.data.tree),
    [composition.data, webTemplate.data],
  )

  const c = composition.data
  if (!c) return <QueryStatus isPending={composition.isPending} error={composition.error} />

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{c.name}</h2>
          <p className="text-sm text-gray-600">
            {formatDateTime(c.startTime)}
            {c.composer && ` · ${c.composer}`} · {c.templateId}
          </p>
          <p className="font-mono text-xs text-gray-500">{c.uid}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
        >
          {showRaw ? 'Show formatted' : 'Show raw FLAT'}
        </button>
      </header>

      {showRaw ? (
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(c.flat, null, 2)}</pre>
      ) : !sections ? (
        <QueryStatus isPending={webTemplate.isPending} error={webTemplate.error} />
      ) : (
        sections.map((section) => (
          <section key={section.key}>
            <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold tracking-wide text-gray-500 uppercase">
              {section.label}
            </h3>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
              {section.entries.map((entry) => (
                <article key={entry.key} className="rounded border border-gray-200 p-3">
                  <h4 className="mb-1 font-medium">{entry.label}</h4>
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm">
                    {entry.fields.map((field) => (
                      <div key={field.key} className="contents">
                        <dt className="text-gray-500">{field.label}</dt>
                        <dd className="break-words">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
