import { sql } from '@codemirror/lang-sql'
import { useMutation } from '@tanstack/react-query'
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror'
import { LoaderCircle, Play, SquareTerminal } from 'lucide-react'
import { useMemo } from 'react'
import { runAql } from '../api/ehrbase'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/QueryStatus'
import { ResultTable } from '../components/ResultTable'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { useTheme } from '../lib/theme'

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{children}</kbd>
  )
}

// The query lives in App so other views (and the sidebar template list) can open a query here.
export function AqlView({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {
  const theme = useTheme()
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
    <div className="flex flex-col gap-5 px-8 py-6">
      <Card>
        <CodeMirror
          value={query}
          onChange={setQuery}
          extensions={extensions}
          theme={theme}
          height="200px"
          className="text-[13px] [&_.cm-activeLine]:bg-muted/50! [&_.cm-activeLineGutter]:bg-muted! [&_.cm-editor]:bg-transparent! [&_.cm-gutters]:border-r! [&_.cm-gutters]:border-border! [&_.cm-gutters]:bg-background! [&_.cm-scroller]:font-mono!"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            Run with <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>Enter</Kbd>
          </span>
          <Button onClick={() => aql.mutate(query)} disabled={aql.isPending}>
            {aql.isPending ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}
            {aql.isPending ? 'Running…' : 'Run query'}
          </Button>
        </div>
      </Card>

      {aql.error && <ErrorAlert error={aql.error} title="Query failed" />}

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Results</CardTitle>
            {aql.data && <Badge>{aql.data.rows.length} rows</Badge>}
          </div>
        </CardHeader>
        {aql.data ? (
          <ResultTable result={aql.data} />
        ) : (
          <EmptyState
            icon={SquareTerminal}
            title="No results yet"
            description="Write a query and run it, or pick a template in the sidebar for a starter query."
          />
        )}
      </Card>
    </div>
  )
}
