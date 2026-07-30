import { useMemo, useState } from 'react'
import { Tag, ShoppingBag, Trash2 } from 'lucide-react'

/**
 * Day 10 — Task 20: E-commerce Cart
 * Goal: Product list, add to cart, update quantity, remove item,
 * calculate total.
 *
 * Extended with a coupon code field (validated against a small lookup
 * table), a tax line, and a full subtotal → discount → tax → total
 * breakdown — the kind of derived-state chain a real cart needs, all
 * still computed from the single source of truth (`cart`).
 */
const catalog = [
  { id: 1, name: 'Backpack', price: 1899 },
  { id: 2, name: 'Water Bottle', price: 499 },
  { id: 3, name: 'Desk Lamp', price: 1299 },
  { id: 4, name: 'Notebook Set', price: 349 },
]

const COUPONS = {
  SAVE10: 0.10,
  WELCOME20: 0.20,
}
const TAX_RATE = 0.08

export default function Task20_EcommerceCart() {
  const [cart, setCart] = useState([]) // [{ id, qty }]
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { id: product.id, qty: 1 }]
    })
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id))
      return
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)))
  }

  const removeItem = (id) => setCart((prev) => prev.filter((item) => item.id !== id))

  const applyCoupon = (e) => {
    e.preventDefault()
    const code = couponInput.trim().toUpperCase()
    if (COUPONS[code]) {
      setAppliedCoupon(code)
      setCouponError('')
    } else {
      setCouponError('Invalid code. Try SAVE10 or WELCOME20.')
      setAppliedCoupon(null)
    }
  }

  const cartWithDetails = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        product: catalog.find((p) => p.id === item.id),
      })),
    [cart]
  )

  const subtotal = useMemo(
    () => cartWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [cartWithDetails]
  )
  const discountRate = appliedCoupon ? COUPONS[appliedCoupon] : 0
  const discount = Math.round(subtotal * discountRate)
  const taxable = subtotal - discount
  const tax = Math.round(taxable * TAX_RATE)
  const total = taxable + tax

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>E-commerce Cart</h2>
      <p className="task-goal">Add items, adjust quantity inline, apply a coupon, and watch subtotal → discount → tax → total recompute — all derived from one cart array.</p>
      <div className="split-layout">
        <div>
          <h4><ShoppingBag size={15} className="icon-inline" />Catalog</h4>
          <ul className="product-list">
            {catalog.map((p) => (
              <li key={p.id}>
                <span>{p.name} — ₹{p.price}</span>
                <button className="primary" onClick={() => addToCart(p)}>Add to cart</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Cart</h4>
          {cartWithDetails.length === 0 && <p className="empty-state">Cart is empty.</p>}
          {cartWithDetails.length > 0 && (
            <>
              <ul className="cart-list">
                {cartWithDetails.map((item) => (
                  <li key={item.id}>
                    <span>{item.product.name}</span>
                    <input
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, Number(e.target.value))}
                      className="qty-input"
                    />
                    <span>₹{item.product.price * item.qty}</span>
                    <button className="icon-btn" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.product.name}`}>
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={applyCoupon} className="toolbar" style={{ marginTop: 10 }}>
                <input
                  className="search-input"
                  style={{ maxWidth: 160 }}
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button type="submit"><Tag size={13} className="icon-inline" />Apply</button>
              </form>
              {couponError && <p className="field-error">{couponError}</p>}
              {appliedCoupon && <p className="success-text" style={{ fontSize: '0.82rem' }}>{appliedCoupon} applied — {discountRate * 100}% off</p>}

              <div className="cart-summary" style={{ maxWidth: 260, marginTop: 12 }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{subtotal}</span></p>
                {discount > 0 && (
                  <p style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--done)' }}><span>Discount</span><span>−₹{discount}</span></p>
                )}
                <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax ({TAX_RATE * 100}%)</span><span>₹{tax}</span></p>
                <hr className="section-divider" style={{ margin: '8px 0' }} />
                <p className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}><span>Total</span><span>₹{total}</span></p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
