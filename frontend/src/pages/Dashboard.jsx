import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, getUser, logout } from '../hooks/useApi'

/* ══════════════════════════════════════════════════════
   STYLES — JetBrains Mono + Outfit
   Esthétique : panneau de contrôle / terminal industriel
   Signature : une seule couleur accent (#F5A623 ambre vif)
   sur noir profond #0a0a0b, grille de points en fond
══════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  :root {
    --amber: #F5A623;
    --amber-dim: rgba(245,166,35,.15);
    --amber-glow: rgba(245,166,35,.3);
    --bg: #0a0a0b;
    --surface: #111113;
    --surface2: #17171a;
    --border: rgba(255,255,255,.06);
    --border-amber: rgba(245,166,35,.2);
    --text: #e8e8ea;
    --muted: #5a5a62;
    --muted2: #3a3a42;
  }

  * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Fond à points */
  .dot-bg {
    background-image: radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  /* ── Animations ── */
  @keyframes slide-up   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fade-in    { from { opacity:0 } to { opacity:1 } }
  @keyframes shimmer    { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }
  @keyframes spin       { to { transform: rotate(360deg) } }
  @keyframes pulse-ring { 0% { transform:scale(1);opacity:.6 } 70%,100% { transform:scale(2);opacity:0 } }
  @keyframes blink      { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
  @keyframes scan-sweep {
    0%   { transform: translateX(-100%); opacity:0 }
    10%  { opacity:1 }
    90%  { opacity:1 }
    100% { transform: translateX(500%); opacity:0 }
  }
  @keyframes bar-fill   { from { width:0 } to { width: var(--target) } }
  @keyframes count-pop  { 0% { opacity:0; transform:scale(.9) } 100% { opacity:1; transform:scale(1) } }
  @keyframes glow-pulse { 0%,100% { box-shadow:0 0 12px var(--amber-glow) } 50% { box-shadow:0 0 28px var(--amber-glow) } }

  .au  { animation: slide-up .32s cubic-bezier(.2,.8,.4,1) both }
  .au2 { animation: slide-up .32s .08s cubic-bezier(.2,.8,.4,1) both }
  .au3 { animation: slide-up .32s .16s cubic-bezier(.2,.8,.4,1) both }
  .fade { animation: fade-in .2s ease both }

  /* Skeleton loader */
  .sk {
    background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: 8px;
  }

  /* Spinner */
  .spin { animation: spin .9s linear infinite }

  /* Barre de progress */
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    background: var(--amber);
    transition: width 1s linear;
  }

  /* Live dot */
  .live-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center }
  .live-ring {
    position: absolute; inset: -3px; border-radius: 50%;
    background: var(--amber); opacity:.4;
    animation: pulse-ring 2s ease-out infinite;
  }

  /* Colon d'horloge */
  .colon { animation: blink 1s step-end infinite }

  /* Scan laser sur carte active */
  .laser { position: relative; overflow: hidden }
  .laser::after {
    content: '';
    position: absolute; top: 0; bottom: 0; width: 60px;
    background: linear-gradient(90deg, transparent, rgba(245,166,35,.08), transparent);
    animation: scan-sweep 3s ease-in-out infinite;
  }

  /* Card hover */
  .card { transition: border-color .2s, box-shadow .2s }
  .card:hover { border-color: var(--border-amber) !important; box-shadow: 0 4px 32px rgba(0,0,0,.4) }

  /* Input focus */
  input:focus, select:focus {
    border-color: var(--amber) !important;
    outline: none;
    box-shadow: 0 0 0 3px rgba(245,166,35,.08);
  }

  /* Scroll */
  ::-webkit-scrollbar { width: 3px }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px }

  /* Badge score glow amber */
  .score-top { animation: glow-pulse 3s ease infinite }
`

/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
function timeAgo(d) {
  if (!d) return null
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}min`
  if (s < 86400)return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}min`
  return `${Math.floor(s/86400)}j`
}

function getNextScan(lastScanStr, intervalMin = 60) {
  if (!lastScanStr) return null
  const nextMs = new Date(lastScanStr).getTime() + intervalMin * 60000
  const diff   = Math.max(0, Math.floor((nextMs - Date.now()) / 1000))
  return {
    h: Math.floor(diff / 3600),
    m: Math.floor((diff % 3600) / 60),
    s: diff % 60,
    pct: Math.min(100, ((intervalMin * 60 - diff) / (intervalMin * 60)) * 100),
    done: diff === 0,
  }
}

/* ══════════════════════════════════════════════════════
   COMPOSANTS ATOMIQUES
══════════════════════════════════════════════════════ */
function Spinner({ size = 16 }) {
  return (
    <div className="spin flex-shrink-0" style={{
      width: size, height: size,
      border: `${size <= 16 ? 2 : 2.5}px solid rgba(245,166,35,.2)`,
      borderTopColor: 'var(--amber)',
      borderRadius: '50%',
    }}/>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return null
  if (score >= 9)   return <span className="score-top mono text-xs font-bold px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400">{score}/10</span>
  if (score >= 7.5) return <span className="mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-400/12 border border-amber-400/25 text-amber-400">{score}/10</span>
  if (score >= 6)   return <span className="mono text-xs font-bold px-2.5 py-1 rounded-lg" style={{background:'rgba(249,115,22,.1)',border:'1px solid rgba(249,115,22,.2)',color:'#fb923c'}}>{score}/10</span>
  return <span className="mono text-xs font-bold px-2.5 py-1 rounded-lg" style={{background:'var(--surface2)',border:'var(--border) 1px solid',color:'var(--muted)'}}>{score}/10</span>
}

/* Cercle de progression SVG */
function CircleProgress({ pct = 0, size = 48, stroke = 3, color = 'var(--amber)' }) {
  const r   = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }}/>
    </svg>
  )
}

/* Skeleton cards */
function SkCard() {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:16}}>
      <div className="flex gap-3">
        <div className="sk flex-shrink-0" style={{width:72,height:72,borderRadius:12}} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="sk" style={{height:14,width:'70%'}} />
          <div className="sk" style={{height:12,width:'45%'}} />
          <div className="sk" style={{height:20,width:'35%'}} />
        </div>
      </div>
      <div className="sk mt-3" style={{height:56,borderRadius:12}} />
    </div>
  )
}

function SkFilterCard() {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:16}}>
      <div className="flex gap-2 items-center mb-3">
        <div className="sk" style={{width:8,height:8,borderRadius:'50%'}} />
        <div className="sk" style={{height:14,width:'40%'}} />
      </div>
      <div className="sk mb-2" style={{height:11,width:'65%'}} />
      <div className="sk mb-3" style={{height:11,width:'50%'}} />
      <div className="sk" style={{height:6,borderRadius:4}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   COUNTDOWN LIVE — rafraîchi chaque seconde
══════════════════════════════════════════════════════ */
function CountdownLive({ lastScanAt }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (!lastScanAt) return (
    <span className="mono text-xs" style={{ color: 'var(--muted)' }}>jamais scanné</span>
  )

  const info = getNextScan(lastScanAt)
  if (!info) return null

  if (info.done) return (
    <div className="flex items-center gap-1.5">
      <Spinner size={12} />
      <span className="mono text-xs text-amber-400">scan en cours…</span>
    </div>
  )

  const pad = n => String(n).padStart(2, '0')

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{ color: 'var(--muted)' }}>prochain scan</span>
        <span className="mono text-xs font-bold text-amber-400">
          {info.h > 0 ? `${info.h}h ` : ''}{pad(info.m)}<span className="colon">:</span>{pad(info.s)}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
        <div className="progress-fill" style={{ width: `${info.pct}%` }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   BARRE DE STATUT GLOBALE — horloge + info serveur
══════════════════════════════════════════════════════ */
function StatusBar({ filters, lastScans }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad    = n => String(n).padStart(2, '0')
  const active = filters.filter(f => f.is_active).length
  const lastGlobal = lastScans.length ? Math.max(...lastScans.map(d => new Date(d))) : null

  return (
    <div className="au mono text-xs flex flex-wrap items-center gap-4 px-4 py-3 mb-6 rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Live */}
      <div className="flex items-center gap-2">
        <div className="live-wrap">
          <div className="live-ring" />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
        </div>
        <span className="font-bold tracking-widest" style={{ color: 'var(--amber)' }}>LIVE</span>
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block" />

      {/* Horloge */}
      <span className="font-bold text-sm" style={{ color: 'var(--text)', letterSpacing: 2 }}>
        {pad(now.getHours())}<span className="colon">:</span>{pad(now.getMinutes())}<span className="colon">:</span>{pad(now.getSeconds())}
      </span>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block" />

      {/* Filtres actifs */}
      <div className="flex items-center gap-1.5">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: active > 0 ? '#22c55e' : 'var(--muted)' }}
          className={active > 0 ? 'colon' : ''} />
        <span style={{ color: 'var(--muted)' }}>{active} filtre{active !== 1 ? 's' : ''} actif{active !== 1 ? 's' : ''}</span>
      </div>

      {lastGlobal && (
        <>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block" />
          <span style={{ color: 'var(--muted)' }}>
            dernier scan global <span style={{ color: 'var(--text)' }}>{timeAgo(lastGlobal)}</span>
          </span>
        </>
      )}

      <div className="ml-auto hidden md:block" style={{ color: 'var(--muted2)' }}>
        DealHunter AI v3 · serveur local
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   STAT CARD animée
══════════════════════════════════════════════════════ */
function StatCard({ icon, label, value, sub, amber, loading }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    if (loading || value == null) return
    const from = prev.current; prev.current = value
    if (from === value) return
    const steps = 25; let i = 0
    const step  = (value - from) / steps
    const t = setInterval(() => {
      i++
      setDisplay(Math.round(i >= steps ? value : from + step * i))
      if (i >= steps) clearInterval(t)
    }, 24)
    return () => clearInterval(t)
  }, [value, loading])

  return (
    <div className="card rounded-2xl p-4 au" style={{
      background: amber ? 'rgba(245,166,35,.04)' : 'var(--surface)',
      border: `1px solid ${amber ? 'rgba(245,166,35,.15)' : 'var(--border)'}`,
    }}>
      {loading ? (
        <div className="space-y-2">
          <div className="sk" style={{width:28,height:28,borderRadius:8}} />
          <div className="sk" style={{height:32,width:'55%'}} />
          <div className="sk" style={{height:10,width:'70%'}} />
        </div>
      ) : (
        <>
          <div className="text-xl mb-2">{icon}</div>
          <div className="mono font-bold mb-1" style={{
            fontSize: 28, lineHeight: 1,
            color: amber ? 'var(--amber)' : 'var(--text)',
            animation: 'count-pop .3s ease',
          }}>
            {display.toLocaleString('fr-FR')}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
          {sub && <div className="mono text-xs mt-0.5" style={{ color: 'var(--muted2)' }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   LISTING CARD
══════════════════════════════════════════════════════ */
function ListingCard({ listing }) {
  return (
    <div className="au card rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ padding: 16 }}>
        <div className="flex gap-3">
          {listing.image_url
            ? <img src={listing.image_url} alt="" loading="lazy"
                style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover', flexShrink: 0, background: 'var(--surface2)' }} />
            : <div style={{ width: 76, height: 76, borderRadius: 12, background: 'var(--surface2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1px solid var(--border)' }}>🚗</div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {listing.title}
              </h3>
              <ScoreBadge score={listing.ai_score} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {listing.price && (
                <span className="mono font-bold" style={{ fontSize: 18, color: 'var(--amber)' }}>
                  {listing.price.toLocaleString('fr-FR')} €
                </span>
              )}
              {listing.location && <span className="text-xs" style={{ color: 'var(--muted)' }}>📍 {listing.location}</span>}
              {listing.seller_type && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={listing.seller_type === 'pro'
                    ? { background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', color: '#60a5fa' }
                    : { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }
                  }>
                  {listing.seller_type === 'pro' ? '🏢 Pro' : '👤 Particulier'}
                </span>
              )}
            </div>
          </div>
        </div>

        {listing.ai_analysis && (
          <div className="mt-3 rounded-xl p-3"
            style={{ background: 'rgba(245,166,35,.04)', border: '1px solid rgba(245,166,35,.1)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="mono text-xs font-bold" style={{ color: 'var(--amber)', letterSpacing: 1 }}>IA ANALYSE</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(245,166,35,.12)' }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#a8a8b0' }}>{listing.ai_analysis}</p>
            {listing.ai_highlights?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {listing.ai_highlights.map((h, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    ✓ {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="mono text-xs" style={{ color: 'var(--muted2)' }}>
            {timeAgo(listing.found_at)} ago
            {listing.alert_sent && <span className="ml-2 text-green-400" style={{ fontFamily: 'Outfit' }}>✓ Email envoyé</span>}
          </div>
          <a href={listing.url} target="_blank" rel="noreferrer" className="text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ background: 'var(--amber)', color: '#0a0a0b', padding: '6px 14px', borderRadius: 10 }}>
            Leboncoin →
          </a>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   FILTER CARD — avec cercle de progression + countdown
══════════════════════════════════════════════════════ */
function FilterCard({ filter, onDelete, onToggle, onScan }) {
  const [scanning, setScanning] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  async function handleScan() {
    setScanning(true)
    await onScan(filter.id)
    setScanning(false)
  }

  const info = getNextScan(filter.last_scan_at)
  const pad  = n => String(n).padStart(2, '0')

  return (
    <div className={`au card rounded-2xl ${filter.is_active ? 'laser' : ''}`}
      style={{ background: 'var(--surface)', border: `1px solid ${scanning ? 'rgba(245,166,35,.3)' : 'var(--border)'}`, position: 'relative', overflow: 'hidden' }}>

      {/* Barre de progress en haut */}
      {info && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--surface2)' }}>
          <div style={{ height: '100%', width: `${info.pct}%`, background: 'var(--amber)', opacity: .5, borderRadius: '0 2px 2px 0', transition: 'width 1s linear' }} />
        </div>
      )}

      <div style={{ padding: 16, paddingTop: 20 }}>
        <div className="flex items-start justify-between gap-3">
          {/* LEFT — infos */}
          <div className="flex-1 min-w-0">
            {/* Status + nom */}
            <div className="flex items-center gap-2 mb-3">
              <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                {filter.is_active && (
                  <div style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    background: '#22c55e', opacity: .4,
                    animation: 'pulse-ring 2s ease-out infinite',
                  }} />
                )}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: filter.is_active ? '#22c55e' : 'var(--muted2)',
                }} />
              </div>
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{filter.name}</span>
              {!filter.is_active && (
                <span className="mono text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  PAUSE
                </span>
              )}
              {scanning && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <Spinner size={13} />
                  <span className="mono text-xs" style={{ color: 'var(--amber)' }}>SCAN…</span>
                </div>
              )}
            </div>

            {/* Metadata en grille mono */}
            <div className="space-y-1.5 mb-3">
              {[
                { k: 'MOTS-CLÉ', v: filter.keywords, highlight: true },
                filter.city && { k: 'VILLE', v: filter.city },
                filter.max_price && { k: 'BUDGET', v: `${filter.max_price.toLocaleString('fr-FR')} €`, amber: true },
                { k: 'SCORE MIN', v: `≥ ${filter.min_score}/10`, amber: true },
              ].filter(Boolean).map(({ k, v, highlight, amber }) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="mono text-xs flex-shrink-0 w-16" style={{ color: 'var(--muted2)' }}>{k}</span>
                  <span className="mono text-xs truncate" style={{ color: amber ? 'var(--amber)' : highlight ? 'var(--text)' : 'var(--muted)' }}>
                    {amber ? <strong>{v}</strong> : v}
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline last/next scan */}
            <div className="space-y-2">
              {filter.last_scan_at && (
                <div className="flex items-center gap-2 mono text-xs" style={{ color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--muted2)' }}>DERNIER</span>
                  <span style={{ color: 'var(--text)' }}>{timeAgo(filter.last_scan_at)} ago</span>
                  <span style={{ color: 'var(--muted2)' }}>·</span>
                  <span>{new Date(filter.last_scan_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {filter.is_active && (
                <div className="flex items-start gap-2">
                  <span className="mono text-xs flex-shrink-0" style={{ color: 'var(--muted2)' }}>PROCHAIN</span>
                  <CountdownLive lastScanAt={filter.last_scan_at} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — cercle + boutons */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {/* Cercle SVG progression */}
            {info && filter.is_active && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleProgress pct={info.pct} size={52} stroke={3} />
                <div className="mono absolute" style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textAlign: 'center', lineHeight: 1.2 }}>
                  {pad(info.m)}<span className="colon">:</span>{pad(info.s)}
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex flex-col gap-1.5">
              <button onClick={handleScan} disabled={scanning}
                className="mono text-xs flex items-center gap-1.5 font-medium transition"
                style={{ background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.2)', color: 'var(--amber)', padding: '6px 12px', borderRadius: 10, opacity: scanning ? .5 : 1 }}>
                {scanning ? <Spinner size={11} /> : '⚡'} Scanner
              </button>
              <button onClick={() => onToggle(filter.id)}
                className="mono text-xs font-medium transition"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 10 }}>
                {filter.is_active ? '⏸ Pause' : '▶ Activer'}
              </button>
              <button onClick={() => onDelete(filter.id)}
                className="mono text-xs font-medium transition"
                style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', color: '#f87171', padding: '6px 12px', borderRadius: 10 }}>
                ✕ Suppr.
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MODAL NOUVEAU FILTRE
══════════════════════════════════════════════════════ */
function NewFilterModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', keywords: '', city: '', max_price: '', min_score: '8' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await api.post('/filters/', {
        name: form.name, keywords: form.keywords,
        city: form.city || null,
        max_price: form.max_price ? parseFloat(form.max_price) : null,
        min_score: parseFloat(form.min_score),
      })
      onCreated(); onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', transition: 'border-color .2s, box-shadow .2s' }
  const labelStyle = { display: 'block', fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }

  return (
    <div className="fade fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="au w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid rgba(245,166,35,.2)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nouveau filtre</h3>
            <p className="mono text-xs mt-0.5" style={{ color: 'var(--muted2)' }}>CONFIGURER LA SURVEILLANCE</p>
          </div>
          <button onClick={onClose} className="transition"
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', borderRadius: 8, background: 'var(--surface2)' }}>✕</button>
        </div>

        {error && (
          <div className="mb-4 text-sm flex items-center gap-2 rounded-xl p-3"
            style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171' }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom du filtre *</label>
            <input required value={form.name} onChange={set('name')} placeholder="Ex: Clio 3 pas chère" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mots-clés Leboncoin *</label>
            <input required value={form.keywords} onChange={set('keywords')} placeholder="Ex: Renault Clio 3 essence" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Ville</label>
              <input value={form.city} onChange={set('city')} placeholder="Paris" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Budget max €</label>
              <input type="number" value={form.max_price} onChange={set('max_price')} placeholder="5000" style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Score min. alerte</label>
              <span className="mono font-bold" style={{ color: 'var(--amber)', fontSize: 14 }}>{form.min_score}<span style={{ color: 'var(--muted)' }}>/10</span></span>
            </div>
            <input type="range" min="5" max="10" step="0.5" value={form.min_score} onChange={set('min_score')}
              className="w-full cursor-pointer" style={{ accentColor: 'var(--amber)' }} />
            <div className="mono flex justify-between text-xs mt-1" style={{ color: 'var(--muted2)' }}>
              <span>5 — tout</span><span>7.5 — bien</span><span>10 — top</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, background: 'var(--amber)', color: '#0a0a0b', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><Spinner size={14} /> Création…</> : 'Créer le filtre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════ */
function TabOverview({ stats, listings, loading }) {
  return (
    <div className="space-y-6 au">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="⚙️" label="Filtres actifs"      value={stats?.active_filters}    loading={loading} />
        <StatCard icon="🔍" label="Annonces analysées"  value={stats?.total_analyzed}    loading={loading} sub={stats?.total_analyzed > 0 ? `${stats.good_deals_found} ≥ 8/10` : null} />
        <StatCard icon="🏆" label="Bonnes affaires"     value={stats?.good_deals_found}  loading={loading} amber sub="score ≥ 8/10" />
        <StatCard icon="📧" label="Alertes envoyées"    value={stats?.alerts_sent}       loading={loading} />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Dernières annonces</h3>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          {!loading && <span className="mono text-xs" style={{ color: 'var(--muted2)' }}>{listings.length} total</span>}
        </div>
        {loading
          ? <div className="space-y-3">{[1,2,3].map(i => <SkCard key={i} />)}</div>
          : listings.length === 0
            ? (
              <div className="rounded-2xl p-14 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                <div className="mono text-xs mb-1" style={{ color: 'var(--muted2)', letterSpacing: 2 }}>AUCUNE DONNÉE</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>Lancez ⚡ Scanner sur un filtre pour commencer</div>
              </div>
            )
            : <div className="space-y-3">{listings.slice(0, 5).map(l => <ListingCard key={l.id} listing={l} />)}</div>
        }
      </div>
    </div>
  )
}

function TabFilters({ filters, onDelete, onToggle, onScan, onNew, loading }) {
  return (
    <div className="au">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="mono text-xs" style={{ color: 'var(--muted)' }}>{filters.length}/10 filtres</span>
          <div style={{ width: 80, height: 4, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(filters.length / 10) * 100}%`, background: 'rgba(245,166,35,.5)', borderRadius: 4 }} />
          </div>
        </div>
        <button onClick={onNew} className="mono text-xs font-bold flex items-center gap-1.5 transition"
          style={{ background: 'var(--amber)', color: '#0a0a0b', padding: '7px 14px', borderRadius: 11 }}>
          + Nouveau filtre
        </button>
      </div>
      {loading
        ? <div className="space-y-3">{[1,2,3].map(i => <SkFilterCard key={i} />)}</div>
        : filters.length === 0
          ? (
            <div className="rounded-2xl p-14 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
              <div className="text-4xl mb-3">📡</div>
              <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>Aucun filtre</div>
              <div className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Créez votre premier filtre de surveillance</div>
              <button onClick={onNew} className="font-bold text-sm transition"
                style={{ background: 'var(--amber)', color: '#0a0a0b', padding: '10px 24px', borderRadius: 12 }}>
                Créer un filtre
              </button>
            </div>
          )
          : <div className="space-y-3">{filters.map(f => <FilterCard key={f.id} filter={f} onDelete={onDelete} onToggle={onToggle} onScan={onScan} />)}</div>
      }
    </div>
  )
}

function TabListings({ listings, filters, minScore, setMinScore, loading }) {
  const [fId, setFId] = useState('all')
  const shown = listings.filter(l => fId === 'all' || l.filter_id === fId)
  const selectStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, fontFamily: 'JetBrains Mono', padding: '7px 12px', borderRadius: 11, cursor: 'pointer' }

  return (
    <div className="au">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={fId} onChange={e => setFId(e.target.value)} style={selectStyle}>
          <option value="all">Tous les filtres</option>
          {filters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={selectStyle}>
          <option value={0}>Tous scores</option>
          <option value={7}>≥ 7/10</option>
          <option value={8}>≥ 8/10</option>
          <option value={9}>≥ 9/10</option>
        </select>
        <span className="ml-auto mono text-xs" style={{ color: 'var(--muted2)' }}>{shown.length} résultat{shown.length > 1 ? 's' : ''}</span>
      </div>
      {loading
        ? <div className="space-y-3">{[1,2,3,4].map(i => <SkCard key={i} />)}</div>
        : shown.length === 0
          ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
              <div className="text-4xl mb-3">🚗</div>
              <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>Aucune annonce</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>Lancez ⚡ Scanner sur un filtre pour commencer</div>
            </div>
          )
          : <div className="space-y-3">{shown.map(l => <ListingCard key={l.id} listing={l} />)}</div>
      }
    </div>
  )
}

function TabAlerts({ alerts, loading }) {
  if (loading) return <div className="au space-y-3">{[1,2,3].map(i => <div key={i} className="sk rounded-2xl" style={{height:64}} />)}</div>
  if (!alerts?.length) return (
    <div className="au rounded-2xl p-14 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
      <div className="text-4xl mb-3">📭</div>
      <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>Aucune alerte</div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>Les alertes email apparaissent ici</div>
    </div>
  )
  return (
    <div className="au space-y-3">
      {alerts.map(a => (
        <div key={a.id} className="card flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{
            width: 36, height: 36, fontSize: 14,
            ...(a.email_status === 'sent'
              ? { background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', color: '#4ade80' }
              : { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171' }),
          }}>
            {a.email_status === 'sent' ? '✓' : '✗'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{a.listing_title}</span>
              <ScoreBadge score={a.ai_score} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              {a.listing_price && <span className="mono font-bold text-sm" style={{ color: 'var(--amber)' }}>{a.listing_price.toLocaleString('fr-FR')} €</span>}
              <span className="mono text-xs" style={{ color: 'var(--muted2)' }}>{timeAgo(a.sent_at)} ago</span>
              <span className={`text-xs ${a.email_status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                {a.email_status === 'sent' ? '📧 envoyé' : '⚠ échec'}
              </span>
            </div>
          </div>
          <a href={a.listing_url} target="_blank" rel="noreferrer" className="mono text-xs font-medium transition flex-shrink-0"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 10 }}>
            Voir →
          </a>
        </div>
      ))}
    </div>
  )
}

function TabSettings({ user }) {
  const rows = [
    { k: 'SERVEUR', v: 'Local — en ligne', dot: true },
    { k: 'SCAN',    v: 'Toutes les 60 min' },
    { k: 'MODÈLE',  v: 'Llama 3.1 8B (Groq)' },
    { k: 'EMAIL',   v: 'lebscrapper@gmail.com' },
    { k: 'BASE',    v: 'MongoDB Atlas' },
  ]
  return (
    <div className="au space-y-4" style={{ maxWidth: 520 }}>
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="mono text-xs mb-4" style={{ color: 'var(--muted2)', letterSpacing: 2 }}>COMPTE</div>
        {[{ k: 'NOM', v: user?.full_name || '—' }, { k: 'EMAIL', v: user?.email }].map(({ k, v }) => (
          <div key={k} className="flex gap-3 mb-3">
            <span className="mono text-xs w-16 flex-shrink-0 pt-2" style={{ color: 'var(--muted2)' }}>{k}</span>
            <div className="flex-1 mono text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="mono text-xs mb-4" style={{ color: 'var(--muted2)', letterSpacing: 2 }}>SYSTÈME</div>
        <div className="space-y-3">
          {rows.map(({ k, v, dot }) => (
            <div key={k} className="flex items-center gap-3 mono text-xs pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="w-20 flex-shrink-0" style={{ color: 'var(--muted2)' }}>{k}</span>
              <span className="flex-1" style={{ color: 'var(--muted)' }}>{v}</span>
              {dot && <div className="w-2 h-2 rounded-full bg-green-500 colon" />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.12)' }}>
        <div className="mono text-xs mb-2" style={{ color: '#f87171', letterSpacing: 2 }}>DANGER</div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>La déconnexion efface uniquement la session locale.</p>
        <button onClick={logout} className="mono text-xs font-medium transition"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', padding: '8px 16px', borderRadius: 11 }}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'Vue d\'ensemble', icon: '📊' },
  { id: 'filters',   label: 'Filtres',          icon: '📡' },
  { id: 'listings',  label: 'Annonces',         icon: '🚗' },
  { id: 'alerts',    label: 'Alertes',          icon: '📧' },
  { id: 'settings',  label: 'Paramètres',       icon: '⚙️' },
]

export default function Dashboard() {
  const user     = getUser()
  const [tab, setTab]         = useState('overview')
  const [stats, setStats]     = useState(null)
  const [filters, setFilters] = useState([])
  const [listings, setListings] = useState([])
  const [alerts, setAlerts]   = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast]     = useState(null)
  const [minScore, setMinScore] = useState(0)
  const [loading, setLoading] = useState(true)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const loadAll = useCallback(async () => {
    try {
      const [s, f, l, a] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/filters/'),
        api.get(`/dashboard/listings?min_score=${minScore}&per_page=40`),
        api.get('/dashboard/alerts'),
      ])
      if (s) setStats(s)
      if (f) setFilters(f)
      if (l) setListings(l.listings || [])
      if (a) setAlerts(a)
    } finally { setLoading(false) }
  }, [minScore])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async id => {
    if (!confirm('Supprimer ce filtre et ses annonces ?')) return
    try { await api.delete(`/filters/${id}`); await loadAll(); showToast('Filtre supprimé') }
    catch (e) { showToast(e.message, false) }
  }
  const handleToggle = async id => {
    try { await api.patch(`/filters/${id}/toggle`); await loadAll() }
    catch (e) { showToast(e.message, false) }
  }
  const handleScan = async id => {
    try { const r = await api.post(`/filters/${id}/scan`, {}); showToast(r?.message || 'Scan terminé ✓'); await loadAll() }
    catch (e) { showToast(e.message, false) }
  }

  const recentAlerts = (alerts || []).filter(a => Date.now() - new Date(a.sent_at) < 86400000).length
  const lastScans    = filters.filter(f => f.last_scan_at).map(f => f.last_scan_at)
  const userName     = user?.full_name || user?.email?.split('@')[0] || 'vous'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>
      <style>{STYLES}</style>
      <div className="dot-bg fixed inset-0 pointer-events-none" style={{ opacity: .4 }} />

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,11,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: 'var(--amber)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a0a0b', fontSize: 12 }}>D</div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>DealHunter <span style={{ color: 'var(--amber)' }}>AI</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="mono text-xs hidden md:block" style={{ color: 'var(--muted2)' }}>{userName}</span>
            {recentAlerts > 0 && (
              <button onClick={() => setTab('alerts')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                📧
                <span className="mono" style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, background: 'var(--amber)', color: '#0a0a0b', fontSize: 9, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {recentAlerts}
                </span>
              </button>
            )}
            <button onClick={logout} className="mono transition"
              style={{ fontSize: 11, color: 'var(--muted2)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.color = '#f87171'}
              onMouseLeave={e => e.target.style.color = 'var(--muted2)'}>
              [DÉCONNEXION]
            </button>
          </div>
        </div>
      </nav>

      {/* ── TABS ── */}
      <div style={{ position: 'sticky', top: 53, zIndex: 10, background: 'rgba(10,10,11,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '13px 16px',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
                border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--amber)' : 'transparent'}`,
                background: 'none', marginBottom: -1,
                color: tab === t.id ? 'var(--amber)' : 'var(--muted)',
                transition: 'color .2s',
              }}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {t.id === 'alerts' && recentAlerts > 0 && (
                <span className="mono" style={{ width: 16, height: 16, background: 'var(--amber)', color: '#0a0a0b', fontSize: 9, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {recentAlerts}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 96px' }}>
        <StatusBar filters={filters} lastScans={lastScans} />
        {tab === 'overview' && <TabOverview stats={stats} listings={listings} loading={loading} />}
        {tab === 'filters'  && <TabFilters  filters={filters} onDelete={handleDelete} onToggle={handleToggle} onScan={handleScan} onNew={() => setShowModal(true)} loading={loading} />}
        {tab === 'listings' && <TabListings listings={listings} filters={filters} minScore={minScore} setMinScore={setMinScore} loading={loading} />}
        {tab === 'alerts'   && <TabAlerts   alerts={alerts} loading={loading} />}
        {tab === 'settings' && <TabSettings user={user} />}
      </div>

      {/* FAB mobile */}
      {tab === 'filters' && (
        <button onClick={() => setShowModal(true)} className="md:hidden active:scale-95 transition-transform"
          style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 40, width: 56, height: 56, background: 'var(--amber)', color: '#0a0a0b', borderRadius: 16, fontSize: 24, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(245,166,35,.35)' }}>
          +
        </button>
      )}

      {showModal && <NewFilterModal onClose={() => setShowModal(false)} onCreated={loadAll} />}

      {/* Toast */}
      {toast && (
        <div className="au mono text-xs fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap shadow-2xl"
          style={{
            background: 'var(--surface)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
            color: toast.ok ? '#4ade80' : '#f87171',
          }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
