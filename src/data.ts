import { isoDay } from './format'

export type Role = 'collab' | 'manager' | 'admin'

export interface Person {
  id: string
  name: string
  first: string
  ini: string
  color: string
  team: string
  role: Role
  poste: string
  statut: string
  since: string
  email: string
  phone: string
  momo: string
  fem: boolean
}

export type LeaveType = 'Congé annuel' | 'Permission' | 'Maladie' | 'Autre'
export type LeaveStatus = 'En attente' | 'Approuvé' | 'Refusé' | 'Annulé'
export interface Leave {
  id: string
  userId: string
  type: LeaveType
  from: string // premier jour d'absence
  to: string // jour de retour
  motif?: string
  status: LeaveStatus
  comment?: string
  createdAt: string
}

export type Transport = 'Taxi' | 'Woro' | 'VTC' | 'Autre'
export type PayMode = 'Espèces' | 'Mobile Money'
export type TripStatus = 'Envoyé' | 'Validé' | 'Remboursé' | 'Refusé'
export interface Trip {
  id: string
  userId: string
  date: string
  client: string
  place: string
  reason: string
  route: string
  transport: Transport
  roundTrip: boolean
  aller: number
  retour: number
  payMode: PayMode
  status: TripStatus
  retained?: number
  adminPay?: PayMode
  txRef?: string
  refundedAt?: string
  refuseReason?: string
  receipts: string[] // miniatures en data URL
}

export const ANN_TYPES = ['Naissance', 'Mariage', 'Dot', 'Décès', 'Maladie', 'Anniversaire', 'Information'] as const
export interface Announcement {
  id: string
  type: string
  title: string
  msg: string
  date: string
  dest: string[]
}

export interface Notif {
  id: string
  userId: string
  kind: 'trip' | 'leave' | 'ann'
  title: string
  body: string
  date: string
}

export interface Move {
  id: string
  label: string
  mode: string
  date: string
  amount: number // positif = entrée, négatif = sortie
  cat?: string
}

export interface DayScans { day: string; times: string[] }

export const TEAMS = ['Développeurs', 'Créa', 'Social media'] as const
export const TEAM_CAP: Record<string, number> = { 'Développeurs': 5000, 'Créa': 5000, 'Social media': 5000 }
export const CASH_CATS = ['Loyer', 'Électricité & eau', 'Internet', 'Déplacements', 'Fournitures', 'Divers'] as const
export const CAT_COLORS: Record<string, string> = {
  'Loyer': '#1F2A44', 'Électricité & eau': '#5A6888', 'Internet': '#3D7DC4', 'Déplacements': '#0FA3B1', 'Fournitures': '#C9D3E6', 'Divers': '#9AA4B8',
}
export const FIXED_CHARGE = { label: 'Électricité CIE', amount: 42000, cat: 'Électricité & eau', dueDay: 15 }

/** Heure limite d'arrivée avant retard. */
export const LATE_AFTER = { h: 9, m: 30 }
/** Contenu attendu dans le QR code affiché à l'entrée. */
export const QR_PAYLOAD = 'TEAMHUB:YESWECANGE:ENTREE'

const P = (id: string, name: string, color: string, team: string, role: Role, poste: string, fem: boolean, extra: Partial<Person> = {}): Person => {
  const [first, ...rest] = name.split(' ')
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ']/g, '').split(' ').join('.')
  return {
    id, name, first, color, team, role, poste, fem,
    ini: (first[0] + rest.join(' ').replace(/[^A-Za-zÀ-ÿ]/g, '')[0]).toUpperCase(),
    statut: 'CDI', since: '3 mars 2024', email: `${slug}@yeswecange.ci`, phone: '07 00 00 00 00', momo: 'Orange Money · 07 00 00 00 00',
    ...extra,
  }
}

export const PEOPLE: Person[] = [
  P('nk', 'Nelly Kouassi', '#0FA3B1', 'Développeurs', 'collab', 'Développeuse front-end', true, { phone: '07 58 12 34 90', momo: 'Orange Money · 07 58 12 34 90' }),
  P('an', "Axel N'Guessan", '#E07B39', 'Développeurs', 'collab', 'Développeur back-end', false),
  P('md', 'Mariam Diallo', '#6C5CA8', 'Créa', 'collab', 'Directrice artistique', true),
  P('ib', 'Ibrahim Bamba', '#2E9466', 'Développeurs', 'collab', 'Développeur mobile', false),
  P('yk', 'Yannick Kra', '#3D7DC4', 'Social media', 'collab', 'Community manager', false),
  P('fd', 'Fatou Diabaté', '#6C5CA8', 'Développeurs', 'collab', 'Développeuse full-stack', true),
  P('gy', 'Grâce Yao', '#3D7DC4', 'Développeurs', 'collab', 'Intégratrice', true),
  P('sk', 'Serge Koffi', '#8A5A44', 'Développeurs', 'collab', 'Développeur', false, { statut: 'Stage' }),
  P('kb', 'Kevin Boni', '#1F2A44', 'Développeurs', 'manager', 'Manager Développeurs', false, { since: '12 janv. 2022' }),
  P('at', 'Aminata Touré', '#B0476B', 'Administration', 'admin', 'Responsable administrative', true, { since: '5 sept. 2021' }),
]

export const person = (id: string) => PEOPLE.find(p => p.id === id)!

/** Comptes de démonstration proposés sur l'écran de connexion. */
export const DEMO_ACCOUNTS = [
  { id: 'nk', label: 'Collaboratrice' },
  { id: 'kb', label: 'Manager' },
  { id: 'at', label: 'Admin' },
]

// ——— Données de départ, datées relativement à aujourd'hui pour que la démo reste vivante ———

const today = () => new Date()
const d = (n: number) => { const x = today(); x.setDate(x.getDate() + n); return isoDay(x) }
/** Même jour, mais jamais avant le 1er du mois (pour la caisse « du mois »). */
const dm = (n: number) => { const x = today(); const m = x.getMonth(); x.setDate(x.getDate() + n); if (x.getMonth() !== m) { x.setMonth(m); x.setDate(1) } return isoDay(x) }
const at = (n: number, h: number, m: number) => { const x = today(); x.setDate(x.getDate() + n); x.setHours(h, m, 0, 0); return x.toISOString() }

/** Pointages fictifs des collègues pour la journée en cours (ils n'utilisent pas cet appareil). */
export function seedPresence(): Record<string, { times: string[]; away?: string }> {
  return {
    an: { times: [at(0, 9, 41)] },
    md: { times: [at(0, 9, 47)] },
    ib: { times: [at(0, 8, 45)], away: 'Orange CI' },
    yk: { times: [at(0, 8, 30)] },
    gy: { times: [at(0, 8, 40), at(0, 16, 2)] },
    sk: { times: [] },
    fd: { times: [] },
  }
}

/** Historique de pointage des jours ouvrés précédents. */
export function seedHistory(): DayScans[] {
  const patterns: ([number, number] | null)[][] = [
    [[8, 47], [17, 32]], [[9, 38], [18, 5]], [[8, 55], null], [[8, 50], [17, 15]], [], [[8, 44], [17, 20]], [[8, 58], [17, 41]],
  ]
  const out: DayScans[] = []
  const x = today()
  let i = 0
  while (out.length < patterns.length) {
    x.setDate(x.getDate() - 1)
    if (x.getDay() === 0 || x.getDay() === 6) continue
    const day = isoDay(x)
    const times = patterns[i++].filter(Boolean).map(t => { const y = new Date(x); y.setHours(t![0], t![1], 0, 0); return y.toISOString() })
    out.push({ day, times })
  }
  return out
}

export function seedState() {
  const now = new Date().toISOString()
  const leaves: Leave[] = [
    { id: 'l1', userId: 'nk', type: 'Congé annuel', from: d(75), to: d(80), status: 'En attente', createdAt: now },
    { id: 'l2', userId: 'nk', type: 'Permission', from: d(-18), to: d(-17), status: 'Approuvé', comment: 'Bon courage', createdAt: now },
    { id: 'l3', userId: 'nk', type: 'Autre', from: d(-60), to: d(-58), status: 'Refusé', comment: 'Période de livraison client, à reporter', createdAt: now },
    { id: 'l4', userId: 'an', type: 'Congé annuel', from: d(24), to: d(31), motif: 'Voyage familial à Yamoussoukro', status: 'En attente', createdAt: now },
    { id: 'l5', userId: 'fd', type: 'Congé annuel', from: d(-4), to: d(3), status: 'Approuvé', createdAt: now },
    { id: 'l6', userId: 'gy', type: 'Permission', from: d(35), to: d(36), status: 'Approuvé', createdAt: now },
    { id: 'l7', userId: 'md', type: 'Maladie', from: d(1), to: d(3), motif: 'Certificat médical fourni', status: 'En attente', createdAt: now },
  ]
  const trip = (t: Partial<Trip> & Pick<Trip, 'id' | 'userId' | 'date' | 'client' | 'place' | 'transport' | 'aller' | 'payMode' | 'status'>): Trip => ({
    reason: 'Rendez-vous client', route: 'Agence, Marcory → ' + t.place, roundTrip: false, retour: 0, receipts: [], ...t,
  })
  const trips: Trip[] = [
    trip({ id: 't1', userId: 'nk', date: d(0), client: 'Orange CI', place: 'Cocody', reason: 'Présentation des maquettes appli', route: 'Agence, Marcory → Cocody', transport: 'Taxi', roundTrip: true, aller: 1500, retour: 1500, payMode: 'Mobile Money', status: 'Envoyé' }),
    trip({ id: 't2', userId: 'nk', date: d(-3), client: 'Société Générale CI', place: 'Plateau', transport: 'VTC', aller: 4500, payMode: 'Espèces', status: 'Remboursé', retained: 4500, adminPay: 'Espèces', refundedAt: d(-2) }),
    trip({ id: 't3', userId: 'nk', date: d(-7), client: 'MTN', place: 'Riviera', transport: 'Woro', aller: 1200, payMode: 'Mobile Money', status: 'Remboursé', retained: 1200, adminPay: 'Mobile Money', txRef: 'MP231002.1452', refundedAt: d(-7) }),
    trip({ id: 't4', userId: 'nk', date: d(-10), client: 'Moov', place: 'Treichville', transport: 'Taxi', aller: 7000, payMode: 'Espèces', status: 'Refusé', refuseReason: 'Hors plafond équipe' }),
    trip({ id: 't5', userId: 'ib', date: d(0), client: 'Orange CI', place: 'Cocody', reason: 'Recette de l\'application', transport: 'Taxi', roundTrip: true, aller: 2000, retour: 2000, payMode: 'Espèces', status: 'Envoyé' }),
    trip({ id: 't6', userId: 'sk', date: d(-3), client: 'SGCI', place: 'Plateau', transport: 'VTC', aller: 3500, payMode: 'Mobile Money', status: 'Validé', retained: 3500 }),
  ]
  const anns: Announcement[] = [
    { id: 'a1', type: 'Naissance', title: 'Bienvenue au petit Ethan !', msg: 'Fernande et sa famille accueillent leur fils. Toutes nos félicitations.', date: at(-1, 10, 0), dest: ["Toute l'agence"] },
    { id: 'a2', type: 'Anniversaire', title: 'Joyeux anniversaire Grâce', msg: 'Gâteau à 16 h en salle de réunion.', date: at(-3, 9, 0), dest: ["Toute l'agence"] },
    { id: 'a3', type: 'Information', title: 'Fermeture le 15 novembre', msg: "L'agence sera fermée pour la Journée nationale de la paix.", date: at(-4, 9, 0), dest: ["Toute l'agence"] },
  ]
  const notifs: Notif[] = [
    { id: 'n1', userId: 'nk', kind: 'trip', title: 'Déplacement remboursé', body: 'MTN · 1 200 F CFA par Mobile Money', date: at(-7, 15, 0) },
    { id: 'n2', userId: 'nk', kind: 'leave', title: 'Congé approuvé', body: 'Permission · « Bon courage »', date: at(-21, 11, 0) },
    { id: 'n3', userId: 'nk', kind: 'trip', title: 'Déplacement refusé', body: 'Moov · 7 000 F CFA · hors plafond', date: at(-10, 17, 0) },
  ]
  const moves: Move[] = [
    { id: 'm1', label: 'Approvisionnement direction', mode: 'Espèces', date: dm(-30), amount: 600000 },
    { id: 'm2', label: 'Loyer', mode: 'Virement', date: dm(-30), amount: -120000, cat: 'Loyer' },
    { id: 'm3', label: 'Internet Orange Fibre', mode: 'Mobile Money', date: dm(-28), amount: -35000, cat: 'Internet' },
    { id: 'm4', label: 'Déplacement · Yannick Kra', mode: 'Espèces', date: dm(-9), amount: -6000, cat: 'Déplacements' },
    { id: 'm5', label: 'Déplacement · Nelly Kouassi', mode: 'Mobile Money', date: dm(-7), amount: -1200, cat: 'Déplacements' },
    { id: 'm6', label: 'Déplacement · Mariam Diallo', mode: 'Espèces', date: dm(-4), amount: -6800, cat: 'Déplacements' },
    { id: 'm7', label: 'Fournitures de bureau', mode: 'Espèces', date: dm(-2), amount: -14000, cat: 'Fournitures' },
    { id: 'm8', label: 'Déplacement · Nelly Kouassi', mode: 'Espèces', date: dm(-2), amount: -4500, cat: 'Déplacements' },
  ]
  return { leaves, trips, anns, notifs, moves }
}
