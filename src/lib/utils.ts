import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Joins class names; later Tailwind classes override earlier conflicting ones.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
