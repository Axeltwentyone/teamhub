import { useState } from 'react'
import { CASH_CATS, CAT_COLORS, FIXED_CHARGE } from '../data'
import { dayMonth, fcfa, fcfaShort, isoDay, monthYear, parseAmount, relDay } from '../format'
import { isFixedPaid, monthMoves, useStore } from '../store'
import { Chips, Empty, Field, Icon, PageHeader, Screen, SectionTitle } from '../ui'

const MODES = ['Espèces', 'Mobile Money', 'Virement'] as const

function MoveSheet({ kind, onClose }: { kind: 'in' | 'out'; onClose: () => void }) {
  const { addMove } = useStore()
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState<typeof CASH_CATS[number]>('Fournitures')
  const [mode, setMode] = useState<typeof MODES[number]>('Espèces')
  const [tried, setTried] = useState(false)
  const n = parseAmount(amount)

  const save = () => {
    setTried(true)
    if (!label.trim() || !n) return
    addMove({ label: label.trim(), amount: kind === 'in' ? n : -n, mode, cat: kind === 'out' ? cat : undefined })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={kind === 'in' ? 'Nouvelle entrée' : 'Nouvelle sortie'} onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <span style={{ fontSize: 20, fontWeight: 800 }}>{kind === 'in' ? 'Nouvelle entrée' : 'Nouvelle sortie'}</span>
        <Field label="Libellé">
          <input className={'input' + (tried && !label.trim() ? ' error' : '')} autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder={kind === 'in' ? 'Approvisionnement direction' : 'Fournitures de bureau'} />
        </Field>
        <Field label="Montant (F CFA)">
          <input className={'input' + (tried && !n ? ' error' : '')} inputMode="numeric" style={{ fontSize: 18, fontWeight: 800 }} value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" />
        </Field>
        {kind === 'out' && <Field label="Catégorie"><Chips options={CASH_CATS} value={cat} onPick={setCat} wrap /></Field>}
        <Field label="Mode"><Chips options={MODES} value={mode} onPick={setMode} cols={3} /></Field>
        <div className="grid2">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className={'btn' + (kind === 'in' ? ' navy' : '')} style={{ fontSize: 16 }} onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// A4 · Caisse
export default function Cash() {
  const { state, toggleFixed } = useStore()
  const [sheet, setSheet] = useState<'in' | 'out' | null>(null)
  const moves = monthMoves(state)
  const allIn = state.moves.filter(m => m.amount > 0).reduce((a, m) => a + m.amount, 0)
  const allOut = state.moves.filter(m => m.amount < 0).reduce((a, m) => a - m.amount, 0)
  const monthIn = moves.filter(m => m.amount > 0).reduce((a, m) => a + m.amount, 0)
  const monthOut = moves.filter(m => m.amount < 0).reduce((a, m) => a - m.amount, 0)
  const paid = isFixedPaid(state)

  const cats = CASH_CATS.map(c => ({ c, v: moves.filter(m => m.cat === c).reduce((a, m) => a - m.amount, 0) })).filter(x => x.v > 0)
  const max = Math.max(1, ...cats.map(x => x.v))
  const due = new Date(); due.setDate(FIXED_CHARGE.dueDay)

  return (
    <Screen>
      <PageHeader sub={monthYear()} title="Caisse" />
      <section className="hero">
        <div className="col" style={{ gap: 4 }}>
          <span className="label">Solde de la caisse</span>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1 }}>{fcfa(allIn - allOut)}</span>
        </div>
        <div className="grid2" style={{ gap: 8 }}>
          <div className="hero-tile"><span>Entrées du mois</span><span>{fcfaShort(monthIn)}</span></div>
          <div className="hero-tile"><span>Sorties du mois</span><span>{fcfaShort(monthOut)}</span></div>
        </div>
        <div className="grid2" style={{ gap: 8 }}>
          <button className="btn sm" style={{ width: '100%', gap: 6 }} onClick={() => setSheet('out')}><Icon name="minus" size={18} stroke={2.6} />Sortie</button>
          <button className="btn sm" style={{ width: '100%', gap: 6, background: 'rgba(255,255,255,.12)' }} onClick={() => setSheet('in')}><Icon name="plus" size={18} stroke={2.6} />Entrée</button>
        </div>
      </section>

      <div className="card" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <span className="icon-tile" style={{ background: '#FFF1E4', color: '#9A4A12' }}><Icon name="bolt" /></span>
        <div className="col" style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{FIXED_CHARGE.label} · {fcfaShort(FIXED_CHARGE.amount)}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Charge fixe · échéance {dayMonth(isoDay(due))}</span>
        </div>
        <button onClick={toggleFixed} style={{ height: 38, padding: '0 12px', borderRadius: 12, border: 'none', background: paid ? 'var(--teal-soft)' : 'var(--navy)', color: paid ? '#0B6B74' : '#fff', fontSize: 13, fontWeight: 800, flex: 'none' }}>
          {paid ? 'Payé ✓' : 'Confirmer'}
        </button>
      </div>

      <SectionTitle>Dépenses par catégorie</SectionTitle>
      {cats.length ? (
        <div className="card" style={{ gap: 12, borderRadius: 20 }}>
          {cats.map(({ c, v }) => (
            <div key={c} className="col" style={{ gap: 6 }}>
              <div className="row-between" style={{ fontSize: 14 }}><span style={{ fontWeight: 700 }}>{c}</span><span style={{ fontWeight: 800 }}>{fcfaShort(v)}</span></div>
              <div className="bar"><div style={{ width: Math.round(v / max * 100) + '%', background: CAT_COLORS[c] }} /></div>
            </div>
          ))}
        </div>
      ) : <Empty>Aucune dépense ce mois-ci.</Empty>}

      <SectionTitle>Derniers mouvements</SectionTitle>
      {moves.length ? (
        <div className="list">
          {moves.slice(0, 8).map(m => (
            <div key={m.id} className="row-between" style={{ padding: '12px 0' }}>
              <div className="col" style={{ gap: 2, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</span><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{relDay(m.date)} · {m.mode}</span></div>
              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', color: m.amount > 0 ? '#2E7D4F' : 'var(--navy)' }}>{m.amount > 0 ? '+ ' : '− '}{fcfaShort(Math.abs(m.amount))}</span>
            </div>
          ))}
        </div>
      ) : <Empty>Aucun mouvement.</Empty>}
      {sheet && <MoveSheet kind={sheet} onClose={() => setSheet(null)} />}
    </Screen>
  )
}
