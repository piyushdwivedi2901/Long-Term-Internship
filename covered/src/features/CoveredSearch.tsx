import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import type { ItemSummary } from '../../shared/types.ts'
import { quickAnswer, searchItems } from '../lib/search.ts'
import { CategoryIcon } from '../ui/bits.tsx'

/**
 * The question people actually have when something breaks: "is it still
 * covered?" Type anything — "fridge", "AC", a brand or a serial number.
 */
export function CoveredSearch({ items }: { items: ItemSummary[] }) {
  const [q, setQ] = useState('')
  const resultsId = useId()
  const results = useMemo(() => searchItems(items, q).slice(0, 5), [items, q])
  const asked = q.trim().length > 0

  return (
    <section className="ask" aria-labelledby="ask-title">
      <div>
        <h2 id="ask-title" className="ask__title">Is it covered?</h2>
        <p className="muted small">Search by name, brand, room or serial number — “fridge” and “AC” work too.</p>
      </div>
      <form role="search" className="ask__box" onSubmit={(e) => e.preventDefault()}>
        <Search size={20} aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What broke?"
          aria-label="Search your things"
          aria-controls={resultsId}
          autoComplete="off"
          enterKeyHint="search"
        />
      </form>
      <div id={resultsId} aria-live="polite">
        {asked && results.length === 0 && <p className="ask__none">Nothing matches “{q.trim()}”. Check the spelling, or add it to Covered.</p>}
        {results.length > 0 && (
          <ul className="answers">
            {results.map((i) => {
              const a = quickAnswer(i)
              return (
                <li key={i.id}>
                  <Link to={`/items/${i.id}`} className={`answer answer--${a.tone}`}>
                    <CategoryIcon category={i.category} size={18} />
                    <span className="answer__main">
                      <span className="answer__item">{i.name}{i.brand && <span className="muted"> · {i.brand}</span>}</span>
                      <strong className="answer__headline">{a.headline}</strong>
                      <span className="answer__detail">{a.detail}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden className="answer__go" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
