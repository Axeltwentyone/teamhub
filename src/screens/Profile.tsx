import { useNavigate } from 'react-router-dom'
import { useFeedback } from '../native'
import { useStore } from '../store'
import { Avatar, Icon, Screen } from '../ui'

const ROLE_LABEL = { collab: ['Collaborateur', 'Collaboratrice'], manager: ['Manager', 'Manager'], admin: ['Administrateur', 'Administratrice'] }

// C10 · Mon profil
export default function Profile() {
  const { me, logout, reset } = useStore()
  const nav = useNavigate()
  const { confirm, toast } = useFeedback()
  const p = me!
  const rows: [string, string, boolean?][] = [
    ['Poste', p.poste], ['Équipe', p.team], ['Statut', p.statut], ["Arrivée à l'agence", p.since],
    ['E-mail', p.email], ['Téléphone', p.phone, true], ['Mobile Money', p.momo, true],
  ]
  return (
    <Screen>
      <div className="col" style={{ alignItems: 'center', gap: 10, paddingTop: 12, textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Avatar ini={p.ini} color={p.color} size={88} />
          <span style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, background: 'var(--navy)', color: '#fff', border: '3px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={14} /></span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{p.name}</span>
        <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>{ROLE_LABEL[p.role][p.fem ? 1 : 0]} · {p.team}</span>
      </div>
      <div className="list">
        {rows.map(([k, v, editable]) => (
          <div key={k} className="item" style={{ padding: '13px 0' }}>
            <div className="grow"><span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{k}</span><span className="ellipsis" style={{ fontSize: 15, fontWeight: 700 }}>{v}</span></div>
            {editable ? <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal-ink)', flex: 'none' }}>Modifier</span> : <span style={{ color: 'var(--muted)', flex: 'none' }}><Icon name="lock" size={16} /></span>}
          </div>
        ))}
      </div>
      <span className="note" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ color: 'var(--muted)' }}><Icon name="lock" size={14} /></span>Modifiable uniquement par l'administration</span>
      <button className="link" style={{ fontSize: 14, color: 'var(--ink-3)' }} onClick={async () => { if (await confirm({ title: 'Réinitialiser la démo ?', message: 'Pointages, demandes et annonces reviennent aux données de départ.', confirm: 'Réinitialiser', destructive: true })) { reset(); toast('Données de démo réinitialisées', 'info') } }}>Réinitialiser la démo</button>
      <button onClick={async () => { if (await confirm({ confirm: 'Se déconnecter', destructive: true })) { logout(); nav('/', { replace: true }) } }} style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger-ink)', background: 'none', border: 'none', padding: 6 }}>Se déconnecter</button>
    </Screen>
  )
}
