import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getUser, getToken } from '../hooks/useApi'

/* ══════════════════════════════════════════════════════
   STYLES — même identité que Dashboard mais rouge/cramoisi
   pour signaler l'espace privilegié
══════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
  :root {
    --red: #ef4444; --red-dim: rgba(239,68,68,.12); --red-border: rgba(239,68,68,.2);
    --amber: #F5A623; --amber-dim: rgba(245,166,35,.1); --amber-border: rgba(245,166,35,.2);
    --green: #22c55e; --green-dim: rgba(34,197,94,.1); --green-border: rgba(34,197,94,.2);
    --bg: #0a0a0b; --surface: #111113; --surface2: #17171a;
    --border: rgba(255,255,255,.06); --text: #e8e8ea; --muted: #5a5a62; --muted2: #3a3a42;
  }
  * { font-family:'Outfit',sans-serif; box-sizing:border-box }
  .mono { font-family:'JetBrains Mono',monospace }
  .dot-bg { background-image:radial-gradient(circle,rgba(255,255,255,.06) 1px,transparent 1px);background-size:24px 24px }
  @keyframes slide-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in  { from{opacity:0} to{opacity:1} }
  @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 70%,100%{transform:scale(2.2);opacity:0} }
  .au  { animation:slide-up .32s cubic-bezier(.2,.8,.4,1) both }
  .au2 { animation:slide-up .32s .08s cubic-bezier(.2,.8,.4,1) both }
  .fade { animation:fade-in .2s ease both }
  .sk { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px }
  .spin-el { animation:spin .9s linear infinite }
  .colon { animation:blink 1s step-end infinite }
  .card { transition:border-color .2s,box-shadow .2s }
  .card:hover { border-color:rgba(245,166,35,.2)!important }
  input:focus,select:focus,textarea:focus { border-color:var(--amber)!important;outline:none;box-shadow:0 0 0 3px rgba(245,166,35,.06) }
  ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08);border-radius:2px }
  .live-ring { position:absolute;inset:-3px;border-radius:50%;background:var(--red);opacity:.35;animation:pulse-ring 2s ease-out infinite }
  .toggle { position:relative;width:44px;height:24px;border-radius:12px;cursor:pointer;transition:background .2s;flex-shrink:0;border:none }
  .toggle-knob { position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s }
`

function Spinner({ size = 16 }) {
  return <div className="spin-el flex-shrink-0" style={{ width: size, height: size, border: `${size <= 16 ? 2 : 2.5}px solid rgba(245,166,35,.2)`, borderTopColor: 'var(--amber)', borderRadius: '50%' }} />
}

function Toggle({ value, onChange, red }) {
  return (
    <button className="toggle" onClick={() => onChange(!value)}
      style={{ background: value ? (red ? 'var(--red)' : 'var(--green)') : 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="toggle-knob" style={{ left: value ? 23 : 3 }} />
    </button>
  )
}

function Badge({ color, children }) {
  const map = {
    green:  { bg: 'var(--green-dim)',  border: 'var(--green-border)',  text: 'var(--green)' },
    red:    { bg: 'var(--red-dim)',    border: 'var(--red-border)',    text: 'var(--red)' },
    amber:  { bg: 'var(--amber-dim)', border: 'var(--amber-border)', text: 'var(--amber)' },
    muted:  { bg: 'var(--surface2)',  border: 'var(--border)',         text: 'var(--muted)' },
  }
  const s = map[color] || map.muted
  return (
    <span className="mono text-xs px-2 py-0.5 rounded-md font-medium"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {children}
    </span>
  )
}

function StatCard({ icon, label, value, color = 'white', loading }) {
  const colors = { amber: 'var(--amber)', green: 'var(--green)', red: 'var(--red)', white: 'var(--text)' }
  return (
    <div className="card rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {loading ? (
        <div className="space-y-2">
          <div className="sk" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <div className="sk" style={{ height: 32, width: '55%' }} />
          <div className="sk" style={{ height: 10, width: '70%' }} />
        </div>
      ) : (
        <>
          <div className="text-xl mb-2">{icon}</div>
          <div className="mono font-bold mb-1" style={{ fontSize: 28, color: colors[color] || colors.white }}>{(value ?? 0).toLocaleString('fr-FR')}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
        </>
      )}
    </div>
  )
}

/* ── SECTION: Tableau de bord admin ── */
function SectionDashboard({ data, loading, onRefresh }) {
  if (loading) return (
    <div className="space-y-4 au">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4,5,6,7].map(i => <div key={i} className="sk rounded-2xl" style={{height:100}} />)}
      </div>
    </div>
  )
  if (!data) return null
  const { stats, top_users, last_alerts } = data

  return (
    <div className="space-y-6 au">
      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Utilisateurs" value={stats.total_users} />
        <StatCard icon="⚙️" label="Filtres actifs" value={stats.active_filters} color="green" />
        <StatCard icon="🚗" label="Annonces totales" value={stats.total_listings} />
        <StatCard icon="📧" label="Alertes envoyées" value={stats.sent_alerts} color="amber" />
        <StatCard icon="❌" label="Alertes échouées" value={stats.failed_alerts} color={stats.failed_alerts > 0 ? 'red' : 'white'} />
        <StatCard icon="🔍" label="Filtres total" value={stats.total_filters} />
        <StatCard icon="📊" label="Total alertes" value={stats.total_alerts} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top users */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="mono text-xs mb-4" style={{ color: 'var(--muted2)', letterSpacing: 2 }}>TOP UTILISATEURS</div>
          {top_users.length === 0
            ? <div className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Aucun utilisateur</div>
            : top_users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < top_users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="mono text-xs w-5 flex-shrink-0" style={{ color: 'var(--muted2)' }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{u.full_name || u.email.split('@')[0]}</div>
                  <div className="mono text-xs truncate" style={{ color: 'var(--muted)' }}>{u.email}</div>
                </div>
                <Badge color="amber">{u.filters} filtres</Badge>
              </div>
            ))
          }
        </div>

        {/* Dernières alertes */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="mono text-xs mb-4" style={{ color: 'var(--muted2)', letterSpacing: 2 }}>DERNIÈRES ALERTES</div>
          {last_alerts.length === 0
            ? <div className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Aucune alerte</div>
            : last_alerts.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < last_alerts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14 }}>{a.email_status === 'sent' ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{a.listing_title}</div>
                  <div className="mono text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(a.sent_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge color={a.ai_score >= 8 ? 'green' : a.ai_score >= 6 ? 'amber' : 'muted'}>{a.ai_score}/10</Badge>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

/* ── SECTION: Utilisateurs ── */
function SectionUsers({ onToast }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/admin/users'); setUsers(r || []) }
    catch (e) { onToast(e.message, false) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function toggleActive(id) {
    try { await api.patch(`/admin/users/${id}/toggle-active`); await load(); onToast('Statut modifié') }
    catch (e) { onToast(e.message, false) }
  }
  async function toggleAdmin(id) {
    if (!confirm('Modifier le rôle admin de cet utilisateur ?')) return
    try { await api.patch(`/admin/users/${id}/toggle-admin`); await load(); onToast('Rôle modifié') }
    catch (e) { onToast(e.message, false) }
  }
  async function deleteUser(id, email) {
    if (!confirm(`Supprimer définitivement "${email}" et TOUTES ses données ?`)) return
    try { await api.delete(`/admin/users/${id}`); await load(); onToast('Utilisateur supprimé') }
    catch (e) { onToast(e.message, false) }
  }

  return (
    <div className="au space-y-4">
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par email ou nom…"
          className="mono text-xs flex-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 11, maxWidth: 300 }} />
        <span className="mono text-xs" style={{ color: 'var(--muted2)' }}>{filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="sk rounded-xl" style={{height:60}} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Aucun utilisateur trouvé</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {filtered.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 p-4"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: u.is_admin ? 'var(--red-dim)' : 'var(--amber-dim)', color: u.is_admin ? 'var(--red)' : 'var(--amber)', border: `1px solid ${u.is_admin ? 'var(--red-border)' : 'var(--amber-border)'}` }}>
                {(u.full_name || u.email)[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name || u.email.split('@')[0]}</span>
                  {u.is_admin && <Badge color="red">ADMIN</Badge>}
                  {!u.is_active && <Badge color="muted">INACTIF</Badge>}
                </div>
                <div className="mono text-xs" style={{ color: 'var(--muted)' }}>
                  {u.email} · {u.filter_count} filtres · {u.listing_count} annonces · {u.alert_count} alertes
                </div>
                <div className="mono text-xs" style={{ color: 'var(--muted2)' }}>
                  Inscrit {new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(u.id)} title={u.is_active ? 'Désactiver' : 'Activer'}
                  className="mono text-xs px-2.5 py-1.5 rounded-lg transition"
                  style={{ background: u.is_active ? 'var(--green-dim)' : 'var(--surface2)', border: `1px solid ${u.is_active ? 'var(--green-border)' : 'var(--border)'}`, color: u.is_active ? 'var(--green)' : 'var(--muted)' }}>
                  {u.is_active ? '✓' : '✗'}
                </button>
                <button onClick={() => toggleAdmin(u.id)} title={u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                  className="mono text-xs px-2.5 py-1.5 rounded-lg transition"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  {u.is_admin ? '👑' : '👤'}
                </button>
                <button onClick={() => deleteUser(u.id, u.email)} title="Supprimer"
                  className="mono text-xs px-2.5 py-1.5 rounded-lg transition"
                  style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── SECTION: Maintenance & Bannière ── */
function SectionMaintenance({ settings, onSave, onToast }) {
  const [form, setForm] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(settings || {}) }, [settings])

  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const setVal = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    try {
      await api.patch('/admin/settings', form)
      onToast('Paramètres sauvegardés ✓')
      onSave(form)
    } catch (e) { onToast(e.message, false) }
    finally { setSaving(false) }
  }

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }
  const labelStyle = { display: 'block', fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }
  const inputStyle = { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', transition: 'border-color .2s, box-shadow .2s' }

  return (
    <div className="au" style={{ maxWidth: 600 }}>
      {/* Maintenance mode */}
      <div style={{ ...cardStyle, borderColor: form.maintenance_mode ? 'rgba(239,68,68,.3)' : 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold" style={{ color: 'var(--text)' }}>🔧 Mode maintenance</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Bloque toutes les requêtes API sauf auth et admin</div>
          </div>
          <Toggle value={!!form.maintenance_mode} onChange={set('maintenance_mode')} red />
        </div>
        {form.maintenance_mode && (
          <div className="mono text-xs px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
            ⚠ MAINTENANCE ACTIVE — les utilisateurs ne peuvent pas accéder au service
          </div>
        )}
        <div className="mt-4">
          <label style={labelStyle}>Message affiché aux utilisateurs</label>
          <textarea value={form.maintenance_message || ''} onChange={setVal('maintenance_message')} rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono', fontSize: 12 }} />
        </div>
      </div>

      {/* Bannière */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold" style={{ color: 'var(--text)' }}>📢 Bannière d'annonce</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Affiche un message en haut du dashboard pour tous les users</div>
          </div>
          <Toggle value={!!form.banner_enabled} onChange={set('banner_enabled')} />
        </div>
        {form.banner_enabled && (
          <div className="space-y-3">
            <div>
              <label style={labelStyle}>Message de la bannière</label>
              <input value={form.banner_message || ''} onChange={setVal('banner_message')} placeholder="Ex: Maintenance prévue ce soir à 22h" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <div className="flex gap-2">
                {['info', 'warning', 'error'].map(type => (
                  <button key={type} onClick={() => set('banner_type')(type)}
                    className="mono text-xs px-3 py-1.5 rounded-lg transition"
                    style={{
                      background: form.banner_type === type ? (type === 'info' ? 'var(--amber-dim)' : type === 'warning' ? 'rgba(234,179,8,.1)' : 'var(--red-dim)') : 'var(--surface2)',
                      border: `1px solid ${form.banner_type === type ? (type === 'info' ? 'var(--amber-border)' : type === 'warning' ? 'rgba(234,179,8,.3)' : 'var(--red-border)') : 'var(--border)'}`,
                      color: form.banner_type === type ? (type === 'info' ? 'var(--amber)' : type === 'warning' ? '#eab308' : 'var(--red)') : 'var(--muted)',
                    }}>
                    {type === 'info' ? '💡 Info' : type === 'warning' ? '⚠ Warning' : '🔴 Erreur'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 font-bold"
        style={{ background: 'var(--amber)', color: '#0a0a0b', padding: '11px 24px', borderRadius: 12, fontSize: 13, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1 }}>
        {saving ? <Spinner size={14} /> : null}
        {saving ? 'Sauvegarde…' : 'Sauvegarder les paramètres'}
      </button>
    </div>
  )
}

/* ── SECTION: Scraper & Scan ── */
function SectionScraper({ settings, onSave, onToast }) {
  const [form, setForm] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(settings || {}) }, [settings])

  const set   = k => v => setForm(f => ({ ...f, [k]: v }))
  const setNum = k => e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))

  async function save() {
    setSaving(true)
    try { await api.patch('/admin/settings', form); onToast('Sauvegardé ✓'); onSave(form) }
    catch (e) { onToast(e.message, false) }
    finally { setSaving(false) }
  }

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }
  const labelStyle = { display: 'block', fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }
  const inputStyle = { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', transition: 'border-color .2s, box-shadow .2s', fontFamily: 'JetBrains Mono' }

  return (
    <div className="au" style={{ maxWidth: 600 }}>
      {/* Enable/disable scraper */}
      <div style={{ ...cardStyle, borderColor: !form.scraper_enabled ? 'rgba(239,68,68,.3)' : 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-bold" style={{ color: 'var(--text)' }}>⚡ Scraper actif</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Active ou désactive le scraping automatique</div>
          </div>
          <Toggle value={!!form.scraper_enabled} onChange={set('scraper_enabled')} red={!form.scraper_enabled} />
        </div>
        {!form.scraper_enabled && (
          <div className="mono text-xs px-3 py-2 rounded-xl mt-3" style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
            ⚠ Scraper désactivé — aucun scan automatique ne s'exécutera
          </div>
        )}
      </div>

      {/* Intervalles */}
      <div style={cardStyle}>
        <div className="font-bold mb-4" style={{ color: 'var(--text)' }}>⏱ Paramètres de scan</div>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Intervalle entre les scans (minutes)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="15" max="240" step="15" value={form.scan_interval_minutes || 60}
                onChange={setNum('scan_interval_minutes')} className="flex-1" style={{ accentColor: 'var(--amber)' }} />
              <span className="mono font-bold" style={{ color: 'var(--amber)', minWidth: 50, textAlign: 'right' }}>{form.scan_interval_minutes || 60} min</span>
            </div>
            <div className="mono flex justify-between text-xs mt-1" style={{ color: 'var(--muted2)' }}>
              <span>15min</span><span>1h</span><span>2h</span><span>4h</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Annonces max par scan</label>
            <div className="flex items-center gap-3">
              <input type="range" min="5" max="50" step="5" value={form.max_listings_per_scan || 20}
                onChange={setNum('max_listings_per_scan')} className="flex-1" style={{ accentColor: 'var(--amber)' }} />
              <span className="mono font-bold" style={{ color: 'var(--amber)', minWidth: 50, textAlign: 'right' }}>{form.max_listings_per_scan || 20}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Score minimum global (override utilisateur si plus bas)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="10" step="0.5" value={form.min_score_global || 1}
                onChange={setNum('min_score_global')} className="flex-1" style={{ accentColor: 'var(--amber)' }} />
              <span className="mono font-bold" style={{ color: 'var(--amber)', minWidth: 50, textAlign: 'right' }}>{form.min_score_global || 1}/10</span>
            </div>
            <div className="mono text-xs mt-1" style={{ color: 'var(--muted2)' }}>
              Mettre à 1/10 pour envoyer toutes les alertes sans restriction
            </div>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 font-bold"
        style={{ background: 'var(--amber)', color: '#0a0a0b', padding: '11px 24px', borderRadius: 12, fontSize: 13, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1 }}>
        {saving ? <Spinner size={14} /> : null}
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  )
}

/* ── SECTION: Nettoyage des données ── */
function SectionData({ onToast }) {
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})

  async function purge(type, days) {
    if (!confirm(`Supprimer les ${type} de plus de ${days} jours ?`)) return
    setLoading(l => ({ ...l, [type]: true }))
    try {
      const r = await api.delete(`/admin/data/${type}/old?days=${days}`)
      setResults(res => ({ ...res, [type]: r.message }))
      onToast(r.message)
    } catch (e) { onToast(e.message, false) }
    finally { setLoading(l => ({ ...l, [type]: false })) }
  }

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 12 }
  const btnStyle = (red) => ({
    display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600,
    padding: '7px 14px', borderRadius: 10, border: `1px solid ${red ? 'var(--red-border)' : 'var(--amber-border)'}`,
    background: red ? 'var(--red-dim)' : 'var(--amber-dim)', color: red ? 'var(--red)' : 'var(--amber)', cursor: 'pointer',
  })

  return (
    <div className="au" style={{ maxWidth: 600 }}>
      <div style={cardStyle}>
        <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>🗑️ Purge des annonces</div>
        <div className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Supprime les annonces trop anciennes pour libérer de l'espace en base.</div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60].map(days => (
            <button key={days} onClick={() => purge('listings', days)} disabled={loading.listings} style={btnStyle(days <= 14)}>
              {loading.listings && <Spinner size={12} />}
              Suppr. +{days}j
            </button>
          ))}
        </div>
        {results.listings && <div className="mono text-xs mt-3" style={{ color: 'var(--green)' }}>✓ {results.listings}</div>}
      </div>

      <div style={cardStyle}>
        <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>📧 Purge des alertes</div>
        <div className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Supprime l'historique des alertes email envoyées.</div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60].map(days => (
            <button key={days} onClick={() => purge('alerts', days)} disabled={loading.alerts} style={btnStyle(days <= 14)}>
              {loading.alerts && <Spinner size={12} />}
              Suppr. +{days}j
            </button>
          ))}
        </div>
        {results.alerts && <div className="mono text-xs mt-3" style={{ color: 'var(--green)' }}>✓ {results.alerts}</div>}
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.12)' }}>
        <div className="mono text-xs mb-2" style={{ color: 'var(--red)', letterSpacing: 2 }}>⚠ ZONE CRITIQUE</div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>Les suppressions sont irréversibles. Les données ne peuvent pas être récupérées.</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'dashboard',   label: 'Vue d\'ensemble', icon: '📊' },
  { id: 'users',       label: 'Utilisateurs',    icon: '👥' },
  { id: 'maintenance', label: 'Maintenance',     icon: '🔧' },
  { id: 'scraper',     label: 'Scraper',         icon: '⚡' },
  { id: 'data',        label: 'Données',         icon: '🗑️' },
]

export default function Admin() {
  const navigate = useNavigate()
  const user     = getUser()
  const [tab, setTab]             = useState('dashboard')
  const [dashData, setDashData]   = useState(null)
  const [settings, setSettings]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)
  const [checking, setChecking]   = useState(true)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  // Vérif accès admin
  useEffect(() => {
    async function check() {
      if (!getToken()) { navigate('/login'); return }
      try {
        const r = await api.get('/admin/dashboard')
        setDashData(r)
        setSettings(r.settings)
      } catch (e) {
        if (e.message.includes('403') || e.message.includes('admin')) {
          navigate('/dashboard')
        }
      } finally {
        setChecking(false)
        setLoading(false)
      }
    }
    check()
  }, [])

  async function refreshDash() {
    try { const r = await api.get('/admin/dashboard'); setDashData(r); setSettings(r.settings) }
    catch (e) { showToast(e.message, false) }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{STYLES}</style>
      <div className="text-center">
        <Spinner size={32} />
        <div className="mono text-xs mt-4" style={{ color: 'var(--muted)' }}>Vérification des droits…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{STYLES}</style>
      <div className="dot-bg fixed inset-0 pointer-events-none" style={{ opacity: .3 }} />

      {/* ── NAV ADMIN ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,11,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(239,68,68,.2)', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: 'var(--amber)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a0a0b', fontSize: 11 }}>D</div>
            </Link>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <div className="live-ring" style={{ background: 'var(--red)' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />
              </div>
              <span className="mono font-bold text-sm" style={{ color: 'var(--red)', letterSpacing: 1 }}>ADMIN PANEL</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono text-xs" style={{ color: 'var(--muted2)' }}>{user?.email}</span>
            <Link to="/dashboard" className="mono text-xs transition" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* ── TABS ── */}
      <div style={{ position: 'sticky', top: 53, zIndex: 10, background: 'rgba(10,10,11,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '13px 14px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--red)' : 'transparent'}`, background: 'none', marginBottom: -1, color: tab === t.id ? 'var(--red)' : 'var(--muted)', transition: 'color .2s' }}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 96px' }}>
        {tab === 'dashboard'   && <SectionDashboard data={dashData} loading={loading} onRefresh={refreshDash} />}
        {tab === 'users'       && <SectionUsers onToast={showToast} />}
        {tab === 'maintenance' && <SectionMaintenance settings={settings} onSave={s => setSettings({ ...settings, ...s })} onToast={showToast} />}
        {tab === 'scraper'     && <SectionScraper settings={settings} onSave={s => setSettings({ ...settings, ...s })} onToast={showToast} />}
        {tab === 'data'        && <SectionData onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <div className="au mono text-xs fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap shadow-2xl"
          style={{ background: 'var(--surface)', border: `1px solid ${toast.ok ? 'var(--green-border)' : 'var(--red-border)'}`, color: toast.ok ? 'var(--green)' : 'var(--red)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
