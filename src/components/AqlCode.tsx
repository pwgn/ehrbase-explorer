import { sql } from '@codemirror/lang-sql'
import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from '../lib/theme'

const extensions = [sql()]
const setup = { lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }

// Read-only, syntax-highlighted AQL.
export function AqlCode({ value }: { value: string }) {
  const theme = useTheme()
  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      editable={false}
      basicSetup={setup}
      theme={theme}
      className="text-[12.5px] [&_.cm-editor]:bg-transparent! [&_.cm-editor]:px-2 [&_.cm-editor]:py-2 [&_.cm-scroller]:font-mono!"
    />
  )
}
