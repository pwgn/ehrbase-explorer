import { sql } from '@codemirror/lang-sql'
import { useMutation } from '@tanstack/react-query'
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror'
import { useMemo } from 'react'
import { runAql } from '../api/ehrbase'
import { ResultTable } from '../components/ResultTable'
import { TemplateList } from '../components/TemplateList'
import { aqlString } from '../lib/fieldTree'

export const DEFAULT_QUERY = `SELECT e/ehr_id/value, e/time_created/value
FROM EHR e
LIMIT 20`

function compositionsQuery(templateId: string) {
  return `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value
FROM EHR e CONTAINS COMPOSITION c
WHERE c/archetype_details/template_id/value = ${aqlString(templateId)}
ORDER BY c/context/start_time/value DESC
LIMIT 50`
}

// The query lives in App so other views can open a query here.
export function AqlView({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {
  const aql = useMutation({ mutationFn: runAql })
  const { mutate } = aql
  // Takes precedence over CodeMirror's own Mod-Enter (insert blank line).
  const extensions = useMemo(
    () => [
      sql(),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: (view) => (mutate(view.state.doc.toString()), true) }])),
    ],
    [mutate],
  )

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 overflow-auto border-r border-gray-200 p-4">
        <TemplateList onSelect={(id) => setQuery(compositionsQuery(id))} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="overflow-hidden rounded border border-gray-200">
          <CodeMirror
            value={query}
            onChange={setQuery}
            extensions={extensions}
            height="180px"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => aql.mutate(query)}
            disabled={aql.isPending}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {aql.isPending ? 'Running…' : 'Run'}
          </button>
          <span className="text-xs text-gray-500">Ctrl+Enter</span>
          {aql.data && <span className="text-sm text-gray-600">{aql.data.rows.length} rows</span>}
        </div>

        {aql.error && (
          <pre className="rounded bg-red-50 p-3 text-xs whitespace-pre-wrap text-red-700">{aql.error.message}</pre>
        )}

        <div className="min-h-0 flex-1 overflow-auto">{aql.data && <ResultTable result={aql.data} />}</div>
      </main>
    </div>
  )
}
