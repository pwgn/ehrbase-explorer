import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('text-[15px] leading-tight font-semibold', className)} {...props} />
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('mt-0.5 text-[13px] text-muted-foreground', className)} {...props} />
}
