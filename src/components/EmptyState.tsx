import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  children,
}: {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-[18px]" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}
