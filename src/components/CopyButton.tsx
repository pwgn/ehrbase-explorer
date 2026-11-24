import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'

export function CopyButton({ value, label = 'Copy', children }: { value: string; label?: string; children?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const icon = copied ? <Check /> : <Copy />

  // With text it's a labelled outline button, otherwise a small icon button.
  return children ? (
    <Button variant="outline" size="sm" onClick={copy}>
      {icon}
      {copied ? 'Copied' : children}
    </Button>
  ) : (
    <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={label} title={label}>
      {icon}
    </Button>
  )
}
