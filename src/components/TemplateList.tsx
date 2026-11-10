import { useQuery } from '@tanstack/react-query'
import { listTemplates } from '../api/ehrbase'

export function TemplateList({ onSelect }: { onSelect: (templateId: string) => void }) {
  const { data, error, isPending } = useQuery({ queryKey: ['templates'], queryFn: listTemplates })

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Templates</h2>
      {isPending && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">No templates uploaded.</p>}
      <ul className="space-y-1">
        {data?.map((t) => (
          <li key={t.template_id}>
            <button
              type="button"
              onClick={() => onSelect(t.template_id)}
              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
              title={`${t.archetype_id}\nClick to query compositions of this template`}
            >
              {t.template_id}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
