import type { TemplateStats } from '../api/browse'
import { formatDateTime } from '../lib/format'
import type { Column } from './DataTable'

// Shared by the overview's recent templates and the templates page.
export const templateColumns: Column<TemplateStats>[] = [
  {
    header: 'Template',
    cell: (t: TemplateStats) => (
      <>
        <div className="font-medium">{t.templateId}</div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{t.rootArchetype}</div>
      </>
    ),
  },
  { header: 'Compositions', cell: (t: TemplateStats) => t.compositions.toLocaleString(), align: 'right' },
  { header: 'Patients', cell: (t: TemplateStats) => t.patients.toLocaleString(), align: 'right' },
  {
    header: 'Uploaded',
    cell: (t: TemplateStats) => formatDateTime(t.uploaded),
    className: 'whitespace-nowrap text-muted-foreground',
  },
]
