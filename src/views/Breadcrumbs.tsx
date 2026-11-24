import { ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { useComposition, usePatient } from '../api/browse'
import type { Location, Navigate } from './location'

function PatientCrumb({ ehrId }: { ehrId: string }) {
  const { data } = usePatient(ehrId)
  return <>{data?.subjectId ?? ehrId.slice(0, 8)}</>
}

function CompositionCrumb({ ehrId, uid }: { ehrId: string; uid: string }) {
  const { data } = useComposition(ehrId, uid)
  return <>{data?.name ?? 'Composition'}</>
}

export function Breadcrumbs({ location, navigate }: { location: Location; navigate: Navigate }) {
  const crumbs: { label: ReactNode; to: Location }[] = []
  const templateId = location.view === 'overview' || location.view === 'templates' ? undefined : location.templateId

  if (location.view === 'overview') crumbs.push({ label: 'Overview', to: location })
  if (location.view === 'templates' || templateId) crumbs.push({ label: 'Templates', to: { view: 'templates' } })
  if (templateId) crumbs.push({ label: templateId, to: { view: 'patients', templateId } })
  else if (location.view === 'patients' || location.view === 'patient' || location.view === 'composition') {
    crumbs.push({ label: 'Patients', to: { view: 'patients' } })
  }
  if (location.view === 'fields') crumbs.push({ label: 'Fields', to: location })
  if (location.view === 'patient' || location.view === 'composition') {
    const { ehrId } = location
    crumbs.push({ label: <PatientCrumb ehrId={ehrId} />, to: { view: 'patient', ehrId, templateId } })
  }
  if (location.view === 'composition') {
    crumbs.push({ label: <CompositionCrumb ehrId={location.ehrId} uid={location.uid} />, to: location })
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
          {i === crumbs.length - 1 ? (
            <span aria-current="page" className="truncate font-medium text-foreground">
              {crumb.label}
            </span>
          ) : (
            <button type="button" onClick={() => navigate(crumb.to)} className="cursor-pointer truncate hover:text-foreground">
              {crumb.label}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
