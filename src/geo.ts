// Vérification de présence au bureau par GPS : le pointage n'est accepté que sur place.

export interface Office {
  lat: number
  lng: number
  radius: number // mètres
  accuracy: number // précision de la mesure lors de l'enregistrement
  setAt: string
}

export const RADII = [50, 100, 200, 500] as const

export type GeoFail = 'outside' | 'denied' | 'inaccurate' | 'unavailable' | 'timeout' | 'unsupported'
export type GeoCheck =
  | { ok: true; distance?: number; accuracy?: number }
  | { ok: false; reason: GeoFail; distance?: number; accuracy?: number }

/** Distance en mètres entre deux points (formule de haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const fmtDistance = (m: number) =>
  m < 100 ? `${Math.round(m)} m` : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`

/**
 * Règle : dans le rayon → OK. Petite tolérance pour l'imprécision du GPS en intérieur (jusqu'à 50 m).
 * Hors rayon avec une mesure très imprécise → on demande de réessayer plutôt que de refuser à tort.
 */
export function evaluate(pos: GeolocationPosition, office: Office): GeoCheck {
  const distance = distanceM({ lat: pos.coords.latitude, lng: pos.coords.longitude }, office)
  const accuracy = pos.coords.accuracy
  if (distance <= office.radius + Math.min(accuracy, 50)) return { ok: true, distance, accuracy }
  if (accuracy > 100 && distance - accuracy <= office.radius) return { ok: false, reason: 'inaccurate', distance, accuracy }
  return { ok: false, reason: 'outside', distance, accuracy }
}

export function getPosition(opts: PositionOptions = {}) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: 0 })
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0, ...opts })
  })
}

export const errorReason = (e: { code?: number }): GeoFail =>
  e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : e.code === 2 ? 'unavailable' : 'unsupported'

export const GEO_MESSAGES: Record<GeoFail, { title: string; body: (c: GeoCheck, o: Office) => string }> = {
  outside: {
    title: "Vous n'êtes pas au bureau",
    body: (c, o) => `Vous êtes à ${fmtDistance(c.distance ?? 0)} de l'agence. Le pointage n'est possible que sur place (rayon de ${o.radius} m).`,
  },
  denied: {
    title: 'Localisation refusée',
    body: () => "TeamHub a besoin de votre position pour vérifier que vous êtes au bureau. Autorisez la localisation pour TeamHub dans les réglages du téléphone, puis réessayez.",
  },
  inaccurate: {
    title: 'Position trop imprécise',
    body: c => `Précision actuelle : ± ${fmtDistance(c.accuracy ?? 0)}. Activez la localisation précise (GPS) et réessayez, si possible près d'une fenêtre.`,
  },
  timeout: { title: 'Position introuvable', body: () => 'La localisation met trop de temps à répondre. Vérifiez qu’elle est activée puis réessayez.' },
  unavailable: { title: 'Position introuvable', body: () => 'Impossible d’obtenir votre position. Vérifiez que la localisation est activée puis réessayez.' },
  unsupported: { title: 'Localisation indisponible', body: () => 'Cet appareil ou ce navigateur ne permet pas de vérifier votre position.' },
}
