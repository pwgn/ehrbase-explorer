import { CompositionView } from './CompositionView'
import { FieldExplorerView } from './FieldExplorerView'
import type { Location, Navigate } from './location'
import { OverviewView } from './OverviewView'
import { PatientListView } from './PatientListView'
import { PatientView } from './PatientView'
import { TemplatesView } from './TemplatesView'

export function BrowseView({
  location,
  navigate,
  openInAql,
}: {
  location: Location
  navigate: Navigate
  openInAql: (query: string) => void
}) {
  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      {location.view === 'overview' && <OverviewView navigate={navigate} />}
      {location.view === 'templates' && <TemplatesView navigate={navigate} openInAql={openInAql} />}
      {location.view === 'patients' && <PatientListView templateId={location.templateId} navigate={navigate} />}
      {location.view === 'fields' && (
        <FieldExplorerView
          templateId={location.templateId}
          fieldKeys={location.fields}
          navigate={navigate}
          openInAql={openInAql}
        />
      )}
      {location.view === 'patient' && (
        <PatientView
          ehrId={location.ehrId}
          templateId={location.templateId}
          page={location.page ?? 1}
          navigate={navigate}
        />
      )}
      {location.view === 'composition' && (
        <CompositionView ehrId={location.ehrId} uid={location.uid} templateId={location.templateId} navigate={navigate} />
      )}
    </div>
  )
}
