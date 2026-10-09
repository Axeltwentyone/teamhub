import { useState } from 'react'
import { type LeaveType, PEOPLE, person } from '../data'
import { dayMonth, isoDay, range, workDays } from '../format'
import { haptic, useFeedback } from '../native'
import { usePage } from '../stack'
import { useForm, useStore } from '../store'
import { AddButton, Avatar, BackHeader, Chips, CTA, Empty, Field, Icon, PageHeader, Pill, Screen, Segmented, SectionTitle } from '../ui'

const LEAVE_TYPES: LeaveType[] = ['Congé annuel', 'Permission', 'Maladie', 'Autre']

// C4 · Demander un congé
export function LeaveRequest() {
  const { me, requestLeave } = useStore()
  const { back } = usePage()
  const { toast } = useFeedback()
  const [f, set] = useForm({ type: 'Congé annuel' as LeaveType, from: '', to: '', motif: '' })
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)

  const err = !f.from ? 'Choisissez la date de départ.'
    : !f.to ? 'Choisissez la date de retour.'
    : f.to <= f.from ? 'Le retour doit être après le départ.'
    : f.from < isoDay() ? 'Le départ ne peut pas être dans le passé.' : ''

  const send = () => {
    setTried(true)
    if (err) return haptic('error')
    if (sent) return
    requestLeave({ type: f.type, from: f.from, to: f.to, motif: f.motif.trim() || undefined })
    setSent(true)
    toast('Demande de congé envoyée')
    back()
  }

  return (
    <Screen cta>
      <BackHeader title="Demande de congé" />
      <Field label="Type"><Chips options={LEAVE_TYPES} value={f.type} onPick={set('type')} /></Field>
      <div className="field">
        <span className="field-label">Période</span>
        <div style={{ background: '#fff', borderRadius: 18, display: 'grid', gridTemplateColumns: '1fr 1px 1fr', border: tried && err ? '2px solid var(--danger)' : '2px solid #fff' }}>
          <label style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="stat-label">Départ</span>
            <input type="date" className="bare-date" value={f.from} min={isoDay()} onChange={e => set('from')(e.target.value)} />
          </label>
          <div style={{ background: 'var(--line)', margin: '12px 0' }} />
          <label style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="stat-label">Retour</span>
            <input type="date" className="bare-date" value={f.to} min={f.from || isoDay()} onChange={e => set('to')(e.target.value)} />
          </label>
        </div>
        {tried && err ? <span className="err">{err}</span>
          : f.from && f.to && !err && <span className="small muted" style={{ fontWeight: 600 }}>{workDays(f.from, f.to)} jour(s) ouvré(s) · {range(f.from, f.to)}</span>}
      </div>
      <Field label="Motif" hint="(facultatif)">
        <input className="input" value={f.motif} onChange={e => set('motif')(e.target.value)} placeholder="Mariage de ma sœur à Bouaké" />
      </Field>
      <div className="banner info">
        La demande part à l'administration. Vous serez notifié{me!.fem ? 'e' : ''} de la décision et pourrez l'annuler tant qu'elle est en attente.
      </div>
      <CTA><button className="btn" onClick={send}>Envoyer la demande</button></CTA>
    </Screen>
  )
}

function LeavesTabs() {
  return <Segmented items={[{ label: 'Mes demandes', to: '/conges' }, { label: 'Calendrier équipe', to: '/conges/calendrier' }]} />
}

// C5 · Mes congés
export function MyLeaves() {
  const { state, me, cancelLeave } = useStore()
  const { confirm, toast } = useFeedback()
  const cancel = async (id: string) => {
    if (await confirm({ title: 'Annuler cette demande ?', message: "L'administration ne la traitera pas.", confirm: 'Annuler la demande', destructive: true, cancel: 'Garder' })) {
      cancelLeave(id); toast('Demande annulée', 'info')
    }
  }
  const mine = state.leaves.filter(l => l.userId === me!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.from.localeCompare(a.from))
  return (
    <Screen>
      <PageHeader sub="Congés" title="Mes demandes"
        right={<AddButton to="/conges/nouveau" label="Nouvelle demande" />} />
      <LeavesTabs />
      <div className="col" style={{ gap: 10 }}>
        {mine.length === 0 && <Empty>Aucune demande pour le moment.</Empty>}
        {mine.map(l => (
          <div key={l.id} className="card">
            <div className="row-between">
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{l.type}</span>
                <span className="small muted">{range(l.from, l.to)}{l.motif ? ' · ' + l.motif : ''}</span>
              </div>
              <Pill label={l.status} />
            </div>
            {l.comment && <span style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>{l.comment}</span>}
            {l.status === 'En attente' && (
              <button onClick={() => cancel(l.id)} style={{ alignSelf: 'flex-start', height: 36, padding: '0 14px', borderRadius: 12, border: '2px solid var(--chip)', background: '#fff', fontSize: 13, fontWeight: 800 }}>
                Annuler la demande
              </button>
            )}
          </div>
        ))}
      </div>
    </Screen>
  )
}

// C6 · Calendrier de l'équipe — qui part, qui revient (pas de solde de congés).
export function TeamCalendar() {
  const { state, me } = useStore()
  const today = isoDay()
  const team = PEOPLE.filter(p => p.team === me!.team && p.role !== 'admin' && p.role !== 'manager')
  const [offset, setOffset] = useState(0)

  const start = new Date(); start.setDate(1); start.setMonth(start.getMonth() + offset)
  const end = new Date(start); end.setMonth(end.getMonth() + 2)
  const winFrom = isoDay(start), winTo = isoDay(end)
  const label = start.toLocaleDateString('fr-FR', { month: 'long' }) + ' – ' + new Date(end.getTime() - 86400000).toLocaleDateString('fr-FR', { month: 'long' })

  const leaves = state.leaves
    .filter(l => (l.status === 'Approuvé' || l.status === 'En attente') && team.some(p => p.id === l.userId))
    .sort((a, b) => a.from.localeCompare(b.from))
  const now = leaves.filter(l => l.from <= today && today < l.to)
  const upcoming = leaves.filter(l => l.from > today && l.from < winTo && l.to > winFrom)

  const Row = ({ l, current }: { l: typeof leaves[number]; current?: boolean }) => {
    const p = person(l.userId), single = workDays(l.from, l.to) === 1
    return (
      <div className="item">
        <Avatar ini={p.ini} color={p.color} />
        <div className="grow"><span className="t">{p.name}</span><span className="s">{l.type}{l.status === 'En attente' ? ' · en attente' : ''}</span></div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{single ? 'Le ' + dayMonth(l.from) : (current ? (p.fem ? 'Partie' : 'Parti') : 'Part') + ' le ' + dayMonth(l.from)}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{single ? '1 jour' : 'Revient le ' + dayMonth(l.to)}</span>
        </div>
      </div>
    )
  }

  return (
    <Screen>
      <PageHeader sub={`${me!.team} · ${team.length} personnes`} title="Qui part, qui revient" />
      {me!.role === 'collab' && <LeavesTabs />}
      <div className="row-between" style={{ background: '#fff', borderRadius: 16, padding: 8 }}>
        <button className="round-btn" style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--bg)' }} aria-label="Période précédente" onClick={() => setOffset(o => o - 1)}><Icon name="back" size={16} stroke={2.4} /></button>
        <span style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>{label}</span>
        <button className="round-btn" style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--bg)' }} aria-label="Période suivante" onClick={() => setOffset(o => o + 1)}><Icon name="next" size={16} stroke={2.4} /></button>
      </div>
      {offset === 0 && <>
        <SectionTitle>En ce moment</SectionTitle>
        {now.length ? <div className="list">{now.map(l => <Row key={l.id} l={l} current />)}</div> : <Empty>Toute l'équipe est là.</Empty>}
      </>}
      <SectionTitle>À venir</SectionTitle>
      {upcoming.length ? <div className="list">{upcoming.map(l => <Row key={l.id} l={l} />)}</div> : <Empty>Aucun départ prévu sur la période.</Empty>}
      <span className="note">Pas de solde de congés dans TeamHub : le calendrier sert à savoir qui part et quand il revient.</span>
    </Screen>
  )
}
