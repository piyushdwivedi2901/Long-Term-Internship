import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

interface UiState {
  toasts: Toast[]
  toast(message: string, tone?: Toast['tone']): void
  dismiss(id: number): void
}

let n = 0
export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  toast(message, tone = 'info') {
    const id = ++n
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] })
    setTimeout(() => get().dismiss(id), 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
