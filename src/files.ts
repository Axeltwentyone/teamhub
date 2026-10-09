import QRCode from 'qrcode'
import { QR_PAYLOAD } from './data'

export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Enregistre un fichier comme une app : sur téléphone, feuille de partage native
 * (« Enregistrer l'image », Fichiers, WhatsApp…) ; ailleurs, téléchargement classique.
 * Un simple lien <a download> ne fonctionne pas dans une PWA installée sur iOS.
 */
export async function saveFile(blob: Blob, name: string, title?: string): Promise<SaveResult> {
  const file = new File([blob], name, { type: blob.type })
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title ?? name })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
      // Partage refusé (ex. type non autorisé) : on retombe sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('canvas vide'))), 'image/png'))

/** QR code seul, haute définition (niveau de correction élevé pour l'impression). */
export async function qrPng(size = 1200) {
  const c = document.createElement('canvas')
  await QRCode.toCanvas(c, QR_PAYLOAD, { width: size, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1F2A44', light: '#FFFFFF' } })
  return toBlob(c)
}

/** Affiche A4 (150 dpi) à imprimer et coller à l'entrée de l'agence. */
export async function qrPoster() {
  const W = 1240, H = 1754
  await Promise.all(['800 96px Manrope', '600 40px Manrope'].map(f => document.fonts?.load(f).catch(() => null)))
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const font = (w: number, px: number) => `${w} ${px}px Manrope, system-ui, sans-serif`

  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1F2A44'; g.fillRect(0, 0, W, 24)

  // Logo TH
  const L = 132, lx = (W - L) / 2, ly = 130
  g.fillStyle = '#1F2A44'; g.beginPath(); g.roundRect(lx, ly, L, L, 36); g.fill()
  g.fillStyle = '#FFFFFF'; g.font = font(800, 54); g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText('TH', W / 2, ly + L / 2 - 6)
  g.fillStyle = '#0FA3B1'; g.beginPath(); g.roundRect(W / 2 - 34, ly + L - 30, 68, 8, 4); g.fill()

  g.textBaseline = 'alphabetic'
  g.fillStyle = '#1F2A44'; g.font = font(800, 96); g.fillText('Pointage', W / 2, 400)
  g.fillStyle = '#4A5672'; g.font = font(600, 40); g.fillText('YesWeCange · TeamHub', W / 2, 462)

  // QR code dans un cadre aux coins turquoise (rappel du viseur de l'app)
  const Q = 820, qx = (W - Q) / 2, qy = 540
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, QR_PAYLOAD, { width: Q, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#1F2A44', light: '#FFFFFF' } })
  g.drawImage(qr, qx, qy, Q, Q)
  g.strokeStyle = '#0FA3B1'; g.lineWidth = 14; g.lineCap = 'round'
  const pad = 36, arm = 110, x0 = qx - pad, y0 = qy - pad, x1 = qx + Q + pad, y1 = qy + Q + pad
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    g.beginPath(); g.moveTo(x, y + dy * arm); g.lineTo(x, y); g.lineTo(x + dx * arm, y); g.stroke()
  }

  g.fillStyle = '#1F2A44'; g.font = font(800, 52); g.fillText("Scannez à l'arrivée et au départ", W / 2, 1530)
  g.fillStyle = '#5B6680'; g.font = font(600, 34)
  g.fillText('Ouvrez TeamHub › Scanner le QR code', W / 2, 1592)
  g.fillText('Premier scan = arrivée · dernier scan = départ', W / 2, 1640)

  return toBlob(c)
}
