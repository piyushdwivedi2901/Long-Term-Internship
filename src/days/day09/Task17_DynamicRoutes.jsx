import { MemoryRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Tag } from 'lucide-react'

/**
 * Day 9 — Task 17: Dynamic Routes
 * Goal: Product listing page → click a product → detail page using route params.
 *
 * Extended with categories and a "related products" section on the detail
 * page (same category, different id) — a realistic reason a detail route
 * needs its param, since it drives more than just the title being shown.
 */
const products = [
  { id: 'p1', name: 'Noise-Cancelling Headphones', price: 5999, category: 'Audio', desc: 'Over-ear, 30hr battery, active noise cancellation.' },
  { id: 'p2', name: 'Smart Watch', price: 3499, category: 'Wearables', desc: 'Heart-rate tracking, 7-day battery, AMOLED display.' },
  { id: 'p3', name: 'Portable SSD 1TB', price: 6999, category: 'Storage', desc: 'USB-C, 1050MB/s read speed, pocket-sized.' },
  { id: 'p4', name: 'Wireless Earbuds', price: 2499, category: 'Audio', desc: 'True wireless, 24hr with case, sweat resistant.' },
  { id: 'p5', name: 'Fitness Band', price: 1799, category: 'Wearables', desc: 'Sleep tracking, 10-day battery, water resistant.' },
]

function ProductListPage() {
  const categories = [...new Set(products.map((p) => p.category))]
  return (
    <div>
      <h4>Products</h4>
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <p className="pill" style={{ marginBottom: 6 }}><Tag size={11} />{cat}</p>
          <ul className="product-list">
            {products.filter((p) => p.category === cat).map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.id}`}>{p.name}</Link>
                <span>₹{p.price}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.id === productId)

  if (!product) {
    return (
      <div>
        <p>Product not found.</p>
        <button onClick={() => navigate('/')}><ArrowLeft size={13} className="icon-inline" />Back to list</button>
      </div>
    )
  }

  const related = products.filter((p) => p.category === product.category && p.id !== product.id)

  return (
    <div>
      <button onClick={() => navigate('/')}><ArrowLeft size={13} className="icon-inline" />Back to list</button>
      <h4 style={{ marginTop: 12 }}>{product.name}</h4>
      <p className="pill" style={{ marginBottom: 8 }}><Tag size={11} />{product.category}</p>
      <p className="cart-total" style={{ margin: '4px 0' }}>₹{product.price}</p>
      <p>{product.desc}</p>

      {related.length > 0 && (
        <>
          <p className="hint" style={{ marginTop: 14 }}>More in {product.category}</p>
          <ul className="product-list">
            {related.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.id}`}>{p.name}</Link>
                <span>₹{p.price}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default function Task17_DynamicRoutes() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Dynamic Routes</p>
      <h2>Dynamic Routes</h2>
      <p className="task-goal">A product list links to <code>/product/:productId</code>; the detail page reads that id with <code>useParams</code> and uses it to find related items too.</p>
      <MemoryRouter initialEntries={['/']}>
        <div className="router-page">
          <Routes>
            <Route path="/" element={<ProductListPage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
          </Routes>
        </div>
      </MemoryRouter>
    </div>
  )
}
