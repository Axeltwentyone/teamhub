import { useNavigate } from 'react-router-dom'
import { PEOPLE, person } from '../data'
import { hm, isoDay, relDay, monthYear } from '../format'
import { type PresenceStatus, presenceOf, useStore } from '../store'
import { Avatar, BellButton, Empty, Icon, PageHeader, Pill, Screen, SectionTitle, Stat } from '../ui'
import { LastAnnouncement, QuickActions } from './Home'

const SHORT: Partial<Record<PresenceStatus, string>> = { 'En déplacement': 'En déplac.', 'Parti': 'Partis', 'Pas encore arrivé': 'Pas arrivés' }
const ORDER: PresenceStatus[] = ['Au bureau', 'En retard', 'En déplacement', 'En congé', 'Parti', 'Pas encore arrivé']

const useTeam = () => {
  const { me } = useStore()
  return PEOPLE.filter(p => p.team === me!.team && p.role === 'collab')
}

// M1 · Mon équipe aujourd'hui (lecture seule)
export function ManagerHome() {
  const { state, me } = useStore()
  const nav = useNavigate()
  const team = useTeam()
  const mine = presenceOf(state, me!.id)
  const rows = team.map(p => ({ p, pr: presenceOf(state, p.id) }))

  return (
    <Screen>
      <PageHeader sub={`${me!.name} · ${me!.poste}`} title="" right={<BellButton />} />
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20 }}>
        <div className="grow col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <span className="small muted" style={{ fontWeight: 600 }}>Mon pointage · {mine.status}</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>
            {mine.first ? (mine.last ? 'Parti à ' + hm(mine.last) : 'Depuis ' + hm(mine.first)) : 'Pas encore pointé'}
          </span>
        </div>
        <button className="btn navy sm" onClick={() => nav('/scan')}><Icon name="qr" size={18} />Scanner</button>
      </div>
      <div className="grid3">
        {ORDER.map(s => <Stat key={s} label={SHORT[s] ?? s} value={rows.filter(r => r.pr.status === s).length} />)}
      </div>
      <div className="list">
        {rows.map(({ p, pr }) => (
          <div key={p.id} className="item">
            <Avatar ini={p.ini} color={p.color} />
            <div className="grow">
              <span className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
              <span className="tabular" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {pr.first ? hm(pr.first) : '—'} · {pr.note ?? (pr.last ? hm(pr.last) : '—')}
              </span>
            </div>
            <Pill label={pr.status} />
          </div>
        ))}
      </div>
      <QuickActions />
      <LastAnnouncement />
    </Screen>
  )
}

// M2 · Récapitulatif & déplacements de l'équipe (lecture seule)
export function TeamRecap() {
  const { state, me } = useStore()
  const team = useTeam()
  const month = isoDay().slice(0, 7)

  // Retards / absences du mois : valeurs de démonstration en attendant le back-end.
  const DEMO: Record<string, [number, number]> = { nk: [1, 0], an: [4, 1], ib: [0, 0], fd: [0, 0], gy: [2, 0], sk: [1, 2] }
  const recap = team.map(p => ({ p, late: DEMO[p.id]?.[0] ?? 0, abs: DEMO[p.id]?.[1] ?? 0 }))
  const trips = state.trips.filter(t => team.some(p => p.id === t.userId) && t.date.startsWith(month) && t.status !== 'Refusé')
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Screen>
      <PageHeader sub={`${me!.team} · ${monthYear().toLowerCase()}`} title="Récapitulatif" right={<Pill label="Lecture seule" />} />
      <div className="list" style={{ gap: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 6, padding: '12px 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span>Membre</span><span style={{ textAlign: 'center' }}>Retards</span><span style={{ textAlign: 'center' }}>Absences</span>
        </div>
        {recap.map(({ p, late, abs }) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 6, alignItems: 'center', padding: '10px 0' }}>
            <div className="row" style={{ gap: 10, minWidth: 0 }}><Avatar ini={p.ini} color={p.color} size={30} /><span className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span></div>
            <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: late >= 3 ? '#9A4A12' : 'var(--navy)' }}>{late}</span>
            <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: abs >= 2 ? 'var(--danger-ink)' : 'var(--navy)' }}>{abs}</span>
          </div>
        ))}
      </div>
      <SectionTitle>Déplacements de l'équipe</SectionTitle>
      {trips.length ? (
        <div className="list">
          {trips.map(t => {
            const p = person(t.userId)
            return (
              <div key={t.id} className="item">
                <Avatar ini={p.ini} color={p.color} size={34} />
                <div className="grow"><span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.client}{t.place ? ' · ' + t.place : ''}</span></div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{relDay(t.date)}</span>
              </div>
            )
          })}
        </div>
      ) : <Empty>Aucun déplacement ce mois-ci.</Empty>}
      <span className="note">Les congés et déplacements sont validés par l'administration. La caisse et les autres équipes ne sont pas visibles.</span>
    </Screen>
  )
}
