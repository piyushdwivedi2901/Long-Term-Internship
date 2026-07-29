import { useState } from 'react'
import { Package, ShoppingCart, X } from 'lucide-react'

/**
 * Day 7 — Task 13: Lifting State Up
 * Goal: Parent-child components sharing state — a shopping cart total
 * updated from a product list, with the total lifted to the common parent.
 *
 * Extended: each product now has a stock limit, so ProductList disables
 * "Add" once stock runs out — both children read from the same lifted
 * state to stay in sync (add button state + cart total), which is the
 * actual point of lifting state up.
 */
const products = [
  { id: 1, name: 'Wireless Mouse', price: 799, stock: 4 },
  { id: 2, name: 'Mechanical Keyboard', price: 2499, stock: 2 },
  { id: 3, name: 'USB-C Hub', price: 1199, stock: 5 },
]

function ProductList({ cart, onAdd }) {
  return (
    <ul className="product-list">
      {products.map((p) => {
        const inCart = cart[p.id] || 0
        const soldOut = inCart >= p.stock
        return (
          <li key={p.id}>
            <span>
              <Package size={13} className="icon-inline" />
              {p.name} — ₹{p.price}
              <span className="hint" style={{ marginLeft: 6 }}>({p.stock - inCart} left)</span>
            </span>
            <button className="primary" onClick={() => onAdd(p)} disabled={soldOut}>
              {soldOut ? 'Sold out' : `Add${inCart ? ` (${inCart})` : ''}`}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CartTotal({ cart, onClear }) {
  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0)
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  return (
    <div className="cart-summary">
      <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
        <ShoppingCart size={14} /> Cart
      </p>
      <p>Items: {itemCount}</p>
      <p className="cart-total">Total: ₹{total}</p>
      {itemCount > 0 && (
        <button onClick={onClear} style={{ marginTop: 8 }}><X size={12} className="icon-inline" />Clear cart</button>
      )}
    </div>
  )
}

export default function Task13_LiftingStateUp() {
  // State lives in the parent so both ProductList and CartTotal can read/update it
  const [cart, setCart] = useState({})

  const handleAdd = (product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
  }
  const handleClear = () => setCart({})

  return (
    <div className="task-section">
      <p className="task-eyebrow">Lifting State Up</p>
      <h2>Lifting State Up</h2>
      <p className="task-goal"><code>ProductList</code> and <code>CartTotal</code> are siblings — the cart state (and the stock limits derived from it) lives one level up, in their shared parent.</p>
      <div className="split-layout">
        <ProductList cart={cart} onAdd={handleAdd} />
        <CartTotal cart={cart} onClear={handleClear} />
      </div>
    </div>
  )
}
