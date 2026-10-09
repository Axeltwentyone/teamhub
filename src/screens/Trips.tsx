import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { type PayMode, type Transport, type Trip, TEAM_CAP } from '../data'
import { dayMonth, dayShort, fcfa, isoDay, monthYear, parseAmount, relDay } from '../format'
import { tripTotal, useForm, useStore } from '../store'
import { BackHeader, Chips, CTA, Empty, Field, Icon, PageHeader, Pill, Screen, Stat, Toggle } from '../ui'

const TRANSPORTS: Transport[] = ['Taxi', 'Woro', 'VTC', 'Autre']
const PAY_MODES: PayMode[] = ['Espèces', 'Mobile Money']

/** Réduit une photo de reçu en miniature JPEG (data URL) pour la garder hors-ligne. */
function toThumb(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', .72))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')) }
    img.src = url
  })
}

// C7 · Déclarer un déplacement
export function TripForm() {
  const { me, declareTrip } = useStore()
  const nav = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const [f, set] = useForm({
    date: isoDay(), client: '', place: '', reason: '', route: '', transport: 'Taxi' as Transport,
    roundTrip: true, aller: '', retour: '', payMode: 'Mobile Money' as PayMode, receipts: [] as string[],
  })
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)

  const cap = TEAM_CAP[me!.team] ?? 5000
  const aller = parseAmount(f.aller), retour = f.roundTrip ? parseAmount(f.retour) : 0
  const total = aller + retour, over = total > cap

  const missing = !f.client.trim() ? 'client' : !f.reason.trim() ? 'reason' : !aller ? 'amount' : f.roundTrip && !retour ? 'amount' : !f.receipts.length ? 'receipts' : ''
  const bad = (k: string) => tried && missing === k

  const addReceipts = async (files: FileList | null) => {
    if (!files) return
    const thumbs = await Promise.all([...files].map(x => toThumb(x).catch(() => null)))
    set('receipts')([...f.receipts, ...thumbs.filter((t): t is string => !!t)].slice(0, 6))
  }

  const send = () => {
    setTried(true)
    if (over || missing || sent) return
    declareTrip({
      date: f.date, client: f.client.trim(), place: f.place.trim(), reason: f.reason.trim(),
      route: f.route.trim() || 'Agence → ' + (f.place.trim() || f.client.trim()),
      transport: f.transport, roundTrip: f.roundTrip, aller, retour, payMode: f.payMode, receipts: f.receipts,
    })
    setSent(true)
    setTimeout(() => nav('/deplacements', { replace: true }), 700)
  }

  const label = sent ? 'Déplacement envoyé ✓' : over ? 'Montant au-dessus du plafond' : "Envoyer à l'administration"

  return (
    <Screen cta>
      <BackHeader title="Nouveau déplacement" />
      <div className="grid2">
        <Field label="Date"><input type="date" className="input" value={f.date} max={isoDay()} onChange={e => set('date')(e.target.value)} /></Field>
        <Field label="Client ou lieu"><input className={'input' + (bad('client') ? ' error' : '')} value={f.client} onChange={e => set('client')(e.target.value)} placeholder="Orange CI" /></Field>
      </div>
      <Field label="Quartier" hint="(facultatif)"><input className="input" value={f.place} onChange={e => set('place')(e.target.value)} placeholder="Cocody" /></Field>
      <Field label="Raison"><input className={'input' + (bad('reason') ? ' error' : '')} value={f.reason} onChange={e => set('reason')(e.target.value)} placeholder="Présentation des maquettes appli" /></Field>
      <Field label="Trajet"><input className="input" value={f.route} onChange={e => set('route')(e.target.value)} placeholder="Agence, Marcory → Cocody" /></Field>
      <Field label="Transport"><Chips options={TRANSPORTS} value={f.transport} onPick={set('transport')} cols={4} /></Field>

      <div className="field">
        <div className="row-between">
          <span className="field-label">Montant (F CFA)</span>
          <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>Aller-retour<Toggle on={f.roundTrip} onChange={set('roundTrip')} label="Aller-retour" /></span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: f.roundTrip ? '1fr 1fr' : '1fr', gap: 10 }}>
          {(['aller', 'retour'] as const).filter(k => k === 'aller' || f.roundTrip).map(k => (
            <label key={k} style={{ background: '#fff', borderRadius: 14, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, border: `2px solid ${over || bad('amount') ? 'var(--danger)' : '#fff'}` }}>
              <span className="stat-label">{k === 'aller' ? 'Aller' : 'Retour'}</span>
              <input className="bare-amount" inputMode="numeric" placeholder="0" value={f[k]} onChange={e => set(k)(e.target.value.replace(/\D/g, ''))} />
            </label>
          ))}
        </div>
        <div className={'banner ' + (over ? 'danger' : 'blue')} style={{ fontSize: 13, padding: '12px 14px', borderRadius: 14 }}>
          <Icon name={over ? 'alert' : 'info'} size={18} style={{ flex: 'none', marginTop: 1 }} />
          <span>{over
            ? `Total ${fcfa(total)} : supérieur au plafond de l'équipe ${me!.team} (${fcfa(cap)}). Réduisez le montant pour envoyer.`
            : `Total ${fcfa(total)} · plafond équipe ${me!.team} : ${fcfa(cap)} par déplacement.`}</span>
        </div>
      </div>

      <Field label="Remboursement souhaité">
        <Chips options={PAY_MODES} value={f.payMode} onPick={set('payMode')} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
          {f.payMode === 'Mobile Money' ? 'Vers ' + me!.momo : "Remis en main propre par l'administration"}
        </span>
      </Field>

      <div className="field">
        <span className="field-label">Reçus <span style={{ fontWeight: 500 }}>· au moins une capture</span></span>
        <div className="grid3" style={{ gap: 10 }}>
          {f.receipts.map((r, i) => (
            <div key={i} className="receipt">
              <img src={r} alt={`Reçu ${i + 1}`} />
              <button className="rm" aria-label="Retirer ce reçu" onClick={() => set('receipts')(f.receipts.filter((_, j) => j !== i))}><Icon name="close" size={12} stroke={3} /></button>
            </div>
          ))}
          {f.receipts.length < 6 && (
            <button type="button" className={'receipt-add' + (bad('receipts') ? ' error' : '')} onClick={() => file.current?.click()}>
              <Icon name="camera" size={22} />Ajouter
            </button>
          )}
        </div>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { addReceipts(e.target.files); e.target.value = '' }} />
        {tried && missing && <span className="err">
          {missing === 'receipts' ? 'Ajoutez au moins une photo de reçu.' : missing === 'amount' ? 'Indiquez le montant.' : 'Complétez les champs en rouge.'}
        </span>}
      </div>

      <CTA><button className={'btn' + (sent ? ' navy' : '')} disabled={over} onClick={send}>{label}</button></CTA>
    </Screen>
  )
}

const STEPS = ['Envoyé', 'Validé', 'Remboursé'] as const

export function TripSteps({ t }: { t: Trip }) {
  const idx = t.status === 'Refusé' ? 1 : STEPS.indexOf(t.status as typeof STEPS[number])
  return (
    <div className="steps">
      {STEPS.map((l, i) => {
        const refused = t.status === 'Refusé' && i === 1
        return (
          <div key={l}>
            <i style={{ background: refused ? 'var(--danger)' : i <= idx ? 'var(--teal)' : 'var(--chip)' }} />
            <span style={{ color: i <= idx ? 'var(--navy)' : 'var(--muted)' }}>{refused ? 'Refusé' : l}</span>
          </div>
        )
      })}
    </div>
  )
}

export const refundNote = (t: Trip) =>
  `Remboursé ${fcfa(t.retained ?? tripTotal(t))} par ${t.adminPay ?? t.payMode}${t.txRef ? ' · réf. ' + t.txRef : ''}`

// C8 · Mes déplacements
export function MyTrips() {
  const { state, me } = useStore()
  const mine = state.trips.filter(t => t.userId === me!.id).sort((a, b) => b.date.localeCompare(a.date))
  const month = isoDay().slice(0, 7)
  const monthTotal = mine.filter(t => t.date.startsWith(month) && t.status !== 'Refusé').reduce((a, t) => a + (t.retained ?? tripTotal(t)), 0)
  const toRefund = mine.filter(t => t.status === 'Envoyé' || t.status === 'Validé').reduce((a, t) => a + (t.retained ?? tripTotal(t)), 0)

  return (
    <Screen>
      <PageHeader sub={monthYear()} title="Mes déplacements"
        right={<Link to="/deplacements/nouveau" className="bell" aria-label="Déclarer un déplacement" style={{ background: 'var(--teal)', color: '#fff' }}><Icon name="plus" /></Link>} />
      <div className="grid2" style={{ gap: 8 }}>
        <Stat label="Total du mois" value={fcfa(monthTotal)} />
        <Stat label="À rembourser" value={fcfa(toRefund)} />
      </div>
      <div className="col" style={{ gap: 10 }}>
        {mine.length === 0 && <Empty>Aucun déplacement déclaré.</Empty>}
        {mine.map(t => {
          const open = t.status === 'Envoyé' || t.status === 'Validé'
          return (
            <div key={t.id} className="card" style={{ gap: open ? 10 : 8 }}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{t.client}{t.place ? ' · ' + t.place : ''}</span>
                  <span className="small muted">{relDay(t.date) === "Aujourd'hui" ? "Aujourd'hui" : dayMonth(t.date)} · {t.transport}{t.roundTrip ? ' · aller-retour' : ''}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{fcfa(t.retained ?? tripTotal(t))}</span>
              </div>
              {open ? <TripSteps t={t} /> : (
                <div className="row-between">
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {t.status === 'Refusé' ? (t.refuseReason ?? 'Refusé par l\'administration')
                      : t.adminPay === 'Mobile Money' ? 'Mobile Money' + (t.txRef ? ' · réf. ' + t.txRef : '')
                      : 'Espèces · remis le ' + (t.refundedAt ? dayMonth(t.refundedAt) : dayShort(t.date))}
                  </span>
                  <Pill label={t.status} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Screen>
  )
}
