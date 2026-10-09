import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_LABELS } from '../../../shared/schemas.ts'
import { formatMoney } from '../../../shared/money.ts'
import type { Expense, GroupDetail } from '../../../shared/types.ts'
import { useDeleteExpense } from '../../api/hooks.ts'
import { formatFullDay, timeAgo } from '../../lib/dates.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Avatar, CategoryIcon } from '../../ui/bits.tsx'
import { Button } from '../../ui/Button.tsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.tsx'
import { Modal } from '../../ui/Modal.tsx'

const SPLIT_LABELS = { equal: 'Split equally', exact: 'Split by exact amounts', percent: 'Split by percentage', shares: 'Split by shares' }

export function ExpenseDetail({ expense, group, onClose, onEdit }: { expense: Expense | null; group: GroupDetail; onClose(): void; onEdit(e: Expense): void }) {
  const remove = useDeleteExpense(group.id)
  const toast = useUi((s) => s.toast)
  const [confirming, setConfirming] = useState(false)
  const member = (id: number) => group.members.find((m) => m.id === id)
  const e = expense

  return (
    <Modal open={!!e} onClose={onClose} title={e?.description ?? ''} description={e ? `${formatFullDay(e.date)} · ${CATEGORY_LABELS[e.category]}` : undefined} size="md" sheet>
      {e && (
        <div className="stack">
          <div className="receipt">
            <CategoryIcon category={e.category} size={22} />
            <p className="receipt__amount">{formatMoney(e.amount, group.currency)}</p>
            <p className="muted">Paid by <strong>{member(e.paidBy)?.isYou ? 'you' : member(e.paidBy)?.name}</strong> · {SPLIT_LABELS[e.split.type]}</p>
          </div>
          <ul className="breakdown" aria-label="Who owes what">
            {e.shares.map((s) => {
              const m = member(s.memberId)
              const name = m?.isYou ? 'You' : (m?.name ?? 'Unknown')
              const extra =
                e.split.type === 'percent'
                  ? ` (${(e.split.percents.find((p) => p.memberId === s.memberId)!.basisPoints / 100).toString()}%)`
                  : e.split.type === 'shares'
                    ? ` (${e.split.shares.find((p) => p.memberId === s.memberId)!.shares} share${e.split.shares.find((p) => p.memberId === s.memberId)!.shares === 1 ? '' : 's'})`
                    : ''
              return (
                <li key={s.memberId}>
                  <Avatar name={m?.name ?? '?'} size={28} you={m?.isYou} />
                  <span>{name}{extra}</span>
                  <span className="amount">{formatMoney(s.amount, group.currency)}</span>
                </li>
              )
            })}
          </ul>
          {e.notes && <p className="notes">{e.notes}</p>}
          <p className="muted small">Added by {e.createdByName} · {timeAgo(e.createdAt)}{e.updatedAt !== e.createdAt ? ` · edited ${timeAgo(e.updatedAt)}` : ''}</p>
          {e.canEdit ? (
            <div className="row">
              <Button icon={<Pencil size={16} aria-hidden />} onClick={() => onEdit(e)}>Edit</Button>
              <Button variant="ghost" icon={<Trash2 size={16} aria-hidden />} onClick={() => setConfirming(true)}>Delete</Button>
            </div>
          ) : (
            <p className="muted small">Only {e.createdByName} or the group creator can change this expense.</p>
          )}
          <ConfirmDialog
            open={confirming}
            title="Delete this expense?"
            confirmLabel="Delete expense"
            busy={remove.isPending}
            onCancel={() => setConfirming(false)}
            onConfirm={() =>
              remove.mutate(e.id, {
                onSuccess: () => {
                  setConfirming(false)
                  onClose()
                  toast(`Deleted “${e.description}”`)
                },
                onError: (err) => toast(err.message, 'error'),
              })
            }
          >
            <p>“{e.description}” ({formatMoney(e.amount, group.currency)}) will be removed and everyone's balances recalculated.</p>
          </ConfirmDialog>
        </div>
      )}
    </Modal>
  )
}
