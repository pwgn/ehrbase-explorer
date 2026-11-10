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
  const crumbs: { label: ReactNode; to: Location }[] = [{ label: 'Overview', to: { view: 'overview' } }]

  if (location.view !== 'overview') {
    const { templateId } = location
    crumbs.push({ label: templateId ?? 'All patients', to: { view: 'patients', templateId } })
  }
  if (location.view === 'fields') {
    crumbs.push({ label: 'Fields', to: location })
  }
  if (location.view === 'patient' || location.view === 'composition') {
    const { ehrId, templateId } = location
    crumbs.push({ label: <PatientCrumb ehrId={ehrId} />, to: { view: 'patient', ehrId, templateId } })
  }
  if (location.view === 'composition') {
    crumbs.push({ label: <CompositionCrumb ehrId={location.ehrId} uid={location.uid} />, to: location })
  }

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <span>›</span>}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-gray-900">{crumb.label}</span>
          ) : (
            <button type="button" onClick={() => navigate(crumb.to)} className="hover:text-blue-600 hover:underline">
              {crumb.label}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
