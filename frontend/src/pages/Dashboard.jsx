import React, { useState, useEffect, useCallback } from 'react'
import { api, getUser, logout } from '../hooks/useApi'

const STYLES = `
  *{font-family:'DM Sans',sans-serif}
  .syne{font-family:'Syne',sans-serif}
  @keyframes au{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  .au{animation:au .3s ease both}
  .fade{animation:fade .2s ease both}
  .card{transition:border-color .2s}
  .card:hover{border-color:rgba(251,191,36,.2)!important}
  input:focus,select:focus{border-color:rgba(251,191,36,.5)!important;outline:none}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
`

function ScoreBadge({ score }) {
  if (!score) return null
  const bg = score >= 8.5 ? 'bg-green-500' : score >= 7 ? 'bg-amber-400' : 'bg-red-500'
  const text = score >= 8.5 ? 'text-white' : score >= 7 ? 'text-zinc-950' : 'text-white'
  return <span className={`${bg} ${text} text-xs font-bold px-2.5 py-1 rounded-lg`}>{score}/10</span>
}

function ListingCard({ listing }) {
  return (
    <div className="au card bg-zinc-900 border border-white/6 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex gap-3">
          {listing.image_url && (
            <img src={listing.image_url} alt="" loading="lazy"
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1 text-white">{listing.title}</h3>
              <ScoreBadge score={listing.ai_score} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {listing.price && <span className="text-amber-400 font-bold text-lg">{listing.price.toLocaleString('fr-FR')}€</span>}
              {listing.location && <span className="text-zinc-500 text-xs">📍 {listing.location}</span>}
              {listing.seller_type && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${listing.seller_type === 'pro' ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {listing.seller_type === 'pro' ? 'Pro' : 'Particulier'}
                </span>
              )}
            </div>
          </div>
        </div>
        {listing.ai_analysis && (
          <div className="mt-3 bg-amber-400/5 border border-amber-400/10 rounded-xl p-3">
            <p className="text-zinc-300 text-xs leading-relaxed">{listing.ai_analysis}</p>
            {listing.ai_highlights?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {listing.ai_highlights.map((h, i) => (
                  <span key={i} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-lg">✓ {h}</span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div className="text-zinc-600 text-xs">
            {new Date(listing.found_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            {' · '}
            {new Date(listing.found_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {listing.alert_sent && <span className="ml-2 text-green-500 font-medium">✓ Email envoyé</span>}
          </div>
          <a href={listing.url} target="_blank" rel="noreferrer"
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1 flex-shrink-0">
            Voir sur Leboncoin →
          </a>
        </div>
      </div>
    </div>
  )
}

function FilterCard({ filter, onDelete, onToggle, onScan }) {
  const [scanning, setScanning] = useState(false)
  async function handleScan() {
    setScanning(true)
    await onScan(filter.id)
    setScanning(false)
  }
  return (
    <div className="au card bg-zinc-900 border border-white/6 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filter.is_active ? 'bg-green-500' : 'bg-zinc-600'}`} />
            <span className="font-semibold text-sm truncate">{filter.name}</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">🔍 <span className="text-zinc-200">{filter.keywords}</span></div>
            {filter.city && <div className="text-xs text-zinc-500">📍 {filter.city}</div>}
            <div className="flex gap-3 flex-wrap">
              {filter.max_price && <div className="text-xs text-zinc-500">💰 Budget : <span className="text-amber-400 font-medium">{filter.max_price.toLocaleString('fr-FR')}€</span></div>}
              <div className="text-xs text-zinc-500">⭐ Score min : <span className="text-amber-400 font-medium">{filter.min_score}/10</span></div>
            </div>
          </div>
          {filter.last_scan_at && (
            <div className="text-zinc-600 text-xs mt-2">
              Dernier scan : {new Date(filter.last_scan_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={handleScan} disabled={scanning}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs px-3 py-1.5 rounded-lg transition font-medium whitespace-nowrap">
            {scanning ? '⏳...' : '🔍 Scanner'}
          </button>
          <button onClick={() => onToggle(filter.id)}
            className="bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-lg transition font-medium">
            {filter.is_active ? '⏸ Pause' : '▶ Activer'}
          </button>
          <button onClick={() => onDelete(filter.id)}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition font-medium">
            ✕ Suppr.
          </button>
        </div>
      </div>
    </div>
  )
}

function Modal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', keywords: '', city: '', max_price: '', min_score: '8' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/filters/', {
        name: form.name,
        keywords: form.keywords,
        city: form.city || null,
        max_price: form.max_price ? parseFloat(form.max_price) : null,
        min_score: parseFloat(form.min_score),
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="syne font-bold text-base">Nouveau filtre</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition">✕</button>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl mb-4 text-sm">⚠️ {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Nom du filtre *</label>
            <input required value={form.name} onChange={set('name')} placeholder="Ex: Clio 3 pas chère"
              className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Mots-clés Leboncoin *</label>
            <input required value={form.keywords} onChange={set('keywords')} placeholder="Ex: Renault Clio 3 1.5 dCi"
              className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Ville</label>
              <input value={form.city} onChange={set('city')} placeholder="Paris"
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Budget max (€)</label>
              <input type="number" value={form.max_price} onChange={set('max_price')} placeholder="5000"
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-2">
              Score IA minimum : <span className="text-amber-400 font-bold">{form.min_score}/10</span>
            </label>
            <input type="range" min="5" max="10" step="0.5" value={form.min_score} onChange={set('min_score')} className="w-full accent-amber-400" />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>5 — Toutes</span><span>8 — Bonnes</span><span>10 — Top</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl text-sm font-medium transition">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 py-2.5 rounded-xl text-sm font-bold transition">
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = getUser()
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState([])
  const [listings, setListings] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('listings')
  const [minScore, setMinScore] = useState(0)
  const [loading, setLoading] = useState(true)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadAll = useCallback(async () => {
    try {
      const [s, f, l] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/filters/'),
        api.get(`/dashboard/listings?min_score=${minScore}&per_page=30`),
      ])
      if (s) setStats(s)
      if (f) setFilters(f)
      if (l) setListings(l.listings || [])
    } finally {
      setLoading(false)
    }
  }, [minScore])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleDelete(id) {
    if (!confirm('Supprimer ce filtre et toutes ses annonces ?')) return
    await api.delete(`/filters/${id}`)
    await loadAll()
    showToast('Filtre supprimé ✓')
  }

  async function handleToggle(id) {
    await api.patch(`/filters/${id}/toggle`)
    await loadAll()
  }

  async function handleScan(id) {
    try {
      const res = await api.post(`/filters/${id}/scan`, {})
      showToast(res?.message || 'Scan terminé ✓')
      await loadAll()
    } catch (e) {
      showToast('Erreur: ' + e.message)
    }
  }

  const userName = user?.full_name || user?.email?.split('@')[0] || 'vous'

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{STYLES}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-zinc-950 text-xs">D</div>
            <span className="syne font-bold text-sm hidden sm:block">DealHunter <span className="text-amber-400">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs hidden sm:block">Bonjour, {userName}</span>
            <button onClick={logout} className="text-xs text-zinc-500 hover:text-red-400 bg-zinc-900 border border-white/6 px-3 py-1.5 rounded-lg transition">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Filtres actifs', val: stats?.active_filters, icon: '⚙️' },
            { label: 'Annonces analysées', val: stats?.total_analyzed, icon: '🔍' },
            { label: 'Bonnes affaires', val: stats?.good_deals_found, icon: '🏆', amber: true },
            { label: 'Alertes envoyées', val: stats?.alerts_sent, icon: '📧' },
          ].map(({ label, val, icon, amber }) => (
            <div key={label} className={`card rounded-2xl p-4 border ${amber ? 'bg-amber-400/5 border-amber-400/15' : 'bg-zinc-900 border-white/6'}`}>
              <div className="text-xl mb-2">{icon}</div>
              <div className={`syne text-2xl font-bold ${amber ? 'text-amber-400' : 'text-white'}`}>{loading ? '—' : (val ?? 0)}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs mobile */}
        <div className="flex gap-2 mb-4 md:hidden">
          {[['listings', `Annonces (${listings.length})`], ['filters', `Filtres (${filters.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === key ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-900 border border-white/6 text-zinc-400'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Filtres */}
          <div className={tab === 'listings' ? 'hidden md:block' : ''}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="syne font-bold">Mes filtres</h2>
              <button onClick={() => setShowModal(true)} className="bg-amber-400 hover:bg-amber-300 text-zinc-950 px-4 py-1.5 rounded-xl text-xs font-bold transition">
                + Nouveau
              </button>
            </div>
            {filters.length === 0 ? (
              <div className="bg-zinc-900 border border-white/6 border-dashed rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold text-sm mb-1">Aucun filtre</div>
                <div className="text-zinc-500 text-xs mb-4">Créez votre premier filtre de recherche</div>
                <button onClick={() => setShowModal(true)} className="bg-amber-400 hover:bg-amber-300 text-zinc-950 px-5 py-2 rounded-xl text-xs font-bold transition">
                  Créer un filtre
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filters.map(f => <FilterCard key={f.id} filter={f} onDelete={handleDelete} onToggle={handleToggle} onScan={handleScan} />)}
              </div>
            )}
          </div>

          {/* Annonces */}
          <div className={tab === 'filters' ? 'hidden md:block' : ''}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="syne font-bold">Annonces analysées</h2>
              <select value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                className="bg-zinc-900 border border-white/8 text-zinc-400 text-xs px-3 py-1.5 rounded-xl transition">
                <option value={0}>Tous les scores</option>
                <option value={7}>≥ 7/10</option>
                <option value={8}>≥ 8/10</option>
                <option value={9}>≥ 9/10</option>
              </select>
            </div>
            {listings.length === 0 ? (
              <div className="bg-zinc-900 border border-white/6 border-dashed rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🚗</div>
                <div className="font-semibold text-sm mb-1">Aucune annonce</div>
                <div className="text-zinc-500 text-xs">
                  {filters.length === 0 ? 'Créez un filtre et lancez un scan' : 'Cliquez 🔍 Scanner sur un filtre'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} onCreated={loadAll} />}

      {/* FAB mobile */}
      <button onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-5 md:hidden z-40 w-14 h-14 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-2xl text-2xl font-bold shadow-xl transition flex items-center justify-center">
        +
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-white/10 text-sm px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap au">
          {toast}
        </div>
      )}
    </div>
  )
}
