import { useState } from 'react'
import { useHashRoute } from './lib/route'
import { AqlView, DEFAULT_QUERY } from './views/AqlView'
import { BrowseView } from './views/BrowseView'
import type { Location } from './views/location'

const TABS = { browse: 'Browse', aql: 'AQL' } as const
type Tab = keyof typeof TABS

function App() {
  const [route, navigate] = useHashRoute()
  const tab: Tab = route.tab

  // Each tab remembers its last state from the URL, so switching tabs returns there.
  // (Adjusting state during render, not in an effect, avoids an extra render pass.)
  const [lastBrowse, setLastBrowse] = useState<Location>({ view: 'overview' })
  const [aqlQuery, setAqlQuery] = useState(DEFAULT_QUERY)
  if (route.tab === 'browse' && route.location !== lastBrowse) setLastBrowse(route.location)
  if (route.tab === 'aql' && route.query !== undefined && route.query !== aqlQuery) setAqlQuery(route.query)
  const browseLocation = route.tab === 'browse' ? route.location : lastBrowse

  const openInAql = (query: string) => navigate({ tab: 'aql', query })
  const editAql = (query: string) => navigate({ tab: 'aql', query }, { replace: true })
  const setTab = (t: Tab) =>
    navigate(t === 'aql' ? { tab: 'aql', query: aqlQuery } : { tab: 'browse', location: browseLocation })

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center gap-6 border-b border-gray-200 px-4">
        <h1 className="py-3 text-lg font-semibold">EHRbase explorer</h1>
        <nav className="flex gap-1 self-stretch">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 text-sm font-medium ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {TABS[t]}
            </button>
          ))}
        </nav>
      </header>

      {/* Both stay mounted so switching tabs keeps each view's state. */}
      <div className={`min-h-0 flex-1 overflow-auto ${tab === 'browse' ? '' : 'hidden'}`}>
        <BrowseView
          location={browseLocation}
          navigate={(location, options) => navigate({ tab: 'browse', location }, options)}
          openInAql={openInAql}
        />
      </div>
      <div className={`min-h-0 flex-1 ${tab === 'aql' ? '' : 'hidden'}`}>
        <AqlView query={aqlQuery} setQuery={editAql} />
      </div>
    </div>
  )
}

export default App
