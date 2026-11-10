// Hash-based routing, so views can be linked and the back button works
// without a router library or server config.
//
//   #/                                      overview
//   #/patients                              all patients
//   #/templates/<id>/patients               patients with a composition of <id>
//   #/templates/<id>/fields?f=<key>&f=…     field explorer with selected fields
//   #/ehrs/<ehrId>?template=<id>            patient
//   #/ehrs/<ehrId>/compositions/<uid>?…     composition
//   #/aql?q=<query>                         AQL tab
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
  const browse = (location: Location): Route => ({ tab: 'browse', location })

  if (parts[0] === 'aql' && parts.length === 1) return { tab: 'aql', query: params.get('q') ?? undefined }
  if (parts[0] === 'patients' && parts.length === 1) return browse({ view: 'patients' })
  if (parts[0] === 'templates' && parts.length === 3) {
    if (parts[2] === 'patients') return browse({ view: 'patients', templateId: parts[1] })
    if (parts[2] === 'fields') return browse({ view: 'fields', templateId: parts[1], fields: params.getAll('f') })
  }
  if (parts[0] === 'ehrs' && parts.length === 2) return browse({ view: 'patient', ehrId: parts[1], templateId })
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

  if (route.tab === 'aql') return path('aql') + query([['q', route.query]])

  const loc = route.location
  switch (loc.view) {
    case 'overview':
      return '#/'
    case 'patients':
      return loc.templateId ? path('templates', loc.templateId, 'patients') : path('patients')
    case 'fields':
      return path('templates', loc.templateId, 'fields') + query(loc.fields.map((f) => ['f', f]))
    case 'patient':
      return path('ehrs', loc.ehrId) + query([['template', loc.templateId]])
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
