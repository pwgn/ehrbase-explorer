import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Skeleton } from './ui/skeleton'

export function ErrorAlert({ error, title = 'Request failed' }: { error: Error; title?: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-1 font-mono text-xs break-words whitespace-pre-wrap">{error.message}</AlertDescription>
    </Alert>
  )
}

// Loading / error placeholder for a React Query result.
export function QueryStatus({ isPending, error }: { isPending: boolean; error: Error | null }) {
  if (error) return <ErrorAlert error={error} />
  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      </div>
    )
  }
  return null
}
