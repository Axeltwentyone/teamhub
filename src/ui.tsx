import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { Role } from './data'
import { haptic } from './native'
import { usePage } from './stack'
import { useStore, unreadCount } from './store'

// ——— Icônes (tracés repris de la maquette) ———

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21H3z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  car: <><path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4z" /><circle cx="8" cy="14" r=".6" /><circle cx="16" cy="14" r=".6" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.6 5.2" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  qr: <><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><rect x="7" y="7" width="4" height="4" /><rect x="13" y="13" width="4" height="4" /><path d="M13 7h4v3M7 17v-3h3" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  flash: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  camera: <><path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
}

export function Icon({ name, size = 20, stroke = 2, style }: { name: keyof typeof ICONS | string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

// ——— Pastilles de statut ———

const PILL: Record<string, [string, string]> = {
  'Au bureau': ['#E3F5F7', '#0B6B74'], 'En retard': ['#FFF1E4', '#9A4A12'], 'Parti': ['#EEF1F6', '#4A5672'],
  'En congé': ['#EDEAF7', '#4B3F8A'], 'En déplacement': ['#E6F0FB', '#24578F'], 'Pas encore arrivé': ['#F4F6FA', '#5B6680'],
  'Absent': ['#FBE9E9', '#A33232'], 'En attente': ['#FFF1E4', '#9A4A12'], 'Approuvé': ['#E3F5F7', '#0B6B74'],
  'Refusé': ['#FBE9E9', '#A33232'], 'Envoyé': ['#E6F0FB', '#24578F'], 'Validé': ['#E3F5F7', '#0B6B74'],
  'Remboursé': ['#1F2A44', '#fff'], 'Départ non pointé': ['#FBE9E9', '#A33232'], 'Lecture seule': ['#EEF1F6', '#4A5672'],
  'Annulé': ['#EEF1F6', '#4A5672'],
}
export const pillColors = (label: string) => PILL[label] ?? PILL['Parti']

export function Pill({ label, style }: { label: string; style?: CSSProperties }) {
  const [bg, fg] = pillColors(label)
  return <span className="pill" style={{ background: bg, color: fg, ...style }}>{label}</span>
}

// ——— Briques de mise en page ———

export function Avatar({ ini, color, size = 36 }: { ini: string; color: string; size?: number }) {
  return <span className="avatar" style={{ width: size, height: size, background: color, fontSize: Math.round(size / 3) }}>{ini}</span>
}

const TitleCtx = createContext<(t: string) => void>(() => {})

/**
 * Un écran = son propre conteneur de défilement (comme une vue native).
 * Au scroll, une barre de titre compacte floutée apparaît en haut.
 */
export function Screen({ children, dark, cta }: { children: ReactNode; dark?: boolean; cta?: boolean }) {
  const { active, kind } = usePage()
  const ref = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [title, setTitle] = useState('')

  // Toucher l'onglet actif : retour en haut, comme sur iOS / Android.
  useEffect(() => {
    if (!active) return
    const top = () => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.addEventListener('th:tab-reselect', top)
    return () => window.removeEventListener('th:tab-reselect', top)
  }, [active])

  return (
    <TitleCtx.Provider value={setTitle}>
      <div className={'screen-wrap' + (dark ? ' dark' : '') + (scrolled ? ' scrolled' : '')}>
        {title && <div className="navbar" aria-hidden={!scrolled}><span>{title}</span></div>}
        <main ref={ref} className={'screen' + (cta ? ' has-cta' : '') + (kind === 'root' ? ' with-tabs' : '')}
          onScroll={e => setScrolled(e.currentTarget.scrollTop > 40)}>
          {children}
        </main>
      </div>
    </TitleCtx.Provider>
  )
}

export function PageHeader({ sub, title, right }: { sub: ReactNode; title: ReactNode; right?: ReactNode }) {
  const setTitle = useContext(TitleCtx)
  useLayoutEffect(() => { if (typeof title === 'string') setTitle(title) }, [title, setTitle])
  return (
    <header className="page-head">
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        <span className="sub">{sub}</span>
        <h1>{title}</h1>
      </div>
      {right}
    </header>
  )
}

/** En-tête d'écran secondaire : chevron retour (écran poussé) ou croix (modale), collant au scroll. */
export function BackHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  const { back, kind } = usePage()
  const modal = kind === 'modal'
  return (
    <header className="back-head">
      <button className="round-btn" aria-label={modal ? 'Fermer' : 'Retour'} onClick={back}>
        <Icon name={modal ? 'close' : 'back'} size={modal ? 16 : 18} stroke={modal ? 2.6 : 2.4} />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  )
}

/** Bouton rond « + » de l'en-tête (ouvre un formulaire en modale). */
export function AddButton({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="bell add" aria-label={label}><Icon name="plus" /></Link>
}

export function BellButton() {
  const { state, me } = useStore()
  const nav = useNavigate()
  const n = me ? unreadCount(state, me.id) : 0
  const to = me?.role === 'admin' ? '/admin/annonces' : '/annonces'
  return (
    <button className="bell" aria-label={n ? `${n} nouveautés` : 'Notifications'} onClick={() => nav(to)}>
      <Icon name="bell" />
      {n > 0 && <span className="dot" />}
    </button>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return right
    ? <div className="row-between" style={{ alignItems: 'baseline', marginBottom: -6 }}><span className="section-title">{children}</span>{right}</div>
    : <span className="section-title" style={{ marginBottom: -6 }}>{children}</span>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}{hint && <span style={{ fontWeight: 500 }}> {hint}</span>}</span>
      {children}
    </label>
  )
}

export function Chips<T extends string>({ options, value, onPick, cols, wrap }: {
  options: readonly T[]; value: T | T[]; onPick: (v: T) => void; cols?: number; wrap?: boolean
}) {
  const on = (o: T) => (Array.isArray(value) ? value.includes(o) : value === o)
  return (
    <div className={wrap ? 'chips wrap' : 'chips'} style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined} role="group">
      {options.map(o => (
        <button key={o} type="button" className={'chip' + (on(o) ? ' on' : '')} aria-pressed={on(o)} onClick={() => { haptic('light'); onPick(o) }}>{o}</button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={'toggle' + (on ? ' on' : '')} onClick={() => { haptic('light'); onChange(!on) }}>
      <span />
    </button>
  )
}

export function Stat({ label, value, style }: { label: string; value: ReactNode; style?: CSSProperties }) {
  return <div className="stat" style={style}><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>
}

export function CTA({ children }: { children: ReactNode }) {
  return <div className="cta-bar">{children}</div>
}

export function Segmented({ items }: { items: { label: string; to: string }[] }) {
  return (
    <nav className="segmented">
      {items.map(i => <NavLink key={i.to} to={i.to} end replace onClick={() => haptic('light')} className={({ isActive }) => (isActive ? 'on' : '')}>{i.label}</NavLink>)}
    </nav>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card empty">{children}</div>
}

// ——— Barre d'onglets « verre dépoli », un jeu par rôle ———

const TABS: Record<Role, { to: string; label: string; icon: string; end?: boolean }[]> = {
  collab: [
    { to: '/', label: 'Accueil', icon: 'home', end: true },
    { to: '/conges', label: 'Congés', icon: 'calendar' },
    { to: '/deplacements', label: 'Déplac.', icon: 'car' },
    { to: '/annonces', label: 'Annonces', icon: 'megaphone' },
    { to: '/profil', label: 'Profil', icon: 'user' },
  ],
  manager: [
    { to: '/', label: 'Accueil', icon: 'home', end: true },
    { to: '/equipe', label: 'Équipe', icon: 'users' },
    { to: '/conges/calendrier', label: 'Calendrier', icon: 'calendar' },
    { to: '/annonces', label: 'Annonces', icon: 'megaphone' },
    { to: '/profil', label: 'Profil', icon: 'user' },
  ],
  admin: [
    { to: '/admin/presences', label: 'Présences', icon: 'users' },
    { to: '/admin/demandes', label: 'Demandes', icon: 'inbox' },
    { to: '/admin/caisse', label: 'Caisse', icon: 'wallet' },
    { to: '/admin/annonces', label: 'Annonces', icon: 'megaphone' },
    { to: '/admin/exports', label: 'Exports', icon: 'download' },
  ],
}

const isTabActive = (t: { to: string; end?: boolean }, pathname: string) =>
  t.end ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + '/')

/** Barre d'onglets : changement sans historique (comme une app), re-toucher l'onglet remonte en haut. */
export function TabBar({ role, pathname }: { role: Role; pathname: string }) {
  const nav = useNavigate()
  const tabs = TABS[role]
  // L'onglet le plus spécifique gagne (« /conges/calendrier » pour le manager).
  const activeTab = tabs.filter(t => isTabActive(t, pathname)).sort((a, b) => b.to.length - a.to.length)[0]
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {tabs.map(t => {
        const on = t === activeTab
        return (
          <button key={t.to} className={'tab' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined}
            onClick={() => {
              haptic('light')
              if (on) window.dispatchEvent(new Event('th:tab-reselect'))
              else nav(t.to, { replace: true })
            }}>
            <Icon name={t.icon} stroke={on ? 2.2 : 2} />{t.label}
          </button>
        )
      })}
    </nav>
  )
}
