// Light/dark theme. index.html sets the initial `dark` class before first paint
// (stored choice, else the system preference); this keeps React in sync with it.
import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()
const current = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Storage blocked: the choice just isn't remembered.
  }
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, current)
}
