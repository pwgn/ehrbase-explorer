// Loading / error placeholder for a React Query result.
export function QueryStatus({ isPending, error }: { isPending: boolean; error: Error | null }) {
  if (error) {
    return <pre className="rounded bg-red-50 p-3 text-xs whitespace-pre-wrap text-red-700">{error.message}</pre>
  }
  if (isPending) return <p className="text-sm text-gray-500">Loading…</p>
  return null
}
