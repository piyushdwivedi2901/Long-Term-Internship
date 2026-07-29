import { useState } from 'react'

/**
 * Day 7 — Task 13: Lifting State Up
 * Goal: Parent-child components sharing state — a shopping cart total
 * updated from a product list, with the total lifted to the common parent.
 */
const products = [
  { id: 1, name: 'Wireless Mouse', price: 799 },
  { id: 2, name: 'Mechanical Keyboard', price: 2499 },
  { id: 3, name: 'USB-C Hub', price: 1199 },
]

function ProductList({ cart, onAdd }) {
  return (
    <ul className="product-list">
      {products.map((p) => (
        <li key={p.id}>
          <span>{p.name} — ₹{p.price}</span>
          <button onClick={() => onAdd(p)}>
            Add {cart[p.id] ? `(${cart[p.id]})` : ''}
          </button>
        </li>
      ))}
    </ul>
  )
}

function CartTotal({ cart }) {
  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0)
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  return (
    <div className="cart-summary">
      <p>Items in cart: {itemCount}</p>
      <p>Total: ₹{total}</p>
    </div>
  )
}

export default function Task13_LiftingStateUp() {
  // State lives in the parent so both ProductList and CartTotal can read/update it
  const [cart, setCart] = useState({})

  const handleAdd = (product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Lifting State Up</p>
      <h2>Lifting State Up</h2>
      <p className="task-goal"><code>ProductList</code> and <code>CartTotal</code> are siblings — the cart state they both need lives one level up, in their shared parent.</p>
      <div className="split-layout">
        <ProductList cart={cart} onAdd={handleAdd} />
        <CartTotal cart={cart} />
      </div>
    </div>
  )
}
