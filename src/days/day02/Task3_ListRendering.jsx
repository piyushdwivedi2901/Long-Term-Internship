/**
 * Day 2 — Task 3: List Rendering
 * Goal: Given an array of objects (10 movies), render them using .map()
 * with proper `key` props.
 */
const movies = [
  { id: 1, title: 'Inception', year: 2010, rating: 8.8 },
  { id: 2, title: 'The Matrix', year: 1999, rating: 8.7 },
  { id: 3, title: 'Interstellar', year: 2014, rating: 8.6 },
  { id: 4, title: 'Parasite', year: 2019, rating: 8.5 },
  { id: 5, title: 'The Dark Knight', year: 2008, rating: 9.0 },
  { id: 6, title: 'Whiplash', year: 2014, rating: 8.5 },
  { id: 7, title: 'Spirited Away', year: 2001, rating: 8.6 },
  { id: 8, title: 'The Prestige', year: 2006, rating: 8.5 },
  { id: 9, title: 'Arrival', year: 2016, rating: 7.9 },
  { id: 10, title: 'Coco', year: 2017, rating: 8.4 },
]

export default function Task3_ListRendering() {
  return (
    <div className="task-section">
      <h2>Task 3: List Rendering</h2>
      <ul className="movie-list">
        {movies.map((movie) => (
          <li key={movie.id} className="movie-item">
            <span className="movie-title">{movie.title}</span>
            <span className="movie-year">{movie.year}</span>
            <span className="movie-rating">⭐ {movie.rating}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
