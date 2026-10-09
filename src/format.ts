// Helpers de formatage fr-FR, calqués sur la maquette (« 08 h 52 », « 3 000 F CFA », « Lun. 2 nov. »).

const NBSP = / | /g

export const fcfa = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(NBSP, ' ') + ' F CFA'
export const fcfaShort = (n: number) => fcfa(n).replace(' CFA', '')

export const parseAmount = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Date locale au format ISO court (YYYY-MM-DD), sans décalage UTC. */
export function isoDay(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fromIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const hm = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${String(x.getHours()).padStart(2, '0')} h ${String(x.getMinutes()).padStart(2, '0')}`
}

export const minutesToHm = (mins: number) => `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`

const weekdayShort = (d: Date) => cap(d.toLocaleDateString('fr-FR', { weekday: 'short' }))
const monthShort = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' })

/** « 2 nov. » */
export const dayMonth = (iso: string) => {
  const d = fromIso(iso)
  return `${d.getDate()} ${monthShort(d)}`
}

/** « Lun. 2 nov. » */
export const dayShort = (iso: string) => `${weekdayShort(fromIso(iso))} ${dayMonth(iso)}`

/** « Vendredi 9 octobre » */
export const dayLong = (d: Date = new Date()) =>
  cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))

/** « Octobre 2026 » */
export const monthYear = (d: Date = new Date()) => cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))

/** « 23 – 27 déc. » ou « Lun. 21 sept. » pour un seul jour. */
export function range(from: string, to: string) {
  if (!to || from === to) return dayShort(from)
  const a = fromIso(from), b = fromIso(to)
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${monthShort(b)}`
  return `${dayMonth(from)} – ${dayMonth(to)}`
}

/** Jours ouvrés entre départ (inclus) et retour (exclu). */
export function workDays(from: string, to: string) {
  let n = 0
  const d = fromIso(from), end = fromIso(to)
  while (d < end) {
    const w = d.getDay()
    if (w !== 0 && w !== 6) n++
    d.setDate(d.getDate() + 1)
  }
  return Math.max(n, 1)
}

/** « À l'instant », « Aujourd'hui », « Hier », sinon « Mar. 6 oct. » */
export function relDay(isoDate: string) {
  const dayOnly = isoDate.length === 10
  const d = dayOnly ? fromIso(isoDate) : new Date(isoDate)
  const ago = Date.now() - d.getTime()
  if (!dayOnly && ago >= 0 && ago < 5 * 60_000) return "À l'instant"
  const today = isoDay(), day = isoDay(d)
  if (day === today) return "Aujourd'hui"
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (day === isoDay(y)) return 'Hier'
  return dayShort(day)
}

export const isToday = (iso: string) => iso.slice(0, 10) === isoDay()
