import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type Announcement, type DayScans, type Leave, type LeaveStatus, type Move, type Notif, type PayMode, type Trip,
  FIXED_CHARGE, LATE_AFTER, PEOPLE, person, seedHistory, seedPresence, seedState,
} from './data'
import { dayMonth, fcfa, isoDay } from './format'

const KEY = 'teamhub:v1'

export interface State {
  userId: string | null
  scans: Record<string, DayScans>
  history: Record<string, DayScans[]>
  leaves: Leave[]
  trips: Trip[]
  anns: Announcement[]
  notifs: Notif[]
  moves: Move[]
  fixedPaidMonth: string | null
  notifsSeenAt: Record<string, string>
}

const uid = () => Math.random().toString(36).slice(2, 10)
const monthKey = () => isoDay().slice(0, 7)

function fresh(): State {
  const own = PEOPLE.filter(p => ['nk', 'kb', 'at'].includes(p.id)).map(p => p.id)
  return {
    userId: null,
    scans: {},
    history: Object.fromEntries(own.map(id => [id, seedHistory()])),
    ...seedState(),
    fixedPaidMonth: null,
    notifsSeenAt: {},
  }
}

/** Archive les pointages des jours précédents dans l'historique. */
function rollDay(s: State): State {
  const today = isoDay()
  let changed = false
  const scans = { ...s.scans }, history = { ...s.history }
  for (const [id, ds] of Object.entries(scans)) {
    if (ds.day !== today) {
      changed = true
      if (ds.times.length) history[id] = [ds, ...(history[id] ?? [])]
      delete scans[id]
    }
  }
  return changed ? { ...s, scans, history } : s
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return rollDay({ ...fresh(), ...JSON.parse(raw) })
  } catch { /* stockage indisponible : on repart des données de démo */ }
  return fresh()
}

// ——— Dérivés ———

const SEED_PRESENCE = seedPresence()

export type PresenceStatus = 'Au bureau' | 'En retard' | 'Parti' | 'En congé' | 'En déplacement' | 'Pas encore arrivé'
export interface Presence { status: PresenceStatus; times: string[]; first?: string; last?: string; note?: string }

export const isLate = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes() > LATE_AFTER.h * 60 + LATE_AFTER.m
}

export function leaveToday(s: State, pid: string) {
  const t = isoDay()
  return s.leaves.find(l => l.userId === pid && l.status === 'Approuvé' && l.from <= t && t < l.to)
}

export function presenceOf(s: State, pid: string): Presence {
  const leave = leaveToday(s, pid)
  if (leave) return { status: 'En congé', times: [], note: 'Revient le ' + dayMonth(leave.to) }
  const seed = SEED_PRESENCE[pid]
  const times = s.scans[pid]?.day === isoDay() ? s.scans[pid].times : seed?.times ?? []
  const n = times.length
  const first = times[0], last = n >= 2 && n % 2 === 0 ? times[n - 1] : undefined
  if (n === 0) return { status: 'Pas encore arrivé', times }
  if (last) return { status: 'Parti', times, first, last }
  if (seed?.away && !s.scans[pid]) return { status: 'En déplacement', times, first, note: seed.away }
  return { status: isLate(first!) ? 'En retard' : 'Au bureau', times, first }
}

export function visibleAnns(s: State, pid: string) {
  const p = person(pid)
  return s.anns
    .filter(a => p.role === 'admin' || a.dest.includes("Toute l'agence") || a.dest.includes(p.team) || a.dest.includes(p.name))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function feedFor(s: State, pid: string) {
  return s.notifs.filter(n => n.userId === pid).sort((a, b) => b.date.localeCompare(a.date))
}

export function unreadCount(s: State, pid: string) {
  const seen = s.notifsSeenAt[pid] ?? ''
  return feedFor(s, pid).filter(n => n.date > seen).length + visibleAnns(s, pid).filter(a => a.date > seen).length
}

export const tripTotal = (t: Trip) => t.aller + (t.roundTrip ? t.retour : 0)

export function overlappingLeaves(s: State, l: Leave) {
  const team = person(l.userId).team
  return s.leaves.filter(o => o.id !== l.id && (o.status === 'En attente' || o.status === 'Approuvé')
    && person(o.userId).team === team && o.from < l.to && l.from < o.to)
}

export const isFixedPaid = (s: State) => s.fixedPaidMonth === monthKey()

export function monthMoves(s: State) {
  const m = monthKey()
  return s.moves.filter(x => x.date.slice(0, 7) === m).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

// ——— Contexte ———

function useStoreValue() {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota / navigation privée */ }
  }, [state])

  // Bascule de journée si l'app reste ouverte après minuit.
  useEffect(() => {
    const t = setInterval(() => setState(rollDay), 60_000)
    return () => clearInterval(t)
  }, [])

  const me = state.userId ? person(state.userId) : null
  const notify = (n: Omit<Notif, 'id' | 'date'>): Notif => ({ ...n, id: uid(), date: new Date().toISOString() })

  const actions = useMemo(() => ({
    login: (id: string) => setState(s => ({ ...s, userId: id })),
    logout: () => setState(s => ({ ...s, userId: null })),
    reset: () => setState(s => ({ ...fresh(), userId: s.userId })),

    scan: () => setState(s => {
      if (!s.userId) return s
      const now = new Date().toISOString(), day = isoDay()
      const cur = s.scans[s.userId]?.day === day ? s.scans[s.userId].times : []
      return { ...s, scans: { ...s.scans, [s.userId]: { day, times: [...cur, now] } } }
    }),

    requestLeave: (l: Pick<Leave, 'type' | 'from' | 'to' | 'motif'>) => setState(s => ({
      ...s, leaves: [{ ...l, id: uid(), userId: s.userId!, status: 'En attente', createdAt: new Date().toISOString() }, ...s.leaves],
    })),
    cancelLeave: (id: string) => setState(s => ({ ...s, leaves: s.leaves.map(l => l.id === id ? { ...l, status: 'Annulé' } : l) })),
    decideLeave: (id: string, status: LeaveStatus, comment?: string) => setState(s => {
      const l = s.leaves.find(x => x.id === id)!
      const notifs = status === 'En attente' ? s.notifs : [notify({
        userId: l.userId, kind: 'leave', title: status === 'Approuvé' ? 'Congé approuvé' : 'Congé refusé',
        body: `${l.type} · ${dayMonth(l.from)}${comment ? ' · « ' + comment + ' »' : ''}`,
      }), ...s.notifs]
      return { ...s, notifs, leaves: s.leaves.map(x => x.id === id ? { ...x, status, comment: status === 'En attente' ? undefined : comment } : x) }
    }),

    declareTrip: (t: Omit<Trip, 'id' | 'userId' | 'status'>) => setState(s => ({
      ...s, trips: [{ ...t, id: uid(), userId: s.userId!, status: 'Envoyé' }, ...s.trips],
    })),
    validateTrip: (id: string, retained: number) => setState(s => {
      const t = s.trips.find(x => x.id === id)!
      return {
        ...s,
        trips: s.trips.map(x => x.id === id ? { ...x, status: 'Validé', retained, adminPay: x.payMode } : x),
        notifs: [notify({ userId: t.userId, kind: 'trip', title: 'Déplacement validé', body: `${t.client} · ${fcfa(retained)} · remboursement à venir` }), ...s.notifs],
      }
    }),
    refuseTrip: (id: string, reason: string) => setState(s => {
      const t = s.trips.find(x => x.id === id)!
      return {
        ...s,
        trips: s.trips.map(x => x.id === id ? { ...x, status: 'Refusé', refuseReason: reason || undefined } : x),
        notifs: [notify({ userId: t.userId, kind: 'trip', title: 'Déplacement refusé', body: `${t.client} · ${fcfa(tripTotal(t))}${reason ? ' · ' + reason : ''}` }), ...s.notifs],
      }
    }),
    refundTrip: (id: string, adminPay: PayMode, txRef: string) => setState(s => {
      const t = s.trips.find(x => x.id === id)!
      const amount = t.retained ?? tripTotal(t)
      return {
        ...s,
        trips: s.trips.map(x => x.id === id ? { ...x, status: 'Remboursé', adminPay, txRef: adminPay === 'Mobile Money' ? txRef : undefined, refundedAt: isoDay() } : x),
        moves: [{ id: uid(), label: 'Déplacement · ' + person(t.userId).name, mode: adminPay, date: isoDay(), amount: -amount, cat: 'Déplacements' }, ...s.moves],
        notifs: [notify({ userId: t.userId, kind: 'trip', title: 'Déplacement remboursé', body: `${t.client} · ${fcfa(amount)} par ${adminPay}` }), ...s.notifs],
      }
    }),

    publishAnn: (a: Omit<Announcement, 'id' | 'date'>) => setState(s => ({ ...s, anns: [{ ...a, id: uid(), date: new Date().toISOString() }, ...s.anns] })),

    addMove: (m: Omit<Move, 'id' | 'date'>) => setState(s => ({ ...s, moves: [{ ...m, id: uid(), date: isoDay() }, ...s.moves] })),
    toggleFixed: () => setState(s => {
      const id = 'fixed-' + monthKey()
      if (isFixedPaid(s)) return { ...s, fixedPaidMonth: null, moves: s.moves.filter(m => m.id !== id) }
      return {
        ...s, fixedPaidMonth: monthKey(),
        moves: [{ id, label: FIXED_CHARGE.label, mode: 'Virement', date: isoDay(), amount: -FIXED_CHARGE.amount, cat: FIXED_CHARGE.cat }, ...s.moves],
      }
    }),

    markSeen: () => setState(s => s.userId ? { ...s, notifsSeenAt: { ...s.notifsSeenAt, [s.userId]: new Date().toISOString() } } : s),
  }), [])

  return { state, me, ...actions }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore hors StoreProvider')
  return v
}

/** Petit hook pour les formulaires : renvoie un setter typé par champ. */
export function useForm<T extends object>(init: T) {
  const [v, setV] = useState(init)
  const set = useCallback(<K extends keyof T>(k: K) => (val: T[K]) => setV(x => ({ ...x, [k]: val })), [])
  return [v, set, setV] as const
}

