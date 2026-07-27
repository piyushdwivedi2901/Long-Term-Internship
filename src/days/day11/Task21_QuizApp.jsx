import { useEffect, useRef, useState } from 'react'

/**
 * Day 11 — Task 21: Quiz App
 * Goal: Multiple-choice questions, score tracking, timer, results page.
 * Questions come from the free Open Trivia DB API (no key required).
 */
function decodeHtml(str) {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function Task21_QuizApp() {
  const [status, setStatus] = useState('loading') // loading | playing | error | finished
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch('https://opentdb.com/api.php?amount=5&type=multiple')
      .then((res) => res.json())
      .then((data) => {
        if (!data.results || data.results.length === 0) throw new Error('empty')
        const prepared = data.results.map((q) => ({
          question: decodeHtml(q.question),
          correct: decodeHtml(q.correct_answer),
          options: shuffle([...q.incorrect_answers.map(decodeHtml), decodeHtml(q.correct_answer)]),
        }))
        setQuestions(prepared)
        setStatus('playing')
      })
      .catch(() => setStatus('error'))
  }, [])

  // Countdown timer per question
  useEffect(() => {
    if (status !== 'playing') return
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
  }, [current, status])

  const goNext = (answer) => {
    clearInterval(timerRef.current)
    const q = questions[current]
    if (answer === q.correct) setScore((s) => s + 1)
    setSelected(null)
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1)
    } else {
      setStatus('finished')
    }
  }

  const handleSelect = (option) => {
    setSelected(option)
    setTimeout(() => goNext(option), 400)
  }

  const restart = () => {
    setCurrent(0)
    setScore(0)
    setSelected(null)
    setStatus('loading')
    fetch('https://opentdb.com/api.php?amount=5&type=multiple')
      .then((res) => res.json())
      .then((data) => {
        const prepared = data.results.map((q) => ({
          question: decodeHtml(q.question),
          correct: decodeHtml(q.correct_answer),
          options: shuffle([...q.incorrect_answers.map(decodeHtml), decodeHtml(q.correct_answer)]),
        }))
        setQuestions(prepared)
        setStatus('playing')
      })
      .catch(() => setStatus('error'))
  }

  return (
    <div className="task-section">
      <h2>Task 21: Quiz App</h2>

      {status === 'loading' && <p>Loading questions…</p>}
      {status === 'error' && <p className="error-text">Couldn't load questions. Try again shortly.</p>}

      {status === 'playing' && questions[current] && (
        <div className="quiz-box">
          <div className="quiz-meta">
            <span>Question {current + 1}/{questions.length}</span>
            <span>⏱ {timeLeft}s</span>
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

      {status === 'finished' && (
        <div className="card">
          <h4>Quiz complete!</h4>
          <p>Your score: {score} / {questions.length}</p>
          <button onClick={restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
