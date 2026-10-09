import { useState } from 'react'
import { dayShort } from '../format'
import { errorReason, fmtDistance, getPosition, GEO_MESSAGES, RADII } from '../geo'
import { useFeedback } from '../native'
import { useStore } from '../store'
import { Chips, Icon, SectionTitle } from '../ui'

/** Réglage admin : position de l'agence et rayon dans lequel le pointage est accepté. */
export default function OfficeLocation() {
  const { state, setOffice, setRadius } = useStore()
  const { confirm, toast } = useFeedback()
  const [busy, setBusy] = useState(false)
  const office = state.office

  const capture = async () => {
    if (busy) return
    setBusy(true)
    try {
      // Plusieurs mesures, on garde la plus précise (le premier point GPS est souvent approximatif).
      let best: GeolocationPosition | null = null
      for (let i = 0; i < 3; i++) {
        const p = await getPosition({ timeout: 15000 })
        if (!best || p.coords.accuracy < best.coords.accuracy) best = p
        if (best.coords.accuracy <= 25) break
      }
      const p = best!
      const acc = Math.round(p.coords.accuracy)
      const ok = await confirm({
        title: "Enregistrer cette position comme l'agence ?",
        message: `Précision ± ${fmtDistance(acc)}.${acc > 60 ? ' Mesure peu précise : réessayez près d\'une fenêtre si possible.' : ''} Vous devez être au bureau.`,
        confirm: 'Enregistrer',
      })
      if (!ok) return
      setOffice({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: acc, radius: office?.radius ?? 100, setAt: new Date().toISOString() })
      toast("Emplacement de l'agence enregistré")
    } catch (e) {
      toast(GEO_MESSAGES[errorReason(e as GeolocationPositionError)].title, 'error')
    } finally { setBusy(false) }
  }

  const remove = async () => {
    if (await confirm({ title: 'Supprimer l’emplacement ?', message: 'Tout le monde pourra pointer depuis n’importe où.', confirm: 'Supprimer', destructive: true })) {
      setOffice(null); toast('Restriction de lieu désactivée', 'info')
    }
  }

  return (
    <>
      <SectionTitle>Emplacement de l'agence</SectionTitle>
      <div className="card" style={{ gap: 14, padding: 16 }}>
        {office ? (
          <>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="icon-tile" style={{ background: 'var(--teal-soft)', color: '#0B6B74' }}><Icon name="pin" /></span>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Pointage limité au bureau</span>
                <span className="small muted" style={{ fontWeight: 600 }}>
                  {office.lat.toFixed(5)}, {office.lng.toFixed(5)} · précision ± {fmtDistance(office.accuracy)} · {dayShort(office.setAt.slice(0, 10))}
                </span>
                <a href={`https://www.google.com/maps?q=${office.lat},${office.lng}`} target="_blank" rel="noreferrer" className="link" style={{ marginTop: 4 }}>Voir sur la carte</a>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Rayon accepté autour du bureau</span>
              <Chips options={RADII.map(r => `${r} m`)} value={`${office.radius} m`} onPick={v => setRadius(parseInt(v, 10))} cols={4} />
            </div>
            <div className="grid2">
              <button className="btn ghost sm" style={{ width: '100%' }} disabled={busy} onClick={capture}>{busy ? 'Localisation…' : 'Mettre à jour'}</button>
              <button className="btn ghost sm" style={{ width: '100%', color: 'var(--danger-ink)' }} onClick={remove}>Désactiver</button>
            </div>
          </>
        ) : (
          <>
            <div className="banner warn" style={{ padding: 14 }}>
              <Icon name="alert" size={18} style={{ flex: 'none', marginTop: 2 }} />
              <span>Non configuré : pour l'instant, on peut pointer depuis n'importe où.</span>
            </div>
            <span className="note">Depuis le bureau, enregistrez sa position. Ensuite, le scan du QR code ne sera accepté que si le téléphone est sur place.</span>
            <button className="btn sm" style={{ width: '100%' }} disabled={busy} onClick={capture}>
              <Icon name="pin" size={18} />{busy ? 'Localisation…' : 'Définir avec ma position actuelle'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
