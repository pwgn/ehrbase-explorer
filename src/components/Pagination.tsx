import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { pageCountOf } from '../lib/pagination'
import { Button } from './ui/button'

// For a stale or hand-edited ?page= past the end of the list.
export function PastLastPage({ page, onLastPage }: { page: number; onLastPage: () => void }) {
  return (
    <div className="px-6 py-6 text-sm text-muted-foreground">
      There is no page {page.toLocaleString()}.{' '}
      <button type="button" className="cursor-pointer underline hover:text-foreground" onClick={onLastPage}>
        Go to the last page
      </button>
    </div>
  )
}

// "1–50 of 3,214" with first/previous/next/last buttons. `page` is 1-based.
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  loading = false,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  loading?: boolean
}) {
  const pageCount = pageCountOf(total, pageSize)
  if (pageCount <= 1) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums" aria-live="polite">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
        {loading && <span className="sr-only"> (loading)</span>}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular-nums">
          Page {page.toLocaleString()} of {pageCount.toLocaleString()}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
          aria-label="Last page"
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
