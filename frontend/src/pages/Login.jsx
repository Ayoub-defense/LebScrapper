import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveAuth, isLoggedIn } from '../hooks/useApi'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ FIX : redirection dans useEffect, pas pendant le render
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard')
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('username', email)
      form.append('password', password)
      const data = await api.postForm('/auth/token', form)
      saveAuth(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Email ou mot de passe incorrect')
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
          <h1 className="syne text-2xl font-bold">Bon retour !</h1>
          <p className="text-zinc-500 text-sm mt-1">Connectez-vous à votre compte</p>
        </div>
        <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">⚠️ {error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm transition text-white placeholder-zinc-600"
                placeholder="vous@exemple.com" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Mot de passe</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm transition text-white placeholder-zinc-600"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 py-3 rounded-xl font-bold text-sm transition">
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>
          <p className="text-center text-zinc-600 text-xs mt-5">
            Pas de compte ?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  )
}