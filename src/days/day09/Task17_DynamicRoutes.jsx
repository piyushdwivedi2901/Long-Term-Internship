import { MemoryRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'

/**
 * Day 9 — Task 17: Dynamic Routes
 * Goal: Product listing page → click a product → detail page using route params.
 */
const products = [
  { id: 'p1', name: 'Noise-Cancelling Headphones', price: 5999, desc: 'Over-ear, 30hr battery, active noise cancellation.' },
  { id: 'p2', name: 'Smart Watch', price: 3499, desc: 'Heart-rate tracking, 7-day battery, AMOLED display.' },
  { id: 'p3', name: 'Portable SSD 1TB', price: 6999, desc: 'USB-C, 1050MB/s read speed, pocket-sized.' },
]

function ProductListPage() {
  return (
    <div>
      <h4>Products</h4>
      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id}>
            <Link to={`/product/${p.id}`}>{p.name}</Link> — ₹{p.price}
          </li>
        ))}
      </ul>
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
        <button onClick={() => navigate('/')}>Back to list</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => navigate('/')}>← Back to list</button>
      <h4>{product.name}</h4>
      <p>₹{product.price}</p>
      <p>{product.desc}</p>
    </div>
  )
}

export default function Task17_DynamicRoutes() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Dynamic Routes</p>
      <h2>Dynamic Routes</h2>
      <p className="task-goal">A product list links to <code>/product/:productId</code>; the detail page reads that id straight out of the URL with <code>useParams</code>.</p>
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
