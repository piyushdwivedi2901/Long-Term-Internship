import { useMemo, useState } from 'react'
import { Check, Copy, Globe, Mail, Phone, Share2 } from 'lucide-react'
import type { ItemDetail } from '../../shared/types.ts'
import { formatDate } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Copyable } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { coverageAnswer } from '../../shared/warranty.ts'

/** The message to send a service centre — everything they will ask for, in order. */
export function claimMessage(item: ItemDetail, owner: string, remindDays: number, today: string): string {
  const product = [item.brand, item.model].filter(Boolean).join(' ')
  const live = item.coverages.filter((c) => c.state === 'active')
  const cover = live.length
    ? live.map((c) => `${c.kind === 'component' ? `${c.label} cover` : c.kind === 'extended' ? `Extended warranty${c.provider ? ` (${c.provider})` : ''}` : 'Standard warranty'} valid until ${formatDate(c.end)}`).join('; ')
    : coverageAnswer(item.coverages, today, remindDays).headline
  return [
    'Hello,',
    '',
    'I would like to register a service request for the product below.',
    '',
    `Product: ${product ? `${product} (${item.name})` : item.name}`,
    item.serialNo ? `Serial number: ${item.serialNo}` : null,
    `Purchased: ${formatDate(item.purchaseDate)}${item.store ? ` from ${item.store}` : ''}${item.invoiceNo ? `, invoice ${item.invoiceNo}` : ''}`,
    `Warranty: ${cover}`,
    'Problem: [describe what is wrong]',
    '',
    'I can share a copy of the invoice. Please let me know the next steps.',
    '',
    'Thank you,',
    owner,
  ]
    .filter((l) => l !== null)
    .join('\n')
}

/** Everything a service centre asks for, ready to copy, call or send. */
export function ClaimKit({ item, owner, remindDays, today }: { item: ItemDetail; owner: string; remindDays: number; today: string }) {
  const toast = useUi((s) => s.toast)
  const [copied, setCopied] = useState(false)
  const message = useMemo(() => claimMessage(item, owner, remindDays, today), [item, owner, remindDays, today])
  const copiedField = (label: string) => toast(`${label} copied`, 'success')
  const s = item.support
  const subject = `Service request: ${[item.brand, item.model].filter(Boolean).join(' ') || item.name}${item.serialNo ? ` (S/N ${item.serialNo})` : ''}`

  return (
    <section className="card kit" aria-labelledby="kit-title">
      <h2 id="kit-title" className="section-title">Claim kit</h2>
      <p className="muted small">What the service centre will ask for, ready to copy.</p>
      <dl className="kit__facts">
        {item.serialNo && <Copyable label="Serial number" value={item.serialNo} onCopied={copiedField} />}
        {item.invoiceNo && <Copyable label="Invoice number" value={item.invoiceNo} onCopied={copiedField} />}
        <Copyable label="Purchase date" value={formatDate(item.purchaseDate)} onCopied={copiedField} />
      </dl>
      {!item.serialNo && <p className="kit__warn">Add the serial number — almost every claim needs it.</p>}

      {(s.phone || s.email || s.website) && (
        <div className="kit__contact">
          {s.phone && (
            <a className="button button--sm" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
              <Phone size={15} aria-hidden /> <span>Call {s.phone}</span>
            </a>
          )}
          {s.email && (
            <a className="button button--sm" href={`mailto:${s.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}>
              <Mail size={15} aria-hidden /> <span>Email support</span>
            </a>
          )}
          {s.website && (
            <a className="button button--sm" href={s.website} target="_blank" rel="noopener noreferrer">
              <Globe size={15} aria-hidden /> <span>Support website</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}

      <details className="kit__message">
        <summary>Message for the service centre</summary>
        <pre>{message}</pre>
        <div className="row">
          <Button
            size="sm"
            icon={copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            onClick={() =>
              navigator.clipboard?.writeText(message).then(
                () => {
                  setCopied(true)
                  toast('Message copied — paste it into WhatsApp, email or the brand’s chat', 'success')
                  setTimeout(() => setCopied(false), 2000)
                },
                () => toast("Couldn't copy — select the text instead", 'error'),
              )
            }
          >
            {copied ? 'Copied' : 'Copy message'}
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button size="sm" icon={<Share2 size={15} aria-hidden />} onClick={() => navigator.share({ title: subject, text: message }).catch(() => {})}>
              Share
            </Button>
          )}
        </div>
      </details>
    </section>
  )
}
