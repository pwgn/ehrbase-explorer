import type { NavigateOptions } from '../lib/route'

// Where the user is in the browse views. `templateId` on the deeper levels
// remembers which template the user drilled down from, for the breadcrumbs.
export type Location =
  | { view: 'overview' }
  | { view: 'patients'; templateId?: string }
  | { view: 'fields'; templateId: string; fields: string[] } // selected field keys
  | { view: 'patient'; ehrId: string; templateId?: string }
  | { view: 'composition'; ehrId: string; uid: string; templateId?: string }

export type Navigate = (to: Location, options?: NavigateOptions) => void
