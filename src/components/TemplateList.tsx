import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { listTemplates } from '../api/ehrbase'
import { SearchInput } from './ui/input'
import { Skeleton } from './ui/skeleton'

// Show a filter box once the list gets long.
const FILTER_THRESHOLD = 10

// Sidebar list of templates for the AQL editor; picking one inserts a starter query.
export function TemplateList({ onSelect }: { onSelect: (templateId: string) => void }) {
  const { data, error, isPending } = useQuery({ queryKey: ['templates'], queryFn: listTemplates })
  const [filter, setFilter] = useState('')
  const needle = filter.trim().toLowerCase()
  const visible = data?.filter((t) => t.template_id.toLowerCase().includes(needle))

  return (
    <section className="flex min-h-0 flex-col gap-1">
      <h2 className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Insert query for template</h2>
      {data && data.length > FILTER_THRESHOLD && (
        <SearchInput
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter templates…"
          aria-label="Filter templates"
          className="mb-1 px-1 [&_input]:h-8 [&_input]:text-[13px]"
        />
      )}
      {isPending && (
        <div className="space-y-2 px-2.5 py-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
        </div>
      )}
      {error && <p className="px-2.5 text-[13px] text-destructive">{error.message}</p>}
      {data?.length === 0 && <p className="px-2.5 text-[13px] text-muted-foreground">No templates uploaded.</p>}
      {visible?.length === 0 && data!.length > 0 && (
        <p className="px-2.5 text-[13px] text-muted-foreground">No matching templates.</p>
      )}
      <ul className="min-h-0 space-y-0.5 overflow-auto">
        {visible?.map((t) => (
          <li key={t.template_id}>
            <button
              type="button"
              onClick={() => onSelect(t.template_id)}
              className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={`${t.archetype_id}\nClick to query compositions of this template`}
            >
              <FileText className="size-[15px] shrink-0" />
              <span className="truncate">{t.template_id}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
