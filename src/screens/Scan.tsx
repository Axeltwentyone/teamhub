import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { LATE_AFTER, QR_PAYLOAD } from '../data'
import { hm } from '../format'
import { errorReason, evaluate, GEO_MESSAGES, getPosition, type GeoCheck, type Office } from '../geo'
import { haptic, useStatusBar } from '../native'
import { usePage } from '../stack'
import { isLate, presenceOf, useStore } from '../store'
import { CTA, Icon, Screen } from '../ui'

type Cam = 'starting' | 'live' | 'denied' | 'unsupported'

/** Caméra arrière + décodage QR image par image (jsQR, fonctionne aussi sur iOS). */
function useQrCamera(active: boolean, onCode: (data: string) => void) {
  const video = useRef<HTMLVideoElement>(null)
  const [cam, setCam] = useState<Cam>('starting')
  const [torch, setTorch] = useState<boolean | null>(null)
  const track = useRef<MediaStreamTrack | null>(null)
  const cb = useRef(onCode)
  cb.current = onCode

  useEffect(() => {
    if (!active) return
    if (!navigator.mediaDevices?.getUserMedia) { setCam('unsupported'); return }
    let stream: MediaStream | null = null, raf = 0, stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const tick = () => {
      if (stopped) return
      const v = video.current
      if (v && v.readyState >= 2) {
        const w = 360, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
        canvas.width = w; canvas.height = h
        ctx.drawImage(v, 0, 0, w, h)
        const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
        if (code?.data) cb.current(code.data)
      }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 180)
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        track.current = s.getVideoTracks()[0]
        const caps = (track.current.getCapabilities?.() ?? {}) as { torch?: boolean }
        setTorch(caps.torch ? false : null)
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}) }
        setCam('live')
        tick()
      })
      .catch(() => setCam('denied'))

    return () => { stopped = true; clearTimeout(raf); stream?.getTracks().forEach(t => t.stop()); track.current = null }
  }, [active])

  const toggleTorch = () => {
    if (torch === null || !track.current) return
    const next = !torch
    track.current.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }).then(() => setTorch(next)).catch(() => setTorch(null))
  }

  return { video, cam, torch, toggleTorch }
}

type Phase = 'scan' | 'checking' | 'blocked' | 'done'

/**
 * Suit la position dès l'ouverture du scan, pour que la vérification soit quasi instantanée
 * au moment où le QR est lu. Sans emplacement d'agence configuré, aucune restriction.
 */
function useOfficeCheck(office: Office | null, active: boolean) {
  const latest = useRef<GeolocationPosition | null>(null)
  useEffect(() => {
    if (!office || !active || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(p => { latest.current = p }, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 })
    return () => navigator.geolocation.clearWatch(id)
  }, [office, active])

  return useCallback(async (): Promise<GeoCheck> => {
    if (!office) return { ok: true }
    if (!navigator.geolocation) return { ok: false, reason: 'unsupported' }
    const p = latest.current
    if (p && Date.now() - p.timestamp < 30000) {
      const r = evaluate(p, office)
      if (r.ok) return r
    }
    try { return evaluate(await getPosition(), office) } catch (e) { return { ok: false, reason: errorReason(e as GeolocationPositionError) } }
  }, [office])
}

// C2 · Pointage par QR code, accepté uniquement au bureau (GPS)
export default function Scan() {
  const { state, me, scan } = useStore()
  const { back } = usePage()
  useStatusBar('#10151F')
  const [phase, setPhase] = useState<Phase>('scan')
  const [wrong, setWrong] = useState(false)
  const [fail, setFail] = useState<GeoCheck | null>(null)
  const office = state.office
  const checkOffice = useOfficeCheck(office, phase !== 'done')

  const register = useCallback(async () => {
    setPhase('checking')
    const r = await checkOffice()
    if (!r.ok) { haptic('error'); setFail(r); setPhase('blocked'); return }
    scan()
    haptic('success')
    setPhase('done')
  }, [scan, checkOffice])

  const onCode = useCallback((data: string) => {
    if (phase !== 'scan') return
    if (data.trim().toUpperCase() === QR_PAYLOAD) register()
    else { if (!wrong) haptic('warning'); setWrong(true) }
  }, [phase, register, wrong])

  const { video, cam, torch, toggleTorch } = useQrCamera(phase === 'scan' || phase === 'checking', onCode)

  const pr = presenceOf(state, me!.id)
  const times = pr.times, n = times.length
  const left = n >= 2 && n % 2 === 0
  const late = n === 1 && isLate(times[0])
  const msg = n === 0 ? '' : n === 1 ? 'Arrivée enregistrée à ' + hm(times[0]) : left ? 'Départ enregistré à ' + hm(times[n - 1]) : 'Retour enregistré à ' + hm(times[n - 1])
  const rows = times.map((t, i) => ({ t, label: i === 0 ? 'Arrivée' : left && i === n - 1 ? 'Départ' : 'Scan intermédiaire' }))
  const failMsg = fail && !fail.ok && office ? GEO_MESSAGES[fail.reason] : null

  return (
    <Screen dark cta>
      <div className="row-between">
        <button className="round-btn" aria-label="Fermer" onClick={back}><Icon name="close" size={16} stroke={2.6} /></button>
        <span style={{ fontSize: 17, fontWeight: 800 }}>Pointage</span>
        <button className="round-btn" aria-label="Lampe torche" aria-pressed={!!torch} disabled={torch === null}
          onClick={toggleTorch} style={{ opacity: torch === null ? .4 : 1, background: torch ? 'var(--teal)' : undefined }}>
          <Icon name="flash" size={18} />
        </button>
      </div>

      {(phase === 'scan' || phase === 'checking') && (
        <div className="col" style={{ alignItems: 'center', gap: 28, paddingTop: 40 }}>
          <div className="viewfinder">
            <video ref={video} playsInline muted style={{ opacity: cam === 'live' ? 1 : 0 }} />
            {cam !== 'live' && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8D9AB5', textAlign: 'center', padding: 40, position: 'relative' }}>
                {cam === 'starting' ? 'Aperçu caméra' : cam === 'denied' ? "Autorisez l'accès à la caméra pour scanner" : 'Caméra indisponible sur cet appareil'}
              </span>
            )}
            <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
            {phase === 'checking'
              ? <div className="locating"><span className="spinner" />Vérification de votre position…</div>
              : <div className="laser" />}
          </div>
          <div className="col" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{wrong ? 'QR code non reconnu' : 'Visez le QR code TeamHub'}</span>
            <span style={{ fontSize: 15, color: 'var(--soft)', lineHeight: 1.45, maxWidth: 290, textWrap: 'pretty' }}>
              {wrong ? "Ce n'est pas le code de l'agence. Visez celui affiché à l'entrée." : "Affiché à l'entrée de l'agence. Premier scan = arrivée, dernier scan = départ."}
            </span>
            {office && <span className="geo-chip"><Icon name="pin" size={14} />Pointage possible uniquement au bureau</span>}
          </div>
        </div>
      )}

      {phase === 'blocked' && failMsg && fail && office && (
        <div className="col" style={{ alignItems: 'center', gap: 16, paddingTop: 48, textAlign: 'center' }}>
          <div className="pop" style={{ width: 100, height: 100, borderRadius: 50, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pin" size={46} stroke={2.4} />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800 }}>{failMsg.title}</span>
          <span style={{ fontSize: 15, color: 'var(--soft)', lineHeight: 1.5, maxWidth: 320, textWrap: 'pretty' }}>{failMsg.body(fail, office)}</span>
          <span style={{ fontSize: 13, color: '#8D9AB5' }}>Aucun pointage n'a été enregistré.</span>
        </div>
      )}

      {phase === 'done' && (
        <>
          <div className="col" style={{ alignItems: 'center', gap: 18, paddingTop: 36, textAlign: 'center' }}>
            <div className="pop" style={{ width: 100, height: 100, borderRadius: 50, background: late ? '#E07B39' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={48} stroke={2.8} />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{msg}</span>
            {late && <span style={{ fontSize: 14, fontWeight: 800, padding: '6px 14px', borderRadius: 20, background: '#F2A46E', color: '#3D1A00' }}>En retard · après {LATE_AFTER.h} h {LATE_AFTER.m}</span>}
          </div>
          <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 18, padding: '4px 16px' }} className="col">
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--soft)', padding: '12px 0 4px' }}>Scans du jour</span>
            {rows.map(r => (
              <div key={r.t} className="row-between" style={{ padding: '11px 0', borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 15 }}>
                <span style={{ color: 'var(--soft)' }}>{r.label}</span><span style={{ fontWeight: 800 }} className="tabular">{hm(r.t)}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--soft)', textAlign: 'center', lineHeight: 1.4 }}>Tous les scans restent dans l'historique. Seuls le premier et le dernier comptent.</span>
        </>
      )}

      <CTA>
        {phase === 'done' && <button className="btn white" onClick={back}>Terminé</button>}
        {phase === 'blocked' && <>
          <button className="btn ghost" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'transparent' }} onClick={back}>Fermer</button>
          <button className="btn" onClick={register}>Réessayer</button>
        </>}
        {(phase === 'scan' || phase === 'checking') && (
          <button className="btn" onClick={register} disabled={phase === 'checking'} title="Pointage sans caméra (démo)">
            {phase === 'checking' ? 'Vérification…' : cam === 'live' ? 'Pointer sans scanner (démo)' : 'Simuler le scan'}
          </button>
        )}
      </CTA>
    </Screen>
  )
}
