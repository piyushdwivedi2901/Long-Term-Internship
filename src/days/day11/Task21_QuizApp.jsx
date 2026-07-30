import { useEffect, useRef, useState } from 'react'
import { Trophy, Clock3, ListChecks } from 'lucide-react'

/**
 * Day 11 — Task 21: Quiz App
 * Goal: Multiple-choice questions, score tracking, timer, results page.
 * Questions come from the free Open Trivia DB API (no key required).
 *
 * Extended with a setup screen (category + difficulty, both pulled into
 * the API query), a progress bar across the top, and a final review list
 * showing which answers were right/wrong — not just a bare score number.
 */
const CATEGORIES = [
  { id: 9, name: 'General Knowledge' },
  { id: 18, name: 'Computers' },
  { id: 21, name: 'Sports' },
  { id: 23, name: 'History' },
]
const DIFFICULTIES = ['easy', 'medium', 'hard']

function decodeHtml(str) {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function Task21_QuizApp() {
  const [stage, setStage] = useState('setup') // setup | loading | playing | error | finished
  const [category, setCategory] = useState(9)
  const [difficulty, setDifficulty] = useState('easy')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [review, setReview] = useState([])
  const timerRef = useRef(null)

  const startQuiz = () => {
    setStage('loading')
    fetch(`https://opentdb.com/api.php?amount=5&type=multiple&category=${category}&difficulty=${difficulty}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.results || data.results.length === 0) throw new Error('empty')
        const prepared = data.results.map((q) => ({
          question: decodeHtml(q.question),
          correct: decodeHtml(q.correct_answer),
          options: shuffle([...q.incorrect_answers.map(decodeHtml), decodeHtml(q.correct_answer)]),
        }))
        setQuestions(prepared)
        setCurrent(0)
        setScore(0)
        setReview([])
        setStage('playing')
      })
      .catch(() => setStage('error'))
  }

  useEffect(() => {
    if (stage !== 'playing') return
    setTimeLeft(15)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          goNext(null)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, stage])

  const goNext = (answer) => {
    clearInterval(timerRef.current)
    const q = questions[current]
    const isCorrect = answer === q.correct
    if (isCorrect) setScore((s) => s + 1)
    setReview((r) => [...r, { question: q.question, given: answer, correct: q.correct, isCorrect }])
    setSelected(null)
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1)
    } else {
      setStage('finished')
    }
  }

  const handleSelect = (option) => {
    setSelected(option)
    setTimeout(() => goNext(option), 400)
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>Quiz App</h2>
      <p className="task-goal">Category- and difficulty-aware trivia from Open Trivia DB, a 15-second timer per question, and a full answer review at the end.</p>

      {stage === 'setup' && (
        <div className="card" style={{ maxWidth: 380 }}>
          <p style={{ color: 'var(--text)', marginBottom: 10 }}>Set up your quiz</p>
          <div className="field-row">
            <label htmlFor="quiz-cat">Category</label>
            <select id="quiz-cat" className="select-input" value={category} onChange={(e) => setCategory(Number(e.target.value))}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="quiz-diff">Difficulty</label>
            <select id="quiz-diff" className="select-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="primary" onClick={startQuiz}>Start quiz</button>
        </div>
      )}

      {stage === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Loading questions…</span></div>
      )}
      {stage === 'error' && (
        <div>
          <p className="error-text">Couldn't load questions — the trivia API might be rate-limited.</p>
          <button onClick={() => setStage('setup')}>Back to setup</button>
        </div>
      )}

      {stage === 'playing' && questions[current] && (
        <div className="quiz-box">
          <div className="quiz-meta">
            <span><ListChecks size={12} className="icon-inline" />Question {current + 1}/{questions.length}</span>
            <span><Clock3 size={12} className="icon-inline" />{timeLeft}s</span>
          </div>
          <div className="progress-bar-track" style={{ marginBottom: 14 }}>
            <div className="progress-bar-fill" style={{ width: `${((current) / questions.length) * 100}%` }} />
          </div>
          <h4 dangerouslySetInnerHTML={{ __html: questions[current].question }} />
          <div className="quiz-options">
            {questions[current].options.map((opt) => (
              <button
                key={opt}
                disabled={selected !== null}
                className={selected === opt ? (opt === questions[current].correct ? 'correct' : 'incorrect') : ''}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'finished' && (
        <div className="card" style={{ maxWidth: 460 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={17} color="var(--accent-strong)" />Quiz complete</h4>
          <p className="cart-total" style={{ fontSize: '1.1rem' }}>Score: {score} / {questions.length}</p>
          <ul className="todo-list" style={{ marginTop: 12 }}>
            {review.map((r, i) => (
              <li key={i} className={r.isCorrect ? 'done' : ''} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span dangerouslySetInnerHTML={{ __html: r.question }} style={{ fontSize: '0.82rem', color: 'var(--text)' }} />
                <span className="hint">
                  {r.isCorrect ? '✅ Correct' : `❌ You: ${r.given ?? '(no answer)'} — Correct: ${r.correct}`}
                </span>
              </li>
            ))}
          </ul>
          <button className="primary" style={{ marginTop: 12 }} onClick={() => setStage('setup')}>Play again</button>
        </div>
      )}
    </div>
  )
}
