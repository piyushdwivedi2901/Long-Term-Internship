import { useMemo, useRef, useState } from 'react'
import { ShoppingCart, Minus, Plus, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/Modal'

interface Product {
  id: number
  name: string
  price: number
}

export interface CartLine {
  id: number
  qty: number
}

const CATALOG: Product[] = [
  { id: 1, name: 'Backpack', price: 1899 },
  { id: 2, name: 'Water Bottle', price: 499 },
  { id: 3, name: 'Desk Lamp', price: 1299 },
  { id: 4, name: 'Notebook Set', price: 349 },
]

const TAX_RATE = 0.08

/** Pure money maths so the modal and the tests share one source of truth. */
export function cartTotals(lines: CartLine[], catalog: Product[] = CATALOG) {
  const subtotal = lines.reduce((sum, l) => {
    const product = catalog.find((p) => p.id === l.id)
    return sum + (product ? product.price * l.qty : 0)
  }, 0)
  const tax = Math.round(subtotal * TAX_RATE)
  return { subtotal, tax, total: subtotal + tax, count: lines.reduce((n, l) => n + l.qty, 0) }
}

type Step = 'cart' | 'done'

export default function Task32_Portals() {
  const [lines, setLines] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('cart')
  const [orderNo, setOrderNo] = useState('')
  const continueRef = useRef<HTMLButtonElement>(null)

  const totals = useMemo(() => cartTotals(lines), [lines])

  const add = (id: number) =>
    setLines((prev) =>
      prev.some((l) => l.id === id)
        ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { id, qty: 1 }],
    )

  const changeQty = (id: number, delta: number) =>
    setLines((prev) =>
      prev.flatMap((l) => (l.id !== id ? [l] : l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }])),
    )

  const openCart = () => {
    setStep('cart')
    setOpen(true)
  }

  const checkout = () => {
    setOrderNo(`ORD-${String(1000 + Math.floor(Math.random() * 9000))}`)
    setStep('done')
    setLines([])
  }

  const nameOf = (id: number) => CATALOG.find((p) => p.id === id)!.name
  const priceOf = (id: number) => CATALOG.find((p) => p.id === id)!.price

  return (
    <div className="task-section">
      <p className="task-eyebrow">Rendering</p>
      <h2>Portals — View Cart Modal</h2>
      <p className="task-goal">
        The cart opens in a <code>Modal</code> built with <code>createPortal</code>. The shop below is
        deliberately wrapped in a box with <code>overflow: hidden</code> — an inline modal would be
        clipped by it, but the portal renders into <code>document.body</code>.
      </p>

      <div className="portal-shop">
        <div className="portal-shop-bar">
          <strong>Tiny Shop</strong>
          <button type="button" onClick={openCart} aria-label={`View cart, ${totals.count} items`}>
            <ShoppingCart size={14} className="icon-inline" />
            View cart
            <span className="pill" style={{ marginLeft: 8 }}>{totals.count}</span>
          </button>
        </div>
        <ul className="product-list">
          {CATALOG.map((p) => (
            <li key={p.id}>
              <span>{p.name} — ₹{p.price}</span>
              <button className="primary" onClick={() => add(p.id)}>
                Add{' '}
                <span className="sr-only">{p.name} to cart</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={step === 'cart' ? 'Your cart' : 'Order placed'}
        initialFocusRef={step === 'done' ? continueRef : undefined}
        footer={
          step === 'cart' ? (
            <>
              <button type="button" onClick={() => setOpen(false)}>Keep shopping</button>
              <button type="button" className="primary" onClick={checkout} disabled={lines.length === 0}>
                Checkout · ₹{totals.total}
              </button>
            </>
          ) : (
            <button type="button" className="primary" ref={continueRef} onClick={() => setOpen(false)}>
              Continue shopping
            </button>
          )
        }
      >
        {step === 'cart' ? (
          lines.length === 0 ? (
            <p className="empty-state">Your cart is empty.</p>
          ) : (
            <>
              <ul className="cart-list">
                {lines.map((l) => (
                  <li key={l.id}>
                    <span>{nameOf(l.id)}</span>
                    <span className="qty-stepper">
                      <button type="button" className="icon-btn" aria-label={`Decrease ${nameOf(l.id)}`} onClick={() => changeQty(l.id, -1)}>
                        <Minus size={12} />
                      </button>
                      <span aria-live="polite" aria-label={`${nameOf(l.id)} quantity`}>{l.qty}</span>
                      <button type="button" className="icon-btn" aria-label={`Increase ${nameOf(l.id)}`} onClick={() => changeQty(l.id, 1)}>
                        <Plus size={12} />
                      </button>
                    </span>
                    <span>₹{priceOf(l.id) * l.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="cart-summary" style={{ marginTop: 12 }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{totals.subtotal}</span></p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax ({TAX_RATE * 100}%)</span><span>₹{totals.tax}</span></p>
                <p className="cart-total" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><span>₹{totals.total}</span></p>
              </div>
            </>
          )
        ) : (
          <div className="order-done" role="status">
            <CheckCircle2 size={28} />
            <p>Thanks! Your order <strong>{orderNo}</strong> is confirmed.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
