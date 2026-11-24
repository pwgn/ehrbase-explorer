// Hash-based routing, so views can be linked and the back button works
// without a router library or server config.
//
//   #/                                      overview
//   #/patients?page=<n>                     all patients (n: page of the list)
//   #/templates                             templates
//   #/templates/<id>/patients?page=<n>      patients with a composition of <id>
//   #/templates/<id>/fields?f=<key>&f=…     field explorer with selected fields
//   #/ehrs/<ehrId>?template=<id>&page=<n>   patient (n: page of its compositions)
//   #/ehrs/<ehrId>/compositions/<uid>?…     composition
//   #/aql?q=<query>                         AQL editor
import { useCallback, useEffect, useState } from 'react'
import type { Location } from '../views/location'

export type Route = { tab: 'browse'; location: Location } | { tab: 'aql'; query?: string }

export interface NavigateOptions {
  // Update the URL without adding a history entry (e.g. while typing).
  replace?: boolean
}

// ':' and (in query values) '/' are legal in a fragment; keeping them readable
// makes field keys and composition uids legible in the address bar.
const encodeSegment = (s: string) => encodeURIComponent(s).replace(/%3A/gi, ':')
const encodeParam = (s: string) => encodeSegment(s).replace(/%2F/gi, '/')

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const queryStart = raw.indexOf('?')
  const path = queryStart < 0 ? raw : raw.slice(0, queryStart)
  const params = new URLSearchParams(queryStart < 0 ? '' : raw.slice(queryStart + 1))
  let parts: string[]
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    // Malformed escape (e.g. a hand-edited link): fall back to the overview.
    parts = []
  }
  const templateId = params.get('template') ?? undefined
  // 1-based; page 1 (or anything invalid) is left out of the location.
  const pageParam = Number(params.get('page'))
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : undefined
  const browse = (location: Location): Route => ({ tab: 'browse', location })

  if (parts[0] === 'aql' && parts.length === 1) return { tab: 'aql', query: params.get('q') ?? undefined }
  if (parts[0] === 'patients' && parts.length === 1) return browse({ view: 'patients', page })
  if (parts[0] === 'templates' && parts.length === 1) return browse({ view: 'templates' })
  if (parts[0] === 'templates' && parts.length === 3) {
    if (parts[2] === 'patients') return browse({ view: 'patients', templateId: parts[1], page })
    if (parts[2] === 'fields') return browse({ view: 'fields', templateId: parts[1], fields: params.getAll('f') })
  }
  if (parts[0] === 'ehrs' && parts.length === 2) return browse({ view: 'patient', ehrId: parts[1], templateId, page })
  if (parts[0] === 'ehrs' && parts.length === 4 && parts[2] === 'compositions') {
    return browse({ view: 'composition', ehrId: parts[1], uid: parts[3], templateId })
  }
  return browse({ view: 'overview' })
}

export function toHash(route: Route): string {
  const path = (...segments: string[]) => `#/${segments.map(encodeSegment).join('/')}`
  const query = (params: [string, string | undefined][]) => {
    const pairs = params.filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeParam(v!)}`)
    return pairs.length > 0 ? `?${pairs.join('&')}` : ''
  }
  const pageParam = (page?: number): [string, string | undefined] => ['page', page && page > 1 ? String(page) : undefined]

  if (route.tab === 'aql') return path('aql') + query([['q', route.query]])

  const loc = route.location
  switch (loc.view) {
    case 'overview':
      return '#/'
    case 'templates':
      return path('templates')
    case 'patients':
      return (
        (loc.templateId ? path('templates', loc.templateId, 'patients') : path('patients')) + query([pageParam(loc.page)])
      )
    case 'fields':
      return path('templates', loc.templateId, 'fields') + query(loc.fields.map((f) => ['f', f]))
    case 'patient':
      return path('ehrs', loc.ehrId) + query([['template', loc.templateId], pageParam(loc.page)])
    case 'composition':
      return path('ehrs', loc.ehrId, 'compositions', loc.uid) + query([['template', loc.templateId]])
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((to: Route, options?: NavigateOptions) => {
    const hash = toHash(to)
    // replaceState doesn't fire hashchange, so update the state directly either way.
    if (options?.replace) window.history.replaceState(null, '', hash)
    else if (window.location.hash !== hash) window.location.hash = hash
    setRoute(parseHash(hash))
  }, [])

  return [route, navigate] as const
}
