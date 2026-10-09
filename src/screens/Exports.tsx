import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { PEOPLE, person, QR_PAYLOAD } from '../data'
import { hm, isoDay } from '../format'
import { monthMoves, presenceOf, tripTotal, useStore } from '../store'
import { qrPng, qrPoster, saveFile, type SaveResult } from '../files'
import { useFeedback } from '../native'
import { Icon, PageHeader, Screen, SectionTitle } from '../ui'
import OfficeLocation from './OfficeLocation'

function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  // BOM + « ; » : s'ouvre directement dans Excel en français.
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
  return saveFile(blob, `teamhub-${name}-${isoDay()}.csv`)
}

// Exports CSV, QR code d'entrée et compte administrateur
export default function Exports() {
  const { state, me, logout, reset } = useStore()
  const nav = useNavigate()
  const { confirm, toast } = useFeedback()
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState<'poster' | 'qr' | null>(null)
  useEffect(() => { QRCode.toDataURL(QR_PAYLOAD, { width: 480, margin: 1, color: { dark: '#1F2A44' } }).then(setQr) }, [])

  const done = (r: SaveResult, what: string) => {
    if (r === 'downloaded') toast(what + ' téléchargé')
    else if (r === 'shared') toast(what + ' prêt')
  }
  const saveQr = async (kind: 'poster' | 'qr') => {
    if (busy) return
    setBusy(kind)
    try {
      const blob = kind === 'poster' ? await qrPoster() : await qrPng()
      done(await saveFile(blob, kind === 'poster' ? 'teamhub-affiche-pointage.png' : 'teamhub-qr-pointage.png', 'QR code de pointage TeamHub'), kind === 'poster' ? 'Affiche' : 'QR code')
    } catch {
      toast("Impossible de générer l'image", 'error')
    } finally { setBusy(null) }
  }

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
          <button key={e.label} className="item button" onClick={async () => done(await e.run(), e.label)}>
            <span className="icon-tile" style={{ background: 'var(--teal-soft)', color: '#0B6B74' }}><Icon name="download" size={18} /></span>
            <div className="grow"><span className="t">{e.label}</span><span className="s">{e.sub} · CSV</span></div>
            <Icon name="next" size={16} style={{ color: 'var(--muted)' }} />
          </button>
        ))}
      </div>

      <OfficeLocation />

      <SectionTitle>QR code de pointage</SectionTitle>
      <div className="card" style={{ alignItems: 'center', gap: 12, padding: 20 }}>
        {qr && <img src={qr} alt="QR code TeamHub à afficher à l'entrée" style={{ width: 200, height: 200 }} />}
        <span className="note" style={{ textAlign: 'center' }}>À imprimer et afficher à l'entrée de l'agence. Les collaborateurs le scannent à l'arrivée et au départ.</span>
        <button className="btn sm" style={{ width: '100%', marginTop: 4 }} disabled={!!busy} onClick={() => saveQr('poster')}>
          <Icon name="download" size={18} />{busy === 'poster' ? 'Préparation…' : "Télécharger l'affiche A4"}
        </button>
        <button className="link" style={{ fontSize: 14 }} disabled={!!busy} onClick={() => saveQr('qr')}>
          {busy === 'qr' ? 'Préparation…' : 'QR code seul (PNG haute définition)'}
        </button>
      </div>

      <button className="link" style={{ fontSize: 14, color: 'var(--ink-3)' }} onClick={async () => { if (await confirm({ title: 'Réinitialiser la démo ?', message: 'Pointages, demandes, caisse et annonces reviennent aux données de départ.', confirm: 'Réinitialiser', destructive: true })) { reset(); toast('Données de démo réinitialisées', 'info') } }}>Réinitialiser la démo</button>
      <button onClick={async () => { if (await confirm({ confirm: 'Se déconnecter', destructive: true })) { logout(); nav('/', { replace: true }) } }} style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger-ink)', background: 'none', border: 'none', padding: 6 }}>Se déconnecter</button>
    </Screen>
  )
}
