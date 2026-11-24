export const pageCountOf = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize))

// The pager is below the list: after a page change, bring the list's top
// back into view if it has scrolled out above.
export function scrollToListTop(list: HTMLElement | null) {
  if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: 'start' })
}
