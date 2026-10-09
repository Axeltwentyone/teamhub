import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type PayMode, PEOPLE, person, TEAM_CAP } from '../data'
import { dayMonth, dayShort, fcfa, hm, isoDay, parseAmount, range, relDay, workDays } from '../format'
import { overlappingLeaves, type PresenceStatus, presenceOf, tripTotal, useStore } from '../store'
import { Avatar, BackHeader, BellButton, Chips, CTA, Empty, Field, Icon, PageHeader, Pill, pillColors, Screen, Segmented } from '../ui'
import { refundNote } from './Trips'

const COUNTERS: PresenceStatus[] = ['Au bureau', 'En retard', 'Pas encore arrivé', 'En congé', 'En déplacement', 'Parti']
const SHORT: Partial<Record<PresenceStatus, string>> = { 'Pas encore arrivé': 'Pas arrivés', 'En déplacement': 'En déplac.', 'Parti': 'Partis' }

// A1 · Présences en temps réel
export function AdminPresences() {
  const { state, me } = useStore()
  const [filter, setFilter] = useState<PresenceStatus | null>(null)
  const [team, setTeam] = useState<string | null>(null)
  const staff = PEOPLE.filter(p => p.role !== 'admin' && (!team || p.team === team))
  const all = staff.map(p => ({ p, pr: presenceOf(state, p.id) }))
  const rows = all.filter(r => !filter || r.pr.status === filter)
  const teams = [...new Set(PEOPLE.filter(p => p.role !== 'admin').map(p => p.team))]

  return (
    <Screen>
      <PageHeader sub={`${me!.name} · Administration`} title="Présences" right={<BellButton />} />
      <div className="row-between" style={{ background: '#fff', borderRadius: 16, padding: '8px 12px', minHeight: 52 }}>
        <span style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#2E9466' }} />Aujourd'hui · {dayShort(isoDay()).toLowerCase()}
        </span>
        <span className="small muted" style={{ fontWeight: 600 }}>{all.length} personnes</span>
      </div>
      <div className="grid3">
        {COUNTERS.map(s => {
          const on = filter === s, [bg, fg] = pillColors(s)
          return (
            <button key={s} aria-pressed={on} onClick={() => setFilter(on ? null : s)}
              style={{ textAlign: 'left', background: on ? 'var(--navy)' : bg === '#F4F6FA' ? '#fff' : bg, color: on ? '#fff' : fg, border: 'none', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: .85 }}>{SHORT[s] ?? s}</span>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{all.filter(r => r.pr.status === s).length}</span>
            </button>
          )
        })}
      </div>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="section-title">{filter ? `${filter} · ${rows.length}` : 'Tous les collaborateurs'}</span>
        <select value={team ?? ''} onChange={e => setTeam(e.target.value || null)} aria-label="Équipe"
          style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--teal-ink)', textAlign: 'right' }}>
          <option value="">Toutes les équipes</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {rows.length ? (
        <div className="list">
          {rows.map(({ p, pr }) => (
            <div key={p.id} className="item">
              <Avatar ini={p.ini} color={p.color} />
              <div className="grow">
                <span className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                <span className="ellipsis" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {p.team} · {pr.note ?? (pr.first ? `${hm(pr.first)} → ${pr.last ? hm(pr.last) : '—'}` : 'Aucun scan')}
                </span>
              </div>
              <Pill label={pr.status} />
            </div>
          ))}
        </div>
      ) : <Empty>Personne dans cette catégorie.</Empty>}
    </Screen>
  )
}

// Liste des demandes à traiter (congés / déplacements)
export function AdminRequests({ tab = 'leaves' }: { tab?: 'leaves' | 'trips' }) {
  const { state } = useStore()
  const leaves = state.leaves.filter(l => l.status !== 'Annulé')
    .sort((a, b) => Number(b.status === 'En attente') - Number(a.status === 'En attente') || a.from.localeCompare(b.from))
  const OPEN = ['Envoyé', 'Validé']
  const trips = [...state.trips].sort((a, b) => Number(OPEN.includes(b.status)) - Number(OPEN.includes(a.status)) || b.date.localeCompare(a.date))
  const pendingL = leaves.filter(l => l.status === 'En attente').length
  const pendingT = trips.filter(t => OPEN.includes(t.status)).length

  return (
    <Screen>
      <PageHeader sub={`${pendingL + pendingT} à traiter`} title="Demandes" />
      <Segmented items={[{ label: `Congés · ${pendingL}`, to: '/admin/demandes' }, { label: `Déplacements · ${pendingT}`, to: '/admin/demandes/deplacements' }]} />
      {tab === 'leaves' ? (
        leaves.length ? <div className="list">
          {leaves.map(l => {
            const p = person(l.userId)
            return (
              <Link key={l.id} to={`/admin/conges/${l.id}`} className="item" style={{ color: 'inherit' }}>
                <Avatar ini={p.ini} color={p.color} />
                <div className="grow"><span className="t ellipsis">{p.name}</span><span className="s ellipsis">{l.type} · {range(l.from, l.to)}</span></div>
                <Pill label={l.status} />
              </Link>
            )
          })}
        </div> : <Empty>Aucune demande de congé.</Empty>
      ) : (
        trips.length ? <div className="list">
          {trips.map(t => {
            const p = person(t.userId)
            return (
              <Link key={t.id} to={`/admin/deplacements/${t.id}`} className="item" style={{ color: 'inherit' }}>
                <Avatar ini={p.ini} color={p.color} />
                <div className="grow"><span className="t ellipsis">{p.name}</span><span className="s ellipsis">{t.client} · {relDay(t.date)} · {fcfa(t.retained ?? tripTotal(t))}</span></div>
                <Pill label={t.status} />
              </Link>
            )
          })}
        </div> : <Empty>Aucun déplacement.</Empty>
      )}
    </Screen>
  )
}

const Tile = ({ k, v }: { k: string; v: string }) => (
  <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span className="stat-label">{k}</span><span style={{ fontSize: 15, fontWeight: 800 }}>{v}</span>
  </div>
)

// A2 · Valider une demande de congé
export function LeaveReview() {
  const { id } = useParams()
  const { state, decideLeave } = useStore()
  const l = state.leaves.find(x => x.id === id)
  const [comment, setComment] = useState('')
  const [error, setError] = useState(false)
  if (!l) return <Screen><BackHeader title="Demande de congé" to="/admin/demandes" /><Empty>Demande introuvable.</Empty></Screen>

  const p = person(l.userId)
  const pending = l.status === 'En attente'
  const conflicts = overlappingLeaves(state, l)
  const [bg, fg] = pillColors(l.status)

  const refuse = () => comment.trim() ? decideLeave(l.id, 'Refusé', comment.trim()) : setError(true)

  return (
    <Screen cta={pending}>
      <BackHeader title="Demande de congé" to="/admin/demandes" />
      <div className="card" style={{ padding: 16, gap: 14, borderRadius: 20 }}>
        <div className="row">
          <Avatar ini={p.ini} color={p.color} size={44} />
          <div className="grow col" style={{ flex: 1, gap: 2 }}><span style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</span><span className="small muted" style={{ fontWeight: 600 }}>{p.team} · {p.statut}</span></div>
          <Pill label={l.status} />
        </div>
        <div className="grid2" style={{ gap: 8 }}>
          <Tile k="Type" v={l.type} />
          <Tile k="Durée" v={`${workDays(l.from, l.to)} jour${workDays(l.from, l.to) > 1 ? 's' : ''} ouvré${workDays(l.from, l.to) > 1 ? 's' : ''}`} />
          <Tile k="Départ" v={dayShort(l.from)} />
          <Tile k="Retour" v={dayShort(l.to)} />
        </div>
        {l.motif && <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}><b style={{ color: 'var(--navy)' }}>Motif :</b> {l.motif}</span>}
      </div>
      {conflicts.length > 0 && (
        <div className="banner warn" style={{ padding: 14 }}>
          <Icon name="alert" size={20} style={{ flex: 'none' }} />
          <div className="col" style={{ gap: 4, fontSize: 13, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Déjà absent{conflicts.length > 1 ? 's' : ''} dans l'équipe sur la période</span>
            {conflicts.map(c => (
              <span key={c.id}>{person(c.userId).name} · {c.type.toLowerCase()} du {dayMonth(c.from)} au {dayMonth(c.to)}{c.status === 'En attente' ? ' (en attente)' : ''}</span>
            ))}
          </div>
        </div>
      )}
      {pending ? (
        <Field label="Commentaire" hint="· obligatoire en cas de refus">
          <textarea className={'input' + (error ? ' error' : '')} value={comment} placeholder="Ajouter un commentaire…" style={{ minHeight: 76 }}
            onChange={e => { setComment(e.target.value); setError(false) }} />
          {error && <span className="err">Indiquez la raison du refus.</span>}
        </Field>
      ) : (
        <div style={{ borderRadius: 16, padding: 14, background: bg, color: fg, fontSize: 14, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>{l.status}{l.comment ? ' · « ' + l.comment + ' »' : ''} · {p.first} est notifié{p.fem ? 'e' : ''}</span>
          <button onClick={() => decideLeave(l.id, 'En attente')} style={{ border: 'none', background: 'none', color: 'inherit', fontWeight: 800, textDecoration: 'underline', fontSize: 13 }}>Annuler</button>
        </div>
      )}
      {pending && (
        <CTA>
          <button className="btn ghost" onClick={refuse}>Refuser</button>
          <button className="btn" style={{ fontSize: 16 }} onClick={() => decideLeave(l.id, 'Approuvé', comment.trim() || undefined)}>Approuver</button>
        </CTA>
      )}
    </Screen>
  )
}

const PAY_MODES: PayMode[] = ['Espèces', 'Mobile Money']

// A3 · Traiter un déplacement : Envoyé → Validé → Remboursé (sortie de caisse automatique)
export function TripReview() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, validateTrip, refuseTrip, refundTrip } = useStore()
  const t = state.trips.find(x => x.id === id)
  const [retained, setRetained] = useState(() => String(t ? t.retained ?? tripTotal(t) : ''))
  const [pay, setPay] = useState<PayMode>(t?.adminPay ?? t?.payMode ?? 'Mobile Money')
  const [txRef, setTxRef] = useState('')
  const [refusing, setRefusing] = useState(false)
  const [reason, setReason] = useState('')
  const [refErr, setRefErr] = useState(false)
  if (!t) return <Screen><BackHeader title="Déplacement" to="/admin/demandes/deplacements" /><Empty>Déplacement introuvable.</Empty></Screen>

  const p = person(t.userId)
  const cap = TEAM_CAP[p.team] ?? 5000
  const rows: [string, string][] = [
    ['Date', dayShort(t.date)], ['Client', t.client + (t.place ? ' · ' + t.place : '')], ['Raison', t.reason],
    ['Trajet', `${t.route} · ${t.transport.toLowerCase()}${t.roundTrip ? ' · aller-retour' : ''}`],
    ['Montant déclaré', fcfa(tripTotal(t))], ['Souhaité', t.payMode],
  ]
  const refund = () => {
    if (pay === 'Mobile Money' && !txRef.trim()) return setRefErr(true)
    refundTrip(t.id, pay, txRef.trim())
  }

  return (
    <Screen cta={t.status === 'Envoyé' || t.status === 'Validé'}>
      <BackHeader title="Déplacement" to="/admin/demandes/deplacements" right={<Pill label={t.status} />} />
      <div className="card" style={{ borderRadius: 20, gap: 0 }}>
        <div className="row" style={{ paddingBottom: 6 }}>
          <Avatar ini={p.ini} color={p.color} size={40} />
          <div className="col" style={{ flex: 1, gap: 1 }}><span style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</span><span className="small muted" style={{ fontWeight: 600 }}>{p.team} · plafond {fcfa(cap)}</span></div>
        </div>
        {rows.map(([k, v], i) => (
          <div key={k} className="row-between" style={{ padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 14, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--ink-3)', fontWeight: 600, flex: 'none' }}>{k}</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      {t.receipts.length > 0 ? (
        <div className="grid3" style={{ gap: 10 }}>
          {t.receipts.map((r, i) => <a key={i} href={r} target="_blank" rel="noreferrer" className="receipt" style={{ aspectRatio: '1' }}><img src={r} alt={`Reçu ${i + 1}`} /></a>)}
        </div>
      ) : (
        <div className="grid3" style={{ gap: 10 }}>
          <div className="receipt" style={{ aspectRatio: '1' }}>Reçu aller</div>
          {t.roundTrip && <div className="receipt" style={{ aspectRatio: '1' }}>Reçu retour</div>}
        </div>
      )}

      {t.status === 'Envoyé' && !refusing && (
        <Field label="Montant retenu (F CFA)" hint="· si différent du reçu">
          <input className="input" inputMode="numeric" style={{ fontSize: 17, fontWeight: 800 }} value={retained} onChange={e => setRetained(e.target.value.replace(/\D/g, ''))} />
          {parseAmount(retained) > cap && <span className="err">Au-dessus du plafond de l'équipe ({fcfa(cap)}).</span>}
        </Field>
      )}
      {t.status === 'Envoyé' && refusing && (
        <Field label="Raison du refus" hint="(facultatif)">
          <input className="input" autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Hors plafond équipe" />
        </Field>
      )}
      {t.status === 'Validé' && (
        <Field label="Remboursé par">
          <Chips options={PAY_MODES} value={pay} onPick={v => { setPay(v); setRefErr(false) }} />
          {pay === 'Mobile Money' && <input className={'input' + (refErr ? ' error' : '')} value={txRef} onChange={e => { setTxRef(e.target.value); setRefErr(false) }} placeholder="Référence de transaction" />}
          {refErr && <span className="err">Indiquez la référence Mobile Money.</span>}
        </Field>
      )}
      {t.status === 'Remboursé' && (
        <div className="banner info"><Icon name="check" size={18} style={{ flex: 'none', marginTop: 2 }} />
          <span>{refundNote(t)}. {p.first} est notifié{p.fem ? 'e' : ''} et une sortie « Déplacements » est ajoutée à la caisse.</span>
        </div>
      )}
      {t.status === 'Refusé' && (
        <div className="banner danger"><Icon name="close" size={18} style={{ flex: 'none', marginTop: 2 }} />
          <span>Refusé{t.refuseReason ? ' · ' + t.refuseReason : ''}. {p.first} est notifié{p.fem ? 'e' : ''}.</span>
        </div>
      )}

      {t.status === 'Envoyé' && (
        <CTA>
          {refusing ? <>
            <button className="btn ghost" onClick={() => setRefusing(false)}>Retour</button>
            <button className="btn" style={{ background: 'var(--danger)', fontSize: 16 }} onClick={() => refuseTrip(t.id, reason.trim())}>Confirmer le refus</button>
          </> : <>
            <button className="btn ghost" onClick={() => setRefusing(true)}>Refuser</button>
            <button className="btn" style={{ fontSize: 16 }} disabled={!parseAmount(retained)} onClick={() => validateTrip(t.id, parseAmount(retained))}>Valider</button>
          </>}
        </CTA>
      )}
      {t.status === 'Validé' && <CTA><button className="btn navy" style={{ fontSize: 16 }} onClick={refund}>Marquer comme remboursé</button></CTA>}
      {(t.status === 'Remboursé' || t.status === 'Refusé') && (
        <button className="btn ghost" onClick={() => nav('/admin/demandes/deplacements')}>Retour aux déplacements</button>
      )}
    </Screen>
  )
}
