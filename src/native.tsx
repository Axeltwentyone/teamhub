import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'

// ——— Retour haptique (Android ; ignoré silencieusement ailleurs) ———

const PATTERNS = { light: 8, medium: 14, success: [10, 40, 18], warning: [18, 60, 18], error: [24, 50, 24, 50, 24] }
export function haptic(kind: keyof typeof PATTERNS = 'light') {
  try { navigator.vibrate?.(PATTERNS[kind]) } catch { /* non supporté */ }
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
// iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/** Couleur de la barre d'état (Android, et iOS en mode installé). */
export function useStatusBar(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', color)
    return () => { if (prev) meta?.setAttribute('content', prev) }
  }, [color])
}

// ——— Feuille modale glissable ———

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const controls = useDragControls()
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="bd" className="sheet-backdrop" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }}>
          <motion.div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            drag="y" dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 1 }} onDragEnd={onDragEnd}>
            <div className="sheet-handle" onPointerDown={e => controls.start(e)}><div className="sheet-grip" /></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ——— Toasts & feuilles d'action (remplacent alert/confirm du navigateur) ———

interface ActionOpts { title?: string; message?: string; confirm: string; destructive?: boolean; cancel?: string }
interface Feedback {
  toast: (text: string, kind?: 'success' | 'info' | 'error') => void
  confirm: (o: ActionOpts) => Promise<boolean>
}
const FeedbackCtx = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; text: string; kind: string } | null>(null)
  const [action, setAction] = useState<(ActionOpts & { resolve: (v: boolean) => void }) | null>(null)
  const timer = useRef(0)

  const showToast = useCallback((text: string, kind: 'success' | 'info' | 'error' = 'success') => {
    haptic(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'light')
    clearTimeout(timer.current)
    setToast({ id: Date.now(), text, kind })
    timer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const confirm = useCallback((o: ActionOpts) => new Promise<boolean>(resolve => { haptic('medium'); setAction({ ...o, resolve }) }), [])
  const close = (v: boolean) => { action?.resolve(v); setAction(null) }

  return (
    <FeedbackCtx.Provider value={{ toast: showToast, confirm }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className={'toast ' + toast.kind} role="status"
            initial={{ y: -80, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: -80, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 1, bottom: 0 }} onDragEnd={(_, i) => { if (i.offset.y < -20) setToast(null) }}>
            <span className="toast-ic">{toast.kind === 'error' ? '!' : '✓'}</span>{toast.text}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {action && (
          <motion.div key="as" className="sheet-backdrop" onClick={() => close(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="action-sheet" onClick={e => e.stopPropagation()} role="alertdialog" aria-label={action.title ?? action.confirm}
              initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={{ type: 'spring', damping: 34, stiffness: 400 }}>
              <div className="as-group">
                {(action.title || action.message) && (
                  <div className="as-head">{action.title && <b>{action.title}</b>}{action.message && <span>{action.message}</span>}</div>
                )}
                <button className={'as-btn' + (action.destructive ? ' danger' : '')} onClick={() => close(true)}>{action.confirm}</button>
              </div>
              <button className="as-btn as-cancel" onClick={() => close(false)}>{action.cancel ?? 'Annuler'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FeedbackCtx.Provider>
  )
}

export function useFeedback() {
  const v = useContext(FeedbackCtx)
  if (!v) throw new Error('useFeedback hors FeedbackProvider')
  return v
}

// ——— Invitation à installer l'app (une seule fois) ———

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const DISMISS_KEY = 'teamhub:install-dismissed'

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [open, setOpen] = useState(false)
  const ios = isIOS()

  useEffect(() => {
    if (isStandalone()) return
    let dismissed = false
    try { dismissed = !!localStorage.getItem(DISMISS_KEY) } catch { /* ignore */ }
    if (dismissed) return
    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setTimeout(() => setOpen(true), 1500) }
    window.addEventListener('beforeinstallprompt', onBIP)
    const t = ios ? setTimeout(() => setOpen(true), 2500) : 0
    return () => { window.removeEventListener('beforeinstallprompt', onBIP); clearTimeout(t) }
  }, [ios])

  const dismiss = () => { setOpen(false); try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ } }
  const install = async () => { if (!evt) return; await evt.prompt(); await evt.userChoice; dismiss() }

  return (
    <Sheet open={open} onClose={dismiss} label="Installer TeamHub">
      <div className="row" style={{ gap: 14 }}>
        <img src="/pwa-192x192.png" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Installer TeamHub</span>
          <span className="small muted" style={{ fontWeight: 600 }}>Plein écran, accès depuis l'écran d'accueil, fonctionne hors connexion.</span>
        </div>
      </div>
      {ios ? (
        <ol className="install-steps">
          <li>Touchez <b>Partager</b> <ShareIcon /> en bas de Safari</li>
          <li>Choisissez <b>Sur l'écran d'accueil</b></li>
          <li>Touchez <b>Ajouter</b></li>
        </ol>
      ) : null}
      <div className="grid2">
        <button className="btn ghost" onClick={dismiss}>Plus tard</button>
        {ios ? <button className="btn" onClick={dismiss}>Compris</button> : <button className="btn" onClick={install} disabled={!evt}>Installer</button>}
      </div>
    </Sheet>
  )
}

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px' }}>
    <path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)
