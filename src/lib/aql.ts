import { aqlString } from './fieldTree'

export const DEFAULT_QUERY = `SELECT e/ehr_id/value, e/time_created/value
FROM EHR e
LIMIT 20`

// Starter query listing the latest compositions of a template.
export function compositionsQuery(templateId: string) {
  return `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value
FROM EHR e CONTAINS COMPOSITION c
WHERE c/archetype_details/template_id/value = ${aqlString(templateId)}
ORDER BY c/context/start_time/value DESC
LIMIT 50`
}
