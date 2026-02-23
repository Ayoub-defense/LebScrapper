import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveAuth, isLoggedIn } from '../hooks/useApi'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn()) { navigate('/dashboard'); return null }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/register', form)
      saveAuth(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`*{font-family:'DM Sans',sans-serif}.syne{font-family:'Syne',sans-serif}input:focus{border-color:rgba(251,191,36,.5)!important;outline:none}`}</style>

      <div className="fixed inset-0 bg-zinc-950 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center font-bold text-zinc-950">D</div>
            <span className="syne font-bold text-lg">DealHunter <span className="text-amber-400">AI</span></span>
          </Link>
          <h1 className="syne text-2xl font-bold">Créer un compte</h1>
          <p className="text-zinc-500 text-sm mt-1">Gratuit, sans carte bancaire</p>
        </div>
        <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">⚠️ {error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Prénom et nom</label>
              <input type="text" value={form.full_name} onChange={set('full_name')}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm transition text-white placeholder-zinc-600"
                placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm transition text-white placeholder-zinc-600"
                placeholder="vous@exemple.com" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Mot de passe <span className="text-zinc-600">(min. 8 caractères)</span>
              </label>
              <input type="password" required minLength={8} value={form.password} onChange={set('password')}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm transition text-white placeholder-zinc-600"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 py-3 rounded-xl font-bold text-sm transition">
              {loading ? 'Création...' : 'Créer mon compte →'}
            </button>
          </form>
          <p className="text-center text-zinc-600 text-xs mt-5">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
