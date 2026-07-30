import { useEffect, useState } from 'react'
import { MemoryRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { Heart, Search } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'

/**
 * Day 11 — Task 22: Recipe Search App
 * Goal: Search + filter + detail view + routing, using a public API.
 * Uses TheMealDB's free, no-key-required API.
 *
 * Extended with a category dropdown (a second, independent filter
 * endpoint) and a favorites list persisted to localStorage via the
 * useFetch-adjacent useLocalStorage hook from Task 14 — reused here
 * rather than reinvented.
 */
function useFavorites() {
  return useLocalStorage('task22-favorites', [])
}

function SearchPage() {
  const [query, setQuery] = useState('chicken')
  const [meals, setMeals] = useState([])
  const [status, setStatus] = useState('idle')
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [favorites, setFavorites] = useFavorites()

  useEffect(() => {
    fetch('https://www.themealdb.com/api/json/v1/1/list.php?c=list')
      .then((res) => res.json())
      .then((data) => setCategories((data.meals || []).map((m) => m.strCategory)))
      .catch(() => {})
  }, [])

  const search = async (e) => {
    e?.preventDefault()
    setStatus('loading')
    try {
      const url = category
        ? `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
        : `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
      const res = await fetch(url)
      const data = await res.json()
      setMeals(data.meals || [])
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const toggleFavorite = (id) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  }

  return (
    <div>
      <form onSubmit={search} className="search-form">
        <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
          <input style={{ paddingLeft: 30, width: '100%' }} value={query} onChange={(e) => { setQuery(e.target.value); setCategory('') }} placeholder="Search a recipe…" />
        </div>
        <select className="select-input" value={category} onChange={(e) => { setCategory(e.target.value); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="primary" type="submit">Search</button>
      </form>

      {favorites.length > 0 && (
        <p className="hint"><Heart size={12} className="icon-inline" color="var(--danger)" />{favorites.length} favorite{favorites.length === 1 ? '' : 's'} saved</p>
      )}

      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Searching…</span></div>
      )}
      {status === 'error' && <p className="error-text">Search failed — try again.</p>}
      {status === 'success' && meals.length === 0 && <p className="empty-state">No recipes match "{query}" — try another search term.</p>}
      <div className="recipe-grid">
        {meals.map((m) => (
          <div key={m.idMeal} style={{ position: 'relative' }}>
            <Link to={`/recipe/${m.idMeal}`} className="recipe-card">
              <img src={m.strMealThumb} alt={m.strMeal} />
              <p>{m.strMeal}</p>
            </Link>
            <button
              className="icon-btn"
              onClick={() => toggleFavorite(m.idMeal)}
              aria-label={favorites.includes(m.idMeal) ? 'Remove favorite' : 'Add favorite'}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(16,18,26,0.7)' }}
            >
              <Heart size={13} fill={favorites.includes(m.idMeal) ? 'var(--danger)' : 'none'} color="var(--danger)" />
            </button>
          </div>
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
  const [favorites, setFavorites] = useFavorites()

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

  const isFav = favorites.includes(meal.idMeal)
  const ingredients = Array.from({ length: 20 }, (_, i) => {
    const ing = meal[`strIngredient${i + 1}`]
    const measure = meal[`strMeasure${i + 1}`]
    return ing && ing.trim() ? `${ing} — ${measure}` : null
  }).filter(Boolean)

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => navigate('/')}>← Back to search</button>
        <button onClick={() => setFavorites((f) => (isFav ? f.filter((x) => x !== meal.idMeal) : [...f, meal.idMeal]))}>
          <Heart size={13} className="icon-inline" fill={isFav ? 'var(--danger)' : 'none'} color="var(--danger)" />
          {isFav ? 'Saved' : 'Save recipe'}
        </button>
      </div>
      <h4>{meal.strMeal}</h4>
      <p className="pill" style={{ marginBottom: 8 }}>{meal.strCategory} · {meal.strArea}</p>
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
      <p className="task-eyebrow">Mini Project</p>
      <h2>Recipe Search App</h2>
      <p className="task-goal">Search TheMealDB by name or category, open a detail route, and save favorites — persisted to localStorage across reloads.</p>
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
