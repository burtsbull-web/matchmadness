import type { Team } from './types'

export const ROUND_LABELS = [
  'Round of 43',
  'Round of 32',
  'Round of 11',
  'Elite 6',
  'Final 3',
  'Championship',
]

export const LB_ROUND_LABELS = [
  'LB Round 1',
  'LB Round 2',
  'LB Round 3',
  'LB Semis',
  'LB Final',
]

export const ROUND_SHORT_LABELS = ['R43', 'R32', 'R11', 'E6', 'F3', 'Final']
export const LB_ROUND_SHORT_LABELS = ['LB1', 'LB2', 'LB3', 'LB SF', 'LB F']

export const WB_ACCENT = '#FA8D29'
export const LB_ACCENT = '#E25353'
export const WB_TEAL = '#007573'

export const ROUND_DAYS = [4, 4, 4, 3, 2, 1]

export const SLOT_H = 28
export const SLOT_W = 148
export const COL_GAP = 42
export const PAD_TOP = 52
export const PAD_LEFT = 10
export const MATCH_GAP = 8

export const DEFAULT_TEAMS: Team[] = [
  { s: 1, dm: 'Anthony Leija', n: 'Michigan West' },
  { s: 2, dm: 'Rod Robles', n: 'Phoenix West' },
  { s: 3, dm: 'Brian Connelly', n: 'Eastern Washington' },
  { s: 4, dm: 'Joe Pennington', n: 'Idaho' },
  { s: 5, dm: 'Noah Gregg', n: 'Phoenix East' },
  { s: 6, dm: 'Sylvia Espinoza', n: 'NorCal Nevada' },
  { s: 7, dm: 'Paul Aispuro Rios', n: 'Inland Empire' },
  { s: 8, dm: 'Edward Antonelli', n: 'Wichita Tulsa' },
  { s: 9, dm: 'Carlos Lozano', n: 'Minnesota South' },
  { s: 10, dm: 'Adda Raffo', n: 'South Florida' },
  { s: 11, dm: 'Noe Onofre', n: 'LA Central' },
  { s: 12, dm: 'Daniel John Greene', n: 'Michigan East' },
  { s: 13, dm: 'Andrew Fuerte Perez', n: 'The Bronx' },
  { s: 14, dm: 'Whitley Schnelle', n: 'West Missouri' },
  { s: 15, dm: 'Dhaval Patel', n: 'New Jersey' },
  { s: 16, dm: 'Amy Smith', n: 'Ohio' },
  { s: 17, dm: 'Cameron Seymore', n: 'Orange County' },
  { s: 18, dm: 'Christian Adams', n: 'Denver' },
  { s: 19, dm: 'Julia Ramos', n: 'Seattle' },
  { s: 20, dm: 'Kevin Salazar', n: 'Philadelphia' },
  { s: 21, dm: 'Eric Saucedo', n: 'Illinois North' },
  { s: 22, dm: 'Aaron Campbell', n: 'Central PA' },
  { s: 23, dm: 'Jazmin Cruz', n: 'NYC North' },
  { s: 24, dm: 'James Clark', n: 'Virginia' },
  { s: 25, dm: 'Malik Parra', n: 'Tucson' },
  { s: 26, dm: 'Jovanna Rojo', n: 'LA West' },
  { s: 27, dm: 'Joshua Ayala', n: 'Florida Coast' },
  { s: 28, dm: 'Brian Valle', n: 'Illinois South' },
  { s: 29, dm: 'James Clark', n: 'DMV' },
  { s: 30, dm: 'Mauricio Torres', n: 'Central Florida' },
  { s: 31, dm: 'Adam Stratton', n: 'North Florida' },
  { s: 32, dm: 'Raul Soler', n: 'NYC East' },
  { s: 33, dm: 'Mark Johnston', n: 'St. Louis South' },
  { s: 34, dm: 'Yamil Adames', n: 'UPNY West' },
  { s: 35, dm: 'Keith Gayne', n: 'Wisconsin North' },
  { s: 36, dm: 'Ivan Hilario Barinas', n: 'Atlanta' },
  { s: 37, dm: 'Nathan Vestal', n: 'Western PA' },
  { s: 38, dm: 'Keith Hafner', n: 'St. Louis North' },
  { s: 39, dm: 'Michael Toro', n: 'UPNY East' },
  { s: 40, dm: 'Carlos Lozano', n: 'Minnesota North' },
  { s: 41, dm: 'Maricela Luna', n: 'Wisconsin South' },
  { s: 42, dm: 'Roxana Sanchez', n: 'Rio Grande Valley' },
  { s: 43, dm: 'Oscar Rodriguez', n: 'Utah Oregon' },
]

export function getRoundDates(): Array<{ s: string; e: string }> {
  const start = new Date(2026, 2, 19)
  const dates: Array<{ s: string; e: string }> = []
  const cur = new Date(start)

  for (let i = 0; i < ROUND_DAYS.length; i++) {
    const sD = new Date(cur)
    const eD = new Date(cur)
    eD.setDate(eD.getDate() + ROUND_DAYS[i] - 1)
    dates.push({
      s: `${sD.getMonth() + 1}/${sD.getDate()}`,
      e: `${eD.getMonth() + 1}/${eD.getDate()}`,
    })
    cur.setDate(cur.getDate() + ROUND_DAYS[i])
  }

  return dates
}
