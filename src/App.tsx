import { Database, LayoutDashboard, Layers, Moon, Sun, SquareTerminal, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { TemplateList } from './components/TemplateList'
import { Button } from './components/ui/button'
import { compositionsQuery, DEFAULT_QUERY } from './lib/aql'
import { useHashRoute } from './lib/route'
import { setTheme, useTheme } from './lib/theme'
import { cn } from './lib/utils'
import { AqlView } from './views/AqlView'
import { Breadcrumbs } from './views/Breadcrumbs'
import { BrowseView } from './views/BrowseView'
import type { Location } from './views/location'

type Section = 'overview' | 'patients' | 'templates' | 'aql'

// Which sidebar item a browse location belongs to.
function sectionOf(location: Location): Section {
  if (location.view === 'overview') return 'overview'
  if (location.view === 'templates' || location.view === 'fields') return 'templates'
  return location.templateId ? 'templates' : 'patients'
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  )
}

function ThemeToggle() {
  const theme = useTheme()
  const dark = theme === 'dark'
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}

function App() {
  const [route, navigate] = useHashRoute()

  // Each tab remembers its last state from the URL. Coming back from the AQL
  // editor, the sidebar item of the section you left returns you to where you were.
  // (Adjusting state during render, not in an effect, avoids an extra render pass.)
  const [lastBrowse, setLastBrowse] = useState<Location>({ view: 'overview' })
  const [aqlQuery, setAqlQuery] = useState(DEFAULT_QUERY)
  if (route.tab === 'browse' && route.location !== lastBrowse) setLastBrowse(route.location)
  if (route.tab === 'aql' && route.query !== undefined && route.query !== aqlQuery) setAqlQuery(route.query)
  const browseLocation = route.tab === 'browse' ? route.location : lastBrowse

  const openInAql = (query: string) => navigate({ tab: 'aql', query })
  const editAql = (query: string) => navigate({ tab: 'aql', query }, { replace: true })
  const browse = (location: Location) => navigate({ tab: 'browse', location })
  const browseSection = (target: Section, root: Location) =>
    browse(route.tab === 'aql' && sectionOf(lastBrowse) === target ? lastBrowse : root)
  const section: Section = route.tab === 'aql' ? 'aql' : sectionOf(route.location)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r bg-card px-3 py-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Database className="size-[18px]" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">EHRbase explorer</div>
            <div className="text-xs text-muted-foreground">openEHR CDR</div>
          </div>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <h2 className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Browse</h2>
          <NavItem icon={LayoutDashboard} label="Overview" active={section === 'overview'} onClick={() => browseSection('overview', { view: 'overview' })} />
          <NavItem icon={Users} label="Patients" active={section === 'patients'} onClick={() => browseSection('patients', { view: 'patients' })} />
          <NavItem icon={Layers} label="Templates" active={section === 'templates'} onClick={() => browseSection('templates', { view: 'templates' })} />
          <h2 className="px-2.5 pt-4 pb-1 text-xs font-medium text-muted-foreground">Query</h2>
          <NavItem
            icon={SquareTerminal}
            label="AQL editor"
            active={section === 'aql'}
            onClick={() => navigate({ tab: 'aql', query: aqlQuery })}
          />
        </nav>

        {route.tab === 'aql' && <TemplateList onSelect={(id) => editAql(compositionsQuery(id))} />}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-8">
          {route.tab === 'browse' ? (
            <Breadcrumbs location={route.location} navigate={browse} />
          ) : (
            <span className="text-sm font-medium">AQL editor</span>
          )}
          <ThemeToggle />
        </header>

        {/* Both stay mounted so switching tabs keeps each view's state. */}
        <div className={cn('min-h-0 flex-1 overflow-auto', route.tab !== 'browse' && 'hidden')}>
          <BrowseView
            location={browseLocation}
            navigate={(location, options) => navigate({ tab: 'browse', location }, options)}
            openInAql={openInAql}
          />
        </div>
        <div className={cn('min-h-0 flex-1 overflow-auto', route.tab !== 'aql' && 'hidden')}>
          <AqlView query={aqlQuery} setQuery={editAql} />
        </div>
      </div>
    </div>
  )
}

export default App
