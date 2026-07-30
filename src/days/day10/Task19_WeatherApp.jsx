import { useState } from 'react'
import { Wind, Droplets, MapPin, Search } from 'lucide-react'

/**
 * Day 10 — Task 19: Weather App
 * Goal: Search a city, fetch weather data, display results with
 * loading/error handling.
 *
 * Uses Open-Meteo (free, no API key required): geocoding to resolve a
 * city name to lat/lon, then the forecast endpoint for current + daily
 * weather. Extended with a 3-day forecast strip, a °C/°F toggle, and a
 * recent-searches list for quicker re-checking.
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

function cToF(c) {
  return Math.round((c * 9) / 5 + 32)
}

export default function Task19_WeatherApp() {
  const [city, setCity] = useState('Mumbai')
  const [status, setStatus] = useState('idle')
  const [weather, setWeather] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [unit, setUnit] = useState('C')
  const [recent, setRecent] = useState([])

  const runSearch = async (query) => {
    if (!query.trim()) return
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
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=4`
      )
      const weatherData = await weatherRes.json()

      setWeather({
        place: `${place.name}, ${place.country}`,
        temp: weatherData.current_weather.temperature,
        wind: weatherData.current_weather.windspeed,
        code: weatherData.current_weather.weathercode,
        daily: weatherData.daily.time.slice(1, 4).map((date, i) => ({
          date,
          max: weatherData.daily.temperature_2m_max[i + 1],
          min: weatherData.daily.temperature_2m_min[i + 1],
          code: weatherData.daily.weathercode[i + 1],
        })),
      })
      setStatus('success')
      setRecent((r) => [query, ...r.filter((c) => c.toLowerCase() !== query.toLowerCase())].slice(0, 5))
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong fetching weather data.')
    }
  }

  const fmt = (c) => (unit === 'C' ? `${Math.round(c)}°C` : `${cToF(c)}°F`)

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>Weather App</h2>
      <p className="task-goal">Live current weather plus a 3-day outlook for any city — geocoded and fetched from Open-Meteo, a free API that needs no key.</p>

      <form onSubmit={(e) => { e.preventDefault(); runSearch(city) }} className="search-form">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
          <input
            style={{ paddingLeft: 30, width: '100%' }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter a city name…"
          />
        </div>
        <button className="primary" type="submit">Search</button>
        <div className="tab-group">
          {['C', 'F'].map((u) => (
            <button key={u} type="button" className={`tab-btn ${unit === u ? 'active' : ''}`} onClick={() => setUnit(u)}>°{u}</button>
          ))}
        </div>
      </form>

      {recent.length > 0 && (
        <div className="toolbar" style={{ marginTop: -6 }}>
          <span className="hint">Recent:</span>
          {recent.map((c) => (
            <button key={c} onClick={() => { setCity(c); runSearch(c) }} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>{c}</button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Loading weather…</span></div>
      )}
      {status === 'error' && <p className="error-text">{errorMsg}</p>}

      {status === 'success' && weather && (
        <div className="card weather-card" style={{ maxWidth: 420 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} />{weather.place}</h4>
          <p className="weather-temp">{fmt(weather.temp)}</p>
          <p>{WEATHER_CODES[weather.code] ?? 'Unknown conditions'}</p>
          <p className="hint" style={{ display: 'flex', gap: 14 }}>
            <span><Wind size={12} className="icon-inline" />{weather.wind} km/h</span>
            <span><Droplets size={12} className="icon-inline" />Forecast below</span>
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {weather.daily.map((d) => (
              <div key={d.date} className="stat-card" style={{ flex: 1, textAlign: 'center', padding: '10px 6px' }}>
                <div className="stat-card-label" style={{ justifyContent: 'center' }}>
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className="stat-card-value" style={{ fontSize: '0.95rem' }}>{fmt(d.max)}</div>
                <div className="hint">{fmt(d.min)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
