import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CompositionVersion } from '../api/browse'
import { formatDateTime } from '../lib/format'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from './ui/select'

// Steps through a composition's versions; `versions` is newest first.
export function VersionPicker({
  versions,
  current,
  onSelect,
}: {
  versions: CompositionVersion[]
  current: string
  onSelect: (uid: string) => void
}) {
  const index = versions.findIndex((v) => v.uid === current)
  const newer = index > 0 ? versions[index - 1] : undefined
  const older = index >= 0 && index < versions.length - 1 ? versions[index + 1] : undefined

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        className="size-8"
        disabled={!older}
        onClick={() => older && onSelect(older.uid)}
        aria-label="Previous version"
        title="Previous version"
      >
        <ChevronLeft />
      </Button>
      <Select value={current} onValueChange={onSelect}>
        <SelectTrigger aria-label="Version">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {versions.map((v, i) => (
            <SelectItem key={v.uid} value={v.uid} className="flex-col items-start gap-0">
              <SelectItemText>
                Version {v.version} of {versions[0].version}
              </SelectItemText>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(v.committed)} · {v.changeType}
                {i === 0 && ' · latest'}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        className="size-8"
        disabled={!newer}
        onClick={() => newer && onSelect(newer.uid)}
        aria-label="Next version"
        title="Next version"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
