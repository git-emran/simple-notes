import type { KanbanCardPriority } from '@renderer/store/kanbanStore'

export const KANBAN_PRIORITY_OPTIONS: Array<{
  value: Exclude<KanbanCardPriority, null>
  label: string
}> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const getPriorityChipTint = (priority: Exclude<KanbanCardPriority, null>) => {
  switch (priority) {
    case 'high':
      return {
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.45)',
        bgActive: 'rgba(239, 68, 68, 0.24)',
        borderActive: 'rgba(239, 68, 68, 0.7)',
      }
    case 'medium':
      return {
        bg: 'rgba(245, 158, 11, 0.14)',
        border: 'rgba(245, 158, 11, 0.45)',
        bgActive: 'rgba(245, 158, 11, 0.24)',
        borderActive: 'rgba(245, 158, 11, 0.7)',
      }
    case 'low':
    default:
      return {
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.45)',
        bgActive: 'rgba(16, 185, 129, 0.24)',
        borderActive: 'rgba(16, 185, 129, 0.7)',
      }
  }
}
