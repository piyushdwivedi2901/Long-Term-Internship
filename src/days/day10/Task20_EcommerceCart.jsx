import { useMemo, useState } from 'react'

/**
 * Day 10 — Task 20: E-commerce Cart
 * Goal: Product list, add to cart, update quantity, remove item,
 * calculate total.
 */
const catalog = [
  { id: 1, name: 'Backpack', price: 1899 },
  { id: 2, name: 'Water Bottle', price: 499 },
  { id: 3, name: 'Desk Lamp', price: 1299 },
  { id: 4, name: 'Notebook Set', price: 349 },
]

export default function Task20_EcommerceCart() {
  const [cart, setCart] = useState([]) // [{ id, qty }]

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

  const cartWithDetails = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        product: catalog.find((p) => p.id === item.id),
      })),
    [cart]
  )

  const total = useMemo(
    () => cartWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [cartWithDetails]
  )

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>E-commerce Cart</h2>
      <p className="task-goal">Add items, adjust quantity inline, remove items, and watch the total recompute — all derived state, no duplicated totals to keep in sync.</p>
      <div className="split-layout">
        <div>
          <h4>Catalog</h4>
          <ul className="product-list">
            {catalog.map((p) => (
              <li key={p.id}>
                <span>{p.name} — ₹{p.price}</span>
                <button onClick={() => addToCart(p)}>Add to cart</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Cart</h4>
          {cartWithDetails.length === 0 && <p className="empty-state">Cart is empty.</p>}
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
                <button onClick={() => removeItem(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
          <p className="cart-total">Total: ₹{total}</p>
        </div>
      </div>
    </div>
  )
}
