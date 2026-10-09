import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS, PEOPLE, person } from '../data'
import { useStore } from '../store'
import { CTA, Field, Screen } from '../ui'

// C0 · Connexion — authentification de démonstration : l'identifiant choisit le compte, aucun mot de passe n'est vérifié.
export default function Login() {
  const { login } = useStore()
  const nav = useNavigate()
  const [id, setId] = useState('nelly.kouassi@yeswecange.ci')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = id.trim().toLowerCase().replace(/\s/g, '')
    const p = PEOPLE.find(x => x.email === q || x.phone.replace(/\s/g, '') === q)
    if (!p || !['nk', 'kb', 'at'].includes(p.id)) return setError('Aucun compte de démonstration ne correspond à cet identifiant.')
    if (!pwd) return setError('Saisissez votre mot de passe.')
    enter(p.id)
  }
  const enter = (pid: string) => { login(pid); nav(person(pid).role === 'admin' ? '/admin/presences' : '/', { replace: true }) }

  return (
    <Screen cta>
      <form id="login" onSubmit={submit} className="col" style={{ gap: 18 }}>
        <div className="col" style={{ gap: 10, paddingTop: 56 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>TH</div>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, paddingTop: 10 }}>Bienvenue sur TeamHub</span>
          <span style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.45 }}>YesWeCange · Suivi des collaborateurs</span>
        </div>
        <Field label="E-mail ou numéro de téléphone">
          <input className="input" value={id} onChange={e => { setId(e.target.value); setError('') }} autoComplete="username" inputMode="email" autoCapitalize="none" />
        </Field>
        <Field label="Mot de passe">
          <input className="input" type="password" value={pwd} onChange={e => { setPwd(e.target.value); setError('') }} autoComplete="current-password" placeholder="••••••••" />
        </Field>
        {error && <span className="err">{error}</span>}
        <button type="button" className="link" style={{ fontSize: 14, alignSelf: 'flex-start' }} onClick={() => setError("Contactez l'administration pour réinitialiser votre mot de passe.")}>Mot de passe oublié ?</button>
        <div className="col" style={{ gap: 8, paddingTop: 8 }}>
          <span className="field-label">Accès démo</span>
          <div className="chips" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {DEMO_ACCOUNTS.map(a => (
              <button key={a.id} type="button" className="chip" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 6px', lineHeight: 1.2 }} onClick={() => enter(a.id)}>
                <span>{a.label}</span><span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{person(a.id).first}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
      <CTA><button className="btn" type="submit" form="login">Se connecter</button></CTA>
    </Screen>
  )
}
