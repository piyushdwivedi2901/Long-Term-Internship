import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Download, HandCoins, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Expense, Transfer } from '../../shared/types.ts'
import { useDeleteGroup, useGroup, useLeaveGroup } from '../api/hooks.ts'
import { useApi } from '../auth/AuthContext.tsx'
import { ApiError } from '../api/types.ts'
import { ExpenseDialog } from '../features/ExpenseDialog.tsx'
import { GroupDialog } from '../features/GroupDialog.tsx'
import { SettleDialog, type SettlePreset } from '../features/SettleDialog.tsx'
import { BalancesTab } from '../features/group/BalancesTab.tsx'
import { ExpenseDetail } from '../features/group/ExpenseDetail.tsx'
import { ExpensesTab } from '../features/group/ExpensesTab.tsx'
import { InsightsTab } from '../features/group/InsightsTab.tsx'
import { PeopleTab } from '../features/group/PeopleTab.tsx'
import { download, groupToCsv } from '../lib/csv.ts'
import { useUi } from '../lib/uiStore.ts'
import { Avatar, BalanceLine } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import NotFoundPage from './NotFoundPage.tsx'

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
  { id: 'insights', label: 'Insights' },
  { id: 'people', label: 'People' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function GroupPage() {
  const id = Number(useParams().groupId)
  const [params, setParams] = useSearchParams()
  const tab: TabId = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'expenses') as TabId
  const { data: group, isPending, error } = useGroup(id)
  const api = useApi()
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const del = useDeleteGroup()
  const leave = useLeaveGroup()

  const [adding, setAdding] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()
  const [viewing, setViewing] = useState<Expense | null>(null)
  const [settle, setSettle] = useState<{ open: boolean; preset?: SettlePreset }>({ open: false })
  const [editingGroup, setEditingGroup] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'leave' | null>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  if (!Number.isInteger(id) || (error instanceof ApiError && error.status === 404)) return <NotFoundPage what="group" />
  if (isPending) return <PageLoading label="Loading group" />
  if (error || !group) return <p className="form-error" role="alert">{error?.message}</p>

  const selectTab = (t: TabId) =>
    setParams((p) => {
      if (t === 'expenses') p.delete('tab')
      else p.set('tab', t)
      return p
    }, { replace: true })

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab)
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    selectTab(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  const exportCsv = async () => {
    try {
      const [expenses, settlements] = await Promise.all([api.listExpenses(group.id), api.listSettlements(group.id)])
      download(`${group.name.replace(/[^\w-]+/g, '-').toLowerCase()}-expenses.csv`, groupToCsv(group, expenses, settlements))
      toast(`Exported ${expenses.length} expenses`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const openSettle = (t?: Transfer) => setSettle({ open: true, preset: t ? { from: t.from, to: t.to, amount: t.amount } : undefined })

  return (
    <div className="page">
      <title>{`${group.name} · Fairshare`}</title>
      <Link to="/groups" className="back"><ChevronLeft size={16} aria-hidden /> Groups</Link>
      <header className="group-head">
        <span className="group-head__emoji" aria-hidden>{group.emoji}</span>
        <div className="group-head__main">
          <h1>{group.name}</h1>
          <div className="row">
            <span className="avatars" role="img" aria-label={`Members: ${group.members.map((m) => m.name).join(', ')}`}>
              {group.members.slice(0, 6).map((m) => <Avatar key={m.id} name={m.name} size={26} you={m.isYou} />)}
              {group.members.length > 6 && <span className="avatars__more">+{group.members.length - 6}</span>}
            </span>
            <span className="muted small">{group.members.length} people · {group.currency}</span>
          </div>
          <p className="group-head__balance"><BalanceLine value={group.myBalance} currency={group.currency} /></p>
        </div>
        <div className="group-head__actions">
          <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)}>Add expense</Button>
          <Button icon={<HandCoins size={16} aria-hidden />} onClick={() => (group.plan.length ? selectTab('balances') : openSettle())}>Settle up</Button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Group sections" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
            {t.id === 'balances' && group.plan.length > 0 && <span className="tab-dot" aria-label={`${group.plan.length} payments to settle`}>{group.plan.length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel">
        {tab === 'expenses' && <ExpensesTab group={group} onOpen={setViewing} onAdd={() => setAdding(true)} />}
        {tab === 'balances' && <BalancesTab group={group} onSettle={openSettle} />}
        {tab === 'insights' && <InsightsTab group={group} />}
        {tab === 'people' && (
          <>
            <PeopleTab group={group} />
            <section className="group-settings" aria-labelledby="gs-h">
              <h2 id="gs-h" className="section-title">Group</h2>
              <div className="row">
                <Button icon={<Pencil size={16} aria-hidden />} onClick={() => setEditingGroup(true)}>Edit name, icon or currency</Button>
                <Button icon={<Download size={16} aria-hidden />} onClick={exportCsv}>Export as CSV</Button>
                {group.isOwner ? (
                  <Button variant="danger" icon={<Trash2 size={16} aria-hidden />} onClick={() => setConfirm('delete')}>Delete group</Button>
                ) : (
                  <Button icon={<LogOut size={16} aria-hidden />} onClick={() => setConfirm('leave')}>Leave group</Button>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <button type="button" className="fab" aria-label="Add expense" onClick={() => setAdding(true)}><Plus size={24} aria-hidden /></button>

      <ExpenseDialog
        open={adding || !!editingExpense}
        onClose={() => {
          setAdding(false)
          setEditingExpense(undefined)
        }}
        group={group}
        expense={editingExpense}
      />
      <ExpenseDetail
        expense={viewing}
        group={group}
        onClose={() => setViewing(null)}
        onEdit={(e) => {
          setViewing(null)
          setEditingExpense(e)
        }}
      />
      <SettleDialog open={settle.open} preset={settle.preset} group={group} onClose={() => setSettle({ open: false })} />
      <GroupDialog open={editingGroup} group={group} onClose={() => setEditingGroup(false)} />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'delete' ? `Delete ${group.name}?` : `Leave ${group.name}?`}
        confirmLabel={confirm === 'delete' ? 'Delete group' : 'Leave group'}
        busy={del.isPending || leave.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const done = {
            onSuccess: () => {
              setConfirm(null)
              toast(confirm === 'delete' ? `Deleted ${group.name}` : `You left ${group.name}`)
              navigate('/')
            },
            onError: (e: Error) => {
              setConfirm(null)
              toast(e.message, 'error')
            },
          }
          if (confirm === 'delete') del.mutate(group.id, done)
          else leave.mutate(group.id, done)
        }}
      >
        <p>
          {confirm === 'delete'
            ? 'All expenses, payments and history in this group will be deleted for everyone. This can’t be undone.'
            : 'Your name stays on past expenses so everyone’s balances stay correct. You can rejoin later with the invite code.'}
        </p>
      </ConfirmDialog>
    </div>
  )
}
