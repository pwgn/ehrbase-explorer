// Display formatting for openEHR values.

const UNITS: Record<string, string> = { Cel: '°C', 'mm[Hg]': 'mmHg' }

export function formatUnit(unit: string) {
  return UNITS[unit] ?? unit
}

// "2018-04-11T00:00:00" → "2018-04-11", "2026-10-02T09:15:00.123Z" → "2026-10-02 09:15"
export function formatDateTime(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(value)
  if (!match) return value
  const [, date, time, seconds = ''] = match
  return time === '00:00' && /^(:00(\.0+)?)?$/.test(seconds) ? date : `${date} ${time}`
}

export function formatScalar(value: string | number | boolean) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return typeof value === 'string' ? formatDateTime(value) : String(value)
}
