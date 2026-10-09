import { Link, useNavigate } from 'react-router-dom'
import { dayLong, hm, range, relDay, fcfa } from '../format'
import { presenceOf, tripTotal, useStore, visibleAnns } from '../store'
import { BellButton, Icon, PageHeader, Pill, Screen, SectionTitle } from '../ui'

/** Carte sombre « Mon état du jour » partagée par C1. */
export function DayCard() {
  const { state, me } = useStore()
  const nav = useNavigate()
  const pr = presenceOf(state, me!.id)
  const headline = pr.status === 'Pas encore arrivé' ? 'Pas encore pointé'
    : pr.status === 'Parti' ? 'Parti' + (me!.fem ? 'e' : '') + ' à ' + hm(pr.last!)
    : pr.status === 'En congé' ? 'En congé · ' + pr.note
    : 'Au bureau depuis ' + hm(pr.first!)
  return (
    <section className="hero">
      <div className="row-between">
        <span className="label">Mon état du jour</span>
        <Pill label={pr.status} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2, textWrap: 'pretty' }}>{headline}</div>
      <Link to="/historique" className="grid3" style={{ color: 'inherit' }} aria-label="Voir mon historique">
        <div className="hero-tile"><span>Arrivée</span><span>{pr.first ? hm(pr.first) : '—'}</span></div>
        <div className="hero-tile"><span>Départ</span><span>{pr.last ? hm(pr.last) : '—'}</span></div>
        <div className="hero-tile"><span>Scans</span><span>{pr.times.length}</span></div>
      </Link>
      <button className="btn" style={{ fontSize: 16, borderRadius: 16 }} onClick={() => nav('/scan')}>
        <Icon name="qr" size={22} />Scanner le QR code
      </button>
    </section>
  )
}

export function QuickActions() {
  return (
    <div className="grid2">
      <Link to="/conges/nouveau" className="card" style={{ color: 'inherit', gap: 10, padding: 14 }}>
        <span className="icon-tile" style={{ background: '#EDEAF7', color: '#4B3F8A' }}><Icon name="calendar" /></span>
        <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>Demander un congé</span>
      </Link>
      <Link to="/deplacements/nouveau" className="card" style={{ color: 'inherit', gap: 10, padding: 14 }}>
        <span className="icon-tile" style={{ background: '#E6F0FB', color: '#24578F' }}><Icon name="car" /></span>
        <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>Déclarer un déplacement</span>
      </Link>
    </div>
  )
}

export function LastAnnouncement() {
  const { state, me } = useStore()
  const a = visibleAnns(state, me!.id)[0]
  if (!a) return null
  return (
    <>
      <SectionTitle>Dernière annonce</SectionTitle>
      <Link to="/annonces" className="card" style={{ color: 'inherit', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <span className="icon-tile" style={{ background: 'var(--teal-soft)', color: '#0B6B74' }}><Icon name="megaphone" /></span>
        <div className="col" style={{ gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-ink)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{a.type} · {relDay(a.date)}</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{a.title}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{a.msg}</span>
        </div>
      </Link>
    </>
  )
}

// C1 · Accueil & état du jour
export default function Home() {
  const { state, me } = useStore()
  const trip = state.trips.find(t => t.userId === me!.id && t.status !== 'Refusé')
  const leave = state.leaves.find(l => l.userId === me!.id && l.status === 'En attente')
    ?? state.leaves.find(l => l.userId === me!.id && l.status !== 'Annulé')

  return (
    <Screen>
      <PageHeader sub={`${dayLong()} · ${me!.team}`} title={`Bonjour ${me!.first}`} right={<BellButton />} />
      <DayCard />
      <QuickActions />
      {(trip || leave) && <>
        <SectionTitle>Mes demandes</SectionTitle>
        <div className="list">
          {trip && (
            <Link to="/deplacements" className="item" style={{ color: 'inherit' }}>
              <div className="grow"><span className="t">Déplacement · {trip.client}</span><span className="s">{relDay(trip.date)} · {fcfa(trip.retained ?? tripTotal(trip))}</span></div>
              <Pill label={trip.status} />
            </Link>
          )}
          {leave && (
            <Link to="/conges" className="item" style={{ color: 'inherit' }}>
              <div className="grow"><span className="t">{leave.type}</span><span className="s">{range(leave.from, leave.to)}</span></div>
              <Pill label={leave.status} />
            </Link>
          )}
        </div>
      </>}
      <LastAnnouncement />
    </Screen>
  )
}
