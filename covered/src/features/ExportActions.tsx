import { useState } from 'react'
import { CalendarPlus, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.tsx'
import { localToday } from '../lib/dates.ts'
import { backupJson, calendarFile, download, itemsToCsv } from '../lib/export.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'

type Kind = 'calendar' | 'csv' | 'json'

/** Calendar reminders, a spreadsheet, or a full backup — built from one export call. */
export function useExport() {
  const { api, user } = useAuth()
  const toast = useUi((s) => s.toast)
  const [busy, setBusy] = useState<Kind | null>(null)
  const run = async (kind: Kind, itemId?: number) => {
    setBusy(kind)
    try {
      const today = localToday()
      const backup = await api.exportAll(today)
      const items = itemId ? backup.items.filter((i) => i.id === itemId) : backup.items
      if (kind === 'calendar') {
        const events = items.filter((i) => i.coverages.some((c) => c.state !== 'expired'))
        if (!events.length) return toast('Nothing to remind you about — no cover is still running', 'info')
        const name = itemId ? `${items[0].name.replace(/[^\w-]+/g, '-').toLowerCase()}-warranty.ics` : 'warranty-reminders.ics'
        download(name, calendarFile(items, user?.remindDays ?? 30), 'text/calendar;charset=utf-8')
        toast('Calendar file downloaded — open it to add the reminders', 'success')
      } else if (kind === 'csv') {
        download(`covered-items-${today}.csv`, itemsToCsv(items), 'text/csv;charset=utf-8')
      } else {
        download(`covered-backup-${today}.json`, backupJson(backup), 'application/json')
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  return { run, busy }
}

export function CalendarButton({ itemId, label = 'Add reminders to calendar', size = 'sm' as const }: { itemId?: number; label?: string; size?: 'sm' | 'md' }) {
  const { run, busy } = useExport()
  return (
    <Button size={size} icon={<CalendarPlus size={16} aria-hidden />} busy={busy === 'calendar'} onClick={() => run('calendar', itemId)}>
      {label}
    </Button>
  )
}

export function CsvButton() {
  const { run, busy } = useExport()
  return (
    <Button size="sm" icon={<FileSpreadsheet size={16} aria-hidden />} busy={busy === 'csv'} onClick={() => run('csv')}>
      Export spreadsheet
    </Button>
  )
}
