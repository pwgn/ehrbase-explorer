import { Breadcrumbs } from './Breadcrumbs'
import { CompositionView } from './CompositionView'
import { FieldExplorerView } from './FieldExplorerView'
import type { Location, Navigate } from './location'
import { OverviewView } from './OverviewView'
import { PatientListView } from './PatientListView'
import { PatientView } from './PatientView'

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
    <div className="mx-auto max-w-6xl p-4">
      <Breadcrumbs location={location} navigate={navigate} />
      {location.view === 'overview' && <OverviewView navigate={navigate} />}
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
        <PatientView ehrId={location.ehrId} templateId={location.templateId} navigate={navigate} />
      )}
      {location.view === 'composition' && <CompositionView ehrId={location.ehrId} uid={location.uid} />}
    </div>
  )
}
