import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { animate, motion, motionValue, useTransform, type MotionValue } from 'motion/react'
import { haptic, isIOS, isStandalone } from './native'

/**
 * Navigation en pile façon app native :
 * - onglets (racines) : bascule instantanée, chaque onglet visité reste monté (scroll et état conservés) ;
 * - écrans poussés : glissent depuis la droite, l'écran dessous recule en parallaxe, retour par swipe depuis le bord ;
 * - modales (scan, formulaires) : montent du bas, se ferment en tirant vers le bas.
 */

export type Kind = 'root' | 'push' | 'modal'

const MODAL = [/^\/scan$/, /\/nouveau$/, /\/nouvelle$/]
const PUSH = [/^\/historique$/, /^\/admin\/(conges|deplacements)\/[^/]+$/]
export const kindOf = (path: string): Kind => (MODAL.some(r => r.test(path)) ? 'modal' : PUSH.some(r => r.test(path)) ? 'push' : 'root')

const PARENT: [RegExp, string][] = [
  [/^\/(scan|historique)$/, '/'],
  [/^\/conges\/nouveau$/, '/conges'],
  [/^\/deplacements\/nouveau$/, '/deplacements'],
  [/^\/admin\/annonces\/nouvelle$/, '/admin/annonces'],
  [/^\/admin\/conges\//, '/admin/demandes'],
  [/^\/admin\/deplacements\//, '/admin/demandes/deplacements'],
]
export const parentOf = (path: string) => PARENT.find(([r]) => r.test(path))?.[1] ?? '/'

const EASE = [0.32, 0.72, 0, 1] as const
const DURATION = 0.42

interface Entry { id: number; loc: Location; kind: Kind; x: MotionValue<number>; y: MotionValue<number>; enter: boolean; leaving: boolean }

let nextId = 1
const makeEntry = (loc: Location, kind: Kind, enter: boolean): Entry =>
  ({ id: nextId++, loc, kind, x: motionValue(0), y: motionValue(0), enter, leaving: false })

// ——— Contexte de page : savoir si l'écran est au premier plan, et revenir en arrière ———

interface PageCtx { active: boolean; kind: Kind; back: () => void }
const PageContext = createContext<PageCtx>({ active: true, kind: 'root', back: () => {} })
export const usePage = () => useContext(PageContext)

/** Retour natif : historique si possible, sinon l'écran parent (lien profond). */
function useBack() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) nav(-1)
    else nav(parentOf(pathname), { replace: true })
  }, [nav, pathname])
}

export function StackNavigator({ render, tabBar }: { render: (loc: Location) => ReactNode; tabBar: (pathname: string) => ReactNode }) {
  const location = useLocation()
  const back = useBack()
  const box = useRef<HTMLDivElement>(null)
  const [stack, setStack] = useState<Entry[]>(() => {
    const k = kindOf(location.pathname)
    // Lien profond vers un écran secondaire : on reconstitue son parent dessous.
    if (k === 'root') return [makeEntry(location, 'root', false)]
    const parentLoc = { ...location, pathname: parentOf(location.pathname), search: '', hash: '', key: 'parent', state: null }
    return [makeEntry(parentLoc, 'root', false), makeEntry(location, k, false)]
  })
  const parked = useRef(new Map<string, Entry>())
  const current = useRef(stack)
  current.current = stack

  useLayoutEffect(() => {
    const prev = current.current
    const top = prev[prev.length - 1]
    if (top.loc.key === location.key) return
    const path = location.pathname, kind = kindOf(path)
    const live = prev.filter(e => !e.leaving)

    // Retour vers un écran déjà dans la pile : on dépile au-dessus.
    const idx = live.findIndex(e => e.loc.pathname === path)
    if (idx >= 0 && idx < live.length - 1) {
      setStack(prev.map(e => (live.indexOf(e) > idx ? { ...e, leaving: true } : e.loc.pathname === path ? { ...e, loc: location } : e)))
      return
    }

    if (kind === 'root') {
      const base = live[0]
      let root = base.kind === 'root' && base.loc.pathname === path ? base : parked.current.get(path)
      if (base.kind === 'root' && base !== root) parked.current.set(base.loc.pathname, base)
      if (root) { parked.current.delete(path); root = { ...root, loc: location } } else root = makeEntry(location, 'root', false)
      root.x.set(0)
      // Un écran poussé est au-dessus : il sort en glissant, la nouvelle racine apparaît dessous.
      setStack([root, ...live.slice(1).map(e => ({ ...e, leaving: true }))])
      return
    }

    haptic('light')
    setStack([...prev, makeEntry(location, kind, true)])
  }, [location])

  // Clavier (ordinateur) : Échap ferme la modale ou revient en arrière.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || kindOf(location.pathname) === 'root') return
      if (document.querySelector('.sheet-backdrop')) return // une feuille ouverte se ferme d'abord
      back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname, back])

  const remove = useCallback((id: number) => setStack(s => s.filter(e => e.id !== id)), [])
  const width = () => box.current?.offsetWidth ?? window.innerWidth
  const height = () => box.current?.offsetHeight ?? window.innerHeight

  // Les racines « garées » restent montées mais cachées : changer d'onglet est instantané et garde le scroll.
  const parkedEntries = [...parked.current.values()]

  const topLive = [...stack].reverse().find(e => !e.leaving)

  return (
    <div className="stack" ref={box}>
      {/* Une seule liste (clés stables) : une racine passe de « garée » à visible sans être remontée. */}
      {[...parkedEntries.map(e => ({ e, parked: true })), ...stack.map(e => ({ e, parked: false }))].map(({ e, parked: isParked }) => {
        const i = stack.indexOf(e)
        return (
          <StackPage key={e.id} entry={e} index={i} above={isParked ? undefined : stack[i + 1]} active={e === topLive} parked={isParked}
            width={width} height={height} onRemoved={remove} back={back}>
            {render(e.loc)}
            {e.kind === 'root' && tabBar(e.loc.pathname)}
          </StackPage>
        )
      })}
    </div>
  )
}

const zero = motionValue(0)

function StackPage({ entry, index, above, active, parked, width, height, onRemoved, back, children }: {
  entry: Entry; index: number; above?: Entry; active: boolean; parked: boolean; width: () => number; height: () => number
  onRemoved: (id: number) => void; back: () => void; children: ReactNode
}) {
  const { x, y, kind } = entry

  // Entrée animée
  useLayoutEffect(() => {
    if (!entry.enter) return
    if (kind === 'push') { x.set(width()); animate(x, 0, { duration: DURATION, ease: EASE }) }
    if (kind === 'modal') { y.set(height()); animate(y, 0, { duration: DURATION + .04, ease: EASE }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sortie animée, puis retrait de la pile
  useEffect(() => {
    if (!entry.leaving) return
    const c = kind === 'modal'
      ? animate(y, height(), { duration: DURATION - .06, ease: EASE })
      : animate(x, width(), { duration: DURATION - .06, ease: EASE })
    c.then(() => onRemoved(entry.id))
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.leaving])

  // Parallaxe + voile quand un écran poussé recouvre celui-ci
  const coverX = above?.kind === 'push' ? above.x : zero
  const covered = !!above && above.kind === 'push'
  const underX = useTransform(coverX, v => (covered ? (v / width() - 1) * width() * 0.3 : 0))
  const dim = useTransform(coverX, v => (covered ? 0.12 * (1 - v / width()) : 0))
  const coverY = above?.kind === 'modal' ? above.y : zero
  const modalDim = useTransform(coverY, v => (above?.kind === 'modal' ? 0.25 * (1 - v / height()) : 0))

  // ——— Gestes ———
  const drag = useRef<{ start: number; last: number; t: number; v: number; axis: 'x' | 'y'; moved: boolean } | null>(null)
  const swipeEnabled = !(isIOS() && !isStandalone()) // Safari onglet : le geste natif du navigateur s'en charge déjà

  const onDown = (axis: 'x' | 'y') => (ev: React.PointerEvent) => {
    if (!active) return
    const p = axis === 'x' ? ev.clientX : ev.clientY
    drag.current = { start: p, last: p, t: performance.now(), v: 0, axis, moved: false }
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  }
  const onMove = (ev: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = d.axis === 'x' ? ev.clientX : ev.clientY, now = performance.now()
    d.v = (p - d.last) / Math.max(1, now - d.t); d.last = p; d.t = now
    const off = Math.max(0, p - d.start)
    if (off > 4) d.moved = true
    ;(d.axis === 'x' ? x : y).set(off)
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const mv = d.axis === 'x' ? x : y, size = d.axis === 'x' ? width() : height()
    if (mv.get() > size * 0.33 || (d.v > 0.5 && mv.get() > 20)) { haptic('light'); back() }
    else animate(mv, 0, { type: 'spring', stiffness: 500, damping: 40 })
  }
  const handlers = (axis: 'x' | 'y') => ({ onPointerDown: onDown(axis), onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp })

  return (
    <motion.div className={'stack-page ' + kind} style={{
        x: kind === 'push' ? x : underX, y: kind === 'modal' ? y : 0,
        zIndex: parked ? 0 : index + 1, pointerEvents: entry.leaving || parked ? 'none' : undefined,
        // visibility (et non display:none) : la position de défilement de l'onglet est conservée.
        visibility: parked ? 'hidden' : undefined,
      }}
      inert={!active && !entry.leaving ? true : undefined} aria-hidden={!active}>
      <PageContext.Provider value={{ active, kind, back }}>{children}</PageContext.Provider>
      {kind === 'push' && swipeEnabled && <div className="edge-swipe" {...handlers('x')} />}
      {kind === 'modal' && <div className="modal-grab" {...handlers('y')} />}
      {covered && <motion.div className="page-dim" style={{ opacity: dim }} />}
      {above?.kind === 'modal' && <motion.div className="page-dim" style={{ opacity: modalDim }} />}
    </motion.div>
  )
}
