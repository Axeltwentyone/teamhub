import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { PEOPLE, person, QR_PAYLOAD } from '../data'
import { hm, isoDay } from '../format'
import { monthMoves, presenceOf, tripTotal, useStore } from '../store'
import { Icon, PageHeader, Screen, SectionTitle } from '../ui'

function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  // BOM + « ; » : s'ouvre directement dans Excel en français.
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `teamhub-${name}-${isoDay()}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Exports CSV, QR code d'entrée et compte administrateur
export default function Exports() {
  const { state, me, logout, reset } = useStore()
  const nav = useNavigate()
  const [qr, setQr] = useState('')
  useEffect(() => { QRCode.toDataURL(QR_PAYLOAD, { width: 480, margin: 1, color: { dark: '#1F2A44' } }).then(setQr) }, [])

  const exports = [
    {
      label: 'Présences du jour', sub: 'Statut, arrivée, départ', run: () => downloadCsv('presences', [
        ['Nom', 'Équipe', 'Statut', 'Arrivée', 'Départ', 'Scans'],
        ...PEOPLE.filter(p => p.role !== 'admin').map(p => { const pr = presenceOf(state, p.id); return [p.name, p.team, pr.status, pr.first ? hm(pr.first) : '', pr.last ? hm(pr.last) : '', pr.times.length] }),
      ]),
    },
    {
      label: 'Congés', sub: 'Toutes les demandes', run: () => downloadCsv('conges', [
        ['Nom', 'Équipe', 'Type', 'Départ', 'Retour', 'Statut', 'Motif', 'Commentaire'],
        ...state.leaves.map(l => [person(l.userId).name, person(l.userId).team, l.type, l.from, l.to, l.status, l.motif ?? '', l.comment ?? '']),
      ]),
    },
    {
      label: 'Déplacements', sub: 'Montants, statut, remboursement', run: () => downloadCsv('deplacements', [
        ['Nom', 'Date', 'Client', 'Raison', 'Transport', 'Déclaré', 'Retenu', 'Statut', 'Remboursé par', 'Référence'],
        ...state.trips.map(t => [person(t.userId).name, t.date, t.client, t.reason, t.transport, tripTotal(t), t.retained ?? '', t.status, t.status === 'Remboursé' ? t.adminPay ?? '' : '', t.txRef ?? '']),
      ]),
    },
    {
      label: 'Caisse du mois', sub: 'Entrées et sorties', run: () => downloadCsv('caisse', [
        ['Date', 'Libellé', 'Catégorie', 'Mode', 'Montant'],
        ...monthMoves(state).map(m => [m.date, m.label, m.cat ?? '', m.mode, m.amount]),
      ]),
    },
  ]

  return (
    <Screen>
      <PageHeader sub={`${me!.name} · Administration`} title="Exports" />
      <div className="list">
        {exports.map(e => (
          <button key={e.label} className="item button" onClick={e.run}>
            <span className="icon-tile" style={{ background: 'var(--teal-soft)', color: '#0B6B74' }}><Icon name="download" size={18} /></span>
            <div className="grow"><span className="t">{e.label}</span><span className="s">{e.sub} · CSV</span></div>
            <Icon name="next" size={16} style={{ color: 'var(--muted)' }} />
          </button>
        ))}
      </div>

      <SectionTitle>QR code de pointage</SectionTitle>
      <div className="card" style={{ alignItems: 'center', gap: 12, padding: 20 }}>
        {qr && <img src={qr} alt="QR code TeamHub à afficher à l'entrée" style={{ width: 200, height: 200 }} />}
        <span className="note" style={{ textAlign: 'center' }}>À imprimer et afficher à l'entrée de l'agence. Les collaborateurs le scannent à l'arrivée et au départ.</span>
        {qr && <a href={qr} download="teamhub-qr-entree.png" className="link" style={{ fontSize: 14 }}>Télécharger le QR code</a>}
      </div>

      <button className="link" style={{ fontSize: 14, color: 'var(--ink-3)' }} onClick={() => { if (confirm('Remettre les données de démonstration à zéro ?')) reset() }}>Réinitialiser la démo</button>
      <button onClick={() => { logout(); nav('/', { replace: true }) }} style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger-ink)', background: 'none', border: 'none', padding: 6 }}>Se déconnecter</button>
    </Screen>
  )
}
