import { useState } from 'react'

/**
 * Day 10 — Task 19: Weather App
 * Goal: Search a city, fetch weather data, display results with
 * loading/error handling.
 *
 * Uses Open-Meteo (free, no API key required): geocoding to resolve a
 * city name to lat/lon, then the forecast endpoint for current weather.
 */
const WEATHER_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm',
}

export default function Task19_WeatherApp() {
  const [city, setCity] = useState('Mumbai')
  const [status, setStatus] = useState('idle')
  const [weather, setWeather] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const search = async (e) => {
    e.preventDefault()
    const query = city.trim()
    if (!query) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
      )
      const geoData = await geoRes.json()
      const place = geoData?.results?.[0]
      if (!place) {
        setStatus('error')
        setErrorMsg(`No location found for "${query}".`)
        return
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`
      )
      const weatherData = await weatherRes.json()

      setWeather({
        place: `${place.name}, ${place.country}`,
        temp: weatherData.current_weather.temperature,
        wind: weatherData.current_weather.windspeed,
        code: weatherData.current_weather.weathercode,
      })
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong fetching weather data.')
    }
  }

  return (
    <div className="task-section">
      <h2>Task 19: Weather App</h2>
      <form onSubmit={search} className="search-form">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter a city name…"
        />
        <button type="submit">Search</button>
      </form>

      {status === 'loading' && <p>Loading weather…</p>}
      {status === 'error' && <p className="error-text">{errorMsg}</p>}
      {status === 'success' && weather && (
        <div className="card weather-card">
          <h4>{weather.place}</h4>
          <p className="weather-temp">{weather.temp}°C</p>
          <p>{WEATHER_CODES[weather.code] ?? 'Unknown conditions'}</p>
          <p>Wind: {weather.wind} km/h</p>
        </div>
      )}
    </div>
  )
}
