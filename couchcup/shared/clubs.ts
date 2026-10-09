/**
 * Clubs people pick in football games, with an approximate strength tier
 * (5★ = the best). Tiers are Couch Cup's own rough grouping for fair random
 * picks — not official game ratings, which change every season. Players can
 * always type any club or team that isn't listed.
 */
export interface Club {
  name: string
  /** short scoreboard code */
  code: string
  league: string
  /** 3 – 5 in half steps */
  stars: number
}

export const CLUBS: Club[] = [
  // 5★
  { name: 'Real Madrid', code: 'RMA', league: 'LaLiga', stars: 5 },
  { name: 'Manchester City', code: 'MCI', league: 'Premier League', stars: 5 },
  { name: 'Bayern Munich', code: 'BAY', league: 'Bundesliga', stars: 5 },
  { name: 'Barcelona', code: 'BAR', league: 'LaLiga', stars: 5 },
  { name: 'Liverpool', code: 'LIV', league: 'Premier League', stars: 5 },
  { name: 'Arsenal', code: 'ARS', league: 'Premier League', stars: 5 },
  { name: 'Paris Saint-Germain', code: 'PSG', league: 'Ligue 1', stars: 5 },
  { name: 'Inter', code: 'INT', league: 'Serie A', stars: 5 },
  { name: 'France', code: 'FRA', league: 'National teams', stars: 5 },
  { name: 'England', code: 'ENG', league: 'National teams', stars: 5 },
  { name: 'Spain', code: 'ESP', league: 'National teams', stars: 5 },
  // 4.5★
  { name: 'Atlético Madrid', code: 'ATM', league: 'LaLiga', stars: 4.5 },
  { name: 'Bayer Leverkusen', code: 'B04', league: 'Bundesliga', stars: 4.5 },
  { name: 'Borussia Dortmund', code: 'BVB', league: 'Bundesliga', stars: 4.5 },
  { name: 'Chelsea', code: 'CHE', league: 'Premier League', stars: 4.5 },
  { name: 'Manchester United', code: 'MUN', league: 'Premier League', stars: 4.5 },
  { name: 'Tottenham Hotspur', code: 'TOT', league: 'Premier League', stars: 4.5 },
  { name: 'Newcastle United', code: 'NEW', league: 'Premier League', stars: 4.5 },
  { name: 'Juventus', code: 'JUV', league: 'Serie A', stars: 4.5 },
  { name: 'AC Milan', code: 'MIL', league: 'Serie A', stars: 4.5 },
  { name: 'Napoli', code: 'NAP', league: 'Serie A', stars: 4.5 },
  { name: 'Brazil', code: 'BRA', league: 'National teams', stars: 4.5 },
  { name: 'Argentina', code: 'ARG', league: 'National teams', stars: 4.5 },
  { name: 'Germany', code: 'GER', league: 'National teams', stars: 4.5 },
  { name: 'Portugal', code: 'POR', league: 'National teams', stars: 4.5 },
  // 4★
  { name: 'Aston Villa', code: 'AVL', league: 'Premier League', stars: 4 },
  { name: 'Atalanta', code: 'ATA', league: 'Serie A', stars: 4 },
  { name: 'AS Roma', code: 'ROM', league: 'Serie A', stars: 4 },
  { name: 'Lazio', code: 'LAZ', league: 'Serie A', stars: 4 },
  { name: 'RB Leipzig', code: 'RBL', league: 'Bundesliga', stars: 4 },
  { name: 'Real Sociedad', code: 'RSO', league: 'LaLiga', stars: 4 },
  { name: 'Athletic Club', code: 'ATH', league: 'LaLiga', stars: 4 },
  { name: 'Villarreal', code: 'VIL', league: 'LaLiga', stars: 4 },
  { name: 'Benfica', code: 'BEN', league: 'Liga Portugal', stars: 4 },
  { name: 'FC Porto', code: 'FCP', league: 'Liga Portugal', stars: 4 },
  { name: 'Sporting CP', code: 'SCP', league: 'Liga Portugal', stars: 4 },
  { name: 'Marseille', code: 'OM', league: 'Ligue 1', stars: 4 },
  { name: 'Monaco', code: 'ASM', league: 'Ligue 1', stars: 4 },
  { name: 'Brighton', code: 'BHA', league: 'Premier League', stars: 4 },
  { name: 'West Ham United', code: 'WHU', league: 'Premier League', stars: 4 },
  { name: 'Netherlands', code: 'NED', league: 'National teams', stars: 4 },
  { name: 'Italy', code: 'ITA', league: 'National teams', stars: 4 },
  { name: 'Belgium', code: 'BEL', league: 'National teams', stars: 4 },
  // 3.5★
  { name: 'Galatasaray', code: 'GAL', league: 'Süper Lig', stars: 3.5 },
  { name: 'Fenerbahçe', code: 'FEN', league: 'Süper Lig', stars: 3.5 },
  { name: 'Ajax', code: 'AJA', league: 'Eredivisie', stars: 3.5 },
  { name: 'PSV', code: 'PSV', league: 'Eredivisie', stars: 3.5 },
  { name: 'Feyenoord', code: 'FEY', league: 'Eredivisie', stars: 3.5 },
  { name: 'Lyon', code: 'OL', league: 'Ligue 1', stars: 3.5 },
  { name: 'Lille', code: 'LIL', league: 'Ligue 1', stars: 3.5 },
  { name: 'Real Betis', code: 'BET', league: 'LaLiga', stars: 3.5 },
  { name: 'Sevilla', code: 'SEV', league: 'LaLiga', stars: 3.5 },
  { name: 'Fiorentina', code: 'FIO', league: 'Serie A', stars: 3.5 },
  { name: 'Eintracht Frankfurt', code: 'SGE', league: 'Bundesliga', stars: 3.5 },
  { name: 'Celtic', code: 'CEL', league: 'Scottish Premiership', stars: 3.5 },
  { name: 'Al Nassr', code: 'NAS', league: 'Saudi Pro League', stars: 3.5 },
  { name: 'Al Hilal', code: 'HIL', league: 'Saudi Pro League', stars: 3.5 },
  { name: 'Croatia', code: 'CRO', league: 'National teams', stars: 3.5 },
  { name: 'Uruguay', code: 'URU', league: 'National teams', stars: 3.5 },
  // 3★
  { name: 'Rangers', code: 'RAN', league: 'Scottish Premiership', stars: 3 },
  { name: 'Inter Miami', code: 'MIA', league: 'MLS', stars: 3 },
  { name: 'LA Galaxy', code: 'LAG', league: 'MLS', stars: 3 },
  { name: 'Club Brugge', code: 'BRU', league: 'Belgian Pro League', stars: 3 },
  { name: 'Boca Juniors', code: 'BOC', league: 'Liga Profesional', stars: 3 },
  { name: 'River Plate', code: 'RIV', league: 'Liga Profesional', stars: 3 },
  { name: 'Flamengo', code: 'FLA', league: 'Brasileirão', stars: 3 },
  { name: 'Mohun Bagan', code: 'MBS', league: 'Indian Super League', stars: 3 },
  { name: 'Kerala Blasters', code: 'KBF', league: 'Indian Super League', stars: 3 },
  { name: 'Bengaluru FC', code: 'BFC', league: 'Indian Super League', stars: 3 },
]

const byName = new Map(CLUBS.map((c) => [c.name.toLowerCase(), c]))
export const findClub = (name: string): Club | undefined => byName.get(name.trim().toLowerCase())

/** "Real Madrid" → "RMA"; an unlisted club gets its first three letters. */
export function clubCode(name: string): string {
  const known = findClub(name)
  if (known) return known.code
  const letters = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim()
  const words = letters.split(/\s+/).filter(Boolean)
  if (words.length >= 3) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
  return letters.replace(/\s+/g, '').slice(0, 3).toUpperCase() || '—'
}

export const TIERS = [5, 4.5, 4, 3.5, 3] as const

/**
 * A fair spin: both players get different clubs from the same tier, avoiding
 * the clubs each of them used most recently when possible.
 */
export function fairSpin(stars: number, random: () => number, avoid: string[] = []): [Club, Club] {
  const pool = CLUBS.filter((c) => c.stars === stars)
  if (pool.length < 2) throw new Error(`Not enough ${stars}★ clubs`)
  const fresh = pool.filter((c) => !avoid.includes(c.name))
  const from = fresh.length >= 2 ? fresh : pool
  const i = Math.floor(random() * from.length)
  let j = Math.floor(random() * (from.length - 1))
  if (j >= i) j++
  return [from[i], from[j]]
}
