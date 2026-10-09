import { LATE_AFTER } from '../data'
import { dayShort, hm, isoDay, minutesToHm, monthYear } from '../format'
import { isLate, useStore } from '../store'
import { BackHeader, Pill, Screen, Stat } from '../ui'

// C3 · Mon historique de pointage
export default function History() {
  const { state, me } = useStore()
  const today = isoDay()
  const todayScans = state.scans[me!.id]?.day === today ? state.scans[me!.id].times : []
  const days = [{ day: today, times: todayScans }, ...(state.history[me!.id] ?? [])]

  const rows = days.map(({ day, times }) => {
    const n = times.length, isToday = day === today
    const first = times[0], last = n >= 2 && n % 2 === 0 ? times[n - 1] : undefined
    const onLeave = state.leaves.some(l => l.userId === me!.id && l.status === 'Approuvé' && l.from <= day && day < l.to)
    const mins = first && last ? Math.round((new Date(last).getTime() - new Date(first).getTime()) / 60000) : 0
    const badge = n === 0 ? (isToday ? null : onLeave ? 'En congé' : 'Absent')
      : first && isLate(first) ? 'En retard'
      : !last && !isToday ? 'Départ non pointé' : null
    return { day, first, last, mins, badge }
  })

  const month = today.slice(0, 7)
  const inMonth = rows.filter(r => r.day.startsWith(month) && r.first)
  const total = inMonth.reduce((a, r) => a + r.mins, 0)
  const lates = inMonth.filter(r => isLate(r.first!)).length

  return (
    <Screen>
      <BackHeader title="Mon historique" />
      <div className="row-between">
        <span style={{ fontSize: 15, fontWeight: 800 }}>{monthYear()}</span>
        <span className="small muted" style={{ fontWeight: 600 }}>Début 9 h 00 · retard après {LATE_AFTER.h} h {LATE_AFTER.m}</span>
      </div>
      <div className="grid3">
        <Stat label="Jours pointés" value={inMonth.length} />
        <Stat label="Présence" value={minutesToHm(total)} />
        <Stat label="Retards" value={lates} />
      </div>
      <div className="list">
        {rows.map(r => (
          <div key={r.day} className="item">
            <div className="grow">
              <span className="t">{dayShort(r.day)}</span>
              <span className="s tabular">{r.first ? hm(r.first) : '—'} → {r.last ? hm(r.last) : '—'}</span>
            </div>
            {r.badge && <Pill label={r.badge} />}
            <span className="tabular" style={{ fontSize: 14, fontWeight: 800, minWidth: 44, textAlign: 'right' }}>{r.mins ? minutesToHm(r.mins) : '—'}</span>
          </div>
        ))}
      </div>
    </Screen>
  )
}
