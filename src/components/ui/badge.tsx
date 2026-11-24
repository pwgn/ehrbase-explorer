import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'rounded-full border-transparent bg-primary-soft px-2 text-primary-soft-foreground tabular-nums',
        secondary: 'border-transparent bg-muted font-mono text-[11px] font-normal text-muted-foreground',
        outline: 'text-foreground',
        warning: 'border-warning-soft-border bg-warning-soft text-[11px] text-warning-soft-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
