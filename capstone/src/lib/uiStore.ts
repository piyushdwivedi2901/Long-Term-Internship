import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
  action?: { label: string; run: () => void }
}

interface UiState {
  toasts: Toast[]
  paletteOpen: boolean
  /** When set, the "New task" dialog is open, optionally preset to a project/status. */
  newTask: { projectId?: number; status?: 'todo' | 'in_progress' | 'review' | 'done' } | null
  newProjectOpen: boolean
  toast(message: string, tone?: Toast['tone'], action?: Toast['action']): void
  dismiss(id: number): void
  setPaletteOpen(open: boolean): void
  openNewTask(preset?: UiState['newTask']): void
  closeNewTask(): void
  setNewProjectOpen(open: boolean): void
}

let toastId = 0

/** Cross-cutting UI state (Zustand): toasts, the command palette and global dialogs. */
export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  paletteOpen: false,
  newTask: null,
  newProjectOpen: false,
  toast(message, tone = 'info', action) {
    const id = ++toastId
    set({ toasts: [...get().toasts.slice(-3), { id, message, tone, action }] })
    setTimeout(() => get().dismiss(id), action ? 7000 : 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  openNewTask: (preset) => set({ newTask: preset ?? {} }),
  closeNewTask: () => set({ newTask: null }),
  setNewProjectOpen: (newProjectOpen) => set({ newProjectOpen }),
}))
