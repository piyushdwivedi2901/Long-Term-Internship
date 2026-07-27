import { useEffect, useState } from 'react'
import { MemoryRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'

/**
 * Day 11 — Task 22: Recipe Search App
 * Goal: Search + filter + detail view + routing, using a public API.
 * Uses TheMealDB's free, no-key-required API.
 */
function SearchPage() {
  const [query, setQuery] = useState('chicken')
  const [meals, setMeals] = useState([])
  const [status, setStatus] = useState('idle')

  const search = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setStatus('loading')
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      setMeals(data.meals || [])
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <form onSubmit={search} className="search-form">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a recipe…" />
        <button type="submit">Search</button>
      </form>
      {status === 'loading' && <p>Searching…</p>}
      {status === 'error' && <p className="error-text">Search failed. Try again.</p>}
      {status === 'success' && meals.length === 0 && <p className="empty-state">No recipes found.</p>}
      <div className="recipe-grid">
        {meals.map((m) => (
          <Link to={`/recipe/${m.idMeal}`} key={m.idMeal} className="recipe-card">
            <img src={m.strMealThumb} alt={m.strMeal} />
            <p>{m.strMeal}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meal, setMeal] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    setStatus('loading')
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMeal(data.meals?.[0] || null)
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'loading') return <p>Loading recipe…</p>
  if (status === 'error' || !meal) {
    return (
      <div>
        <p className="error-text">Recipe not found.</p>
        <button onClick={() => navigate('/')}>← Back</button>
      </div>
    )
  }

  const ingredients = Array.from({ length: 20 }, (_, i) => {
    const ing = meal[`strIngredient${i + 1}`]
    const measure = meal[`strMeasure${i + 1}`]
    return ing && ing.trim() ? `${ing} — ${measure}` : null
  }).filter(Boolean)

  return (
    <div>
      <button onClick={() => navigate('/')}>← Back to search</button>
      <h4>{meal.strMeal}</h4>
      <img src={meal.strMealThumb} alt={meal.strMeal} className="recipe-detail-img" />
      <h5>Ingredients</h5>
      <ul>{ingredients.map((i) => <li key={i}>{i}</li>)}</ul>
      <h5>Instructions</h5>
      <p className="recipe-instructions">{meal.strInstructions}</p>
    </div>
  )
}

export default function Task22_RecipeSearchApp() {
  return (
    <div className="task-section">
      <h2>Task 22: Recipe Search App</h2>
      <MemoryRouter initialEntries={['/']}>
        <div className="router-page">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </div>
      </MemoryRouter>
    </div>
  )
}
