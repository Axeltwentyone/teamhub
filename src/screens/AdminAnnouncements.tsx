import { useState } from 'react'
import { ANN_TYPES, TEAMS } from '../data'
import { haptic, useFeedback } from '../native'
import { usePage } from '../stack'
import { useStore } from '../store'
import { AddButton, BackHeader, Chips, CTA, Empty, Field, PageHeader, Screen } from '../ui'
import { AnnCard } from './Announcements'

// Annonces publiées (admin)
export function AdminAnnouncements() {
  const { state } = useStore()
  const anns = [...state.anns].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Screen>
      <PageHeader sub="Vie de l'équipe" title="Annonces"
        right={<AddButton to="/admin/annonces/nouvelle" label="Nouvelle annonce" />} />
      {anns.length ? anns.map(a => (
        <div key={a.id} className="col" style={{ gap: 6 }}>
          <AnnCard a={a} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, paddingLeft: 6 }}>Pour : {a.dest.join(', ')}</span>
        </div>
      )) : <Empty>Aucune annonce publiée.</Empty>}
    </Screen>
  )
}

const ALL = "Toute l'agence"
const DESTS = [ALL, ...TEAMS] as const

// A5 · Publier une annonce
export function NewAnnouncement() {
  const { publishAnn } = useStore()
  const { back } = usePage()
  const { toast } = useFeedback()
  const [type, setType] = useState<typeof ANN_TYPES[number]>('Information')
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState('')
  const [dest, setDest] = useState<string[]>([ALL])
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)

  const pickDest = (d: string) => setDest(cur =>
    d === ALL ? [ALL] : cur.includes(d) ? (cur.filter(x => x !== d).length ? cur.filter(x => x !== d) : [ALL]) : [...cur.filter(x => x !== ALL), d])

  const send = () => {
    setTried(true)
    if (!title.trim() || !msg.trim()) return haptic('error')
    if (sent) return
    publishAnn({ type, title: title.trim(), msg: msg.trim(), dest })
    setSent(true)
    toast('Annonce publiée')
    back()
  }

  return (
    <Screen cta>
      <BackHeader title="Nouvelle annonce" />
      <Field label="Type d'événement"><Chips options={ANN_TYPES} value={type} onPick={setType} wrap /></Field>
      <Field label="Titre">
        <input className={'input' + (tried && !title.trim() ? ' error' : '')} value={title} onChange={e => setTitle(e.target.value)} placeholder="Joyeux anniversaire Axel !" />
      </Field>
      <Field label="Message">
        <textarea className={'input' + (tried && !msg.trim() ? ' error' : '')} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Rendez-vous à 16 h en salle de réunion pour le gâteau." />
      </Field>
      <Field label="Destinataires"><Chips options={DESTS} value={dest as typeof DESTS[number][]} onPick={pickDest} wrap /></Field>
      {tried && (!title.trim() || !msg.trim()) && <span className="err">Ajoutez un titre et un message.</span>}
      <CTA><button className="btn" onClick={send}>Publier l'annonce</button></CTA>
    </Screen>
  )
}
