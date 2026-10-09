import { useEffect, useState } from 'react'
import type { Announcement, Notif } from '../data'
import { relDay } from '../format'
import { feedFor, useStore, visibleAnns } from '../store'
import { Empty, Icon, PageHeader, Screen, SectionTitle } from '../ui'

export function AnnCard({ a, fresh }: { a: Announcement; fresh?: boolean }) {
  return (
    <article className="card" style={{ gap: 4, boxShadow: fresh ? 'inset 0 0 0 2px var(--teal)' : undefined }}>
      <div className="row-between">
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-ink)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{a.type}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{relDay(a.date)}</span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{a.title}</span>
      <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45, whiteSpace: 'pre-line' }}>{a.msg}</span>
    </article>
  )
}

const NOTIF_ICON: Record<Notif['kind'], string> = { trip: 'car', leave: 'calendar', ann: 'megaphone' }

// C9 · Annonces & notifications
export default function Announcements() {
  const { state, me, markSeen } = useStore()
  const [seenBefore] = useState(() => state.notifsSeenAt[me!.id] ?? '')
  useEffect(() => { markSeen() }, [markSeen])

  const anns = visibleAnns(state, me!.id)
  const feed = feedFor(state, me!.id)

  return (
    <Screen>
      <PageHeader sub="Vie de l'équipe" title="Annonces" />
      {anns.length ? anns.map(a => <AnnCard key={a.id} a={a} fresh={a.date > seenBefore && !!seenBefore} />) : <Empty>Aucune annonce.</Empty>}
      <SectionTitle>Mes notifications</SectionTitle>
      {feed.length ? (
        <div className="list">
          {feed.map(n => (
            <div key={n.id} className="item">
              <span className="icon-tile" style={{ width: 34, height: 34, borderRadius: 11, background: n.date > seenBefore ? 'var(--teal-soft)' : 'var(--bg)', color: n.date > seenBefore ? '#0B6B74' : 'var(--navy)' }}>
                <Icon name={NOTIF_ICON[n.kind]} size={18} />
              </span>
              <div className="grow" style={{ gap: 1 }}><span style={{ fontSize: 14, fontWeight: 800 }}>{n.title}</span><span className="s">{n.body}</span></div>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, flex: 'none' }}>{relDay(n.date)}</span>
            </div>
          ))}
        </div>
      ) : <Empty>Rien de nouveau.</Empty>}
    </Screen>
  )
}
