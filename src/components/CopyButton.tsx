import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'

export function CopyButton({ value, label = 'Copy', children }: { value: string; label?: string; children?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    try {
      // Missing outside a secure context (plain http on a non-localhost host).
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 1500)
  }
  const icon = state === 'copied' ? <Check /> : state === 'failed' ? <X /> : <Copy />
  const text = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : undefined

  // With text it's a labelled outline button, otherwise a small icon button.
  return children ? (
    <Button variant="outline" size="sm" onClick={copy}>
      {icon}
      {text ?? children}
    </Button>
  ) : (
    <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={label} title={text ?? label}>
      {icon}
    </Button>
  )
}
