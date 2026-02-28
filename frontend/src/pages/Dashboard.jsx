import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, getUser, logout } from '../hooks/useApi'

const STYLES = `
  :root {
    --bg: #09090b; --surface: #111118; --surface2: #18181f;
    --border: rgba(255,255,255,.07); --border2: rgba(255,255,255,.12);
    --text: #f0f0f4; --muted: #6b6b7a; --muted2: #3d3d4a;
    --accent: #7C3AED; --accent-dim: rgba(124,58,237,.12); --accent-border: rgba(124,58,237,.25);
    --accent-glow: rgba(124,58,237,.3);
    --green: #10b981; --green-dim: rgba(16,185,129,.1); --green-border: rgba(16,185,129,.25);
    --red: #ef4444; --red-dim: rgba(239,68,68,.1); --red-border: rgba(239,68,68,.25);
    --amber: #f59e0b; --amber-dim: rgba(245,158,11,.1); --amber-border: rgba(245,158,11,.25);
    --lbc: #FF6B00; --vinted: #09B1BA;
  }
  * { font-family:'DM Sans',sans-serif; box-sizing:border-box }
  .mono { font-family:'JetBrains Mono',monospace }
  .syne { font-family:'Syne',sans-serif }
  .grid-bg {
    background-image: linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),
                      linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
    background-size: 32px 32px;
  }
  @keyframes slide-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in   { from{opacity:0} to{opacity:1} }
  @keyframes shimmer   { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes pulse-r   { 0%{transform:scale(1);opacity:.5} 70%,100%{transform:scale(2.5);opacity:0} }
  @keyframes scan-laser{
    0%{transform:translateX(-100%);opacity:0}
    10%{opacity:.7} 90%{opacity:.7}
    100%{transform:translateX(600%);opacity:0}
  }
  @keyframes count-in  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
  @keyframes banner-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .au   { animation:slide-up .3s cubic-bezier(.2,.8,.4,1) both }
  .au2  { animation:slide-up .3s .06s cubic-bezier(.2,.8,.4,1) both }
  .au3  { animation:slide-up .3s .12s cubic-bezier(.2,.8,.4,1) both }
  .fade { animation:fade-in .2s ease both }
  .sk { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);
        background-size:500px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px }
  .spin-el { animation:spin .8s linear infinite }
  .colon { animation:blink 1s step-end infinite }
  .card { transition:border-color .2s,box-shadow .2s }
  .card:hover { border-color:var(--border2)!important }
  .laser-card { position:relative;overflow:hidden }
  .laser-card.active::after {
    content:'';position:absolute;top:0;bottom:0;width:80px;
    background:linear-gradient(90deg,transparent,rgba(124,58,237,.07),transparent);
    animation:scan-laser 4s ease-in-out infinite;
  }
  input:focus,select:focus,textarea:focus {
    border-color:var(--accent)!important;outline:none;
    box-shadow:0 0 0 3px rgba(124,58,237,.08)
  }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
  input[type=range]{accent-color:var(--accent)}
`

/* ── Utils ── */
function timeAgo(d) {
  if (!d) return null
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s/60)}min`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}j`
}
function getNextScan(last, intervalMin = 10) {
  if (!last) return null
  // new Date() parse correctement les ISO strings UTC (avec ou sans Z)
  const lastStr = last.endsWith('Z') || last.includes('+') ? last : last + 'Z'
  const lastMs = new Date(lastStr).getTime()
  const intervalMs = intervalMin * 60000
  const nextMs = lastMs + intervalMs
  const now = Date.now()
  const diff = Math.max(0, Math.floor((nextMs - now) / 1000))
  const elapsed = Math.min(intervalMs, now - lastMs)
  const pct = Math.min(100, (elapsed / intervalMs) * 100)
  // "scan en cours" seulement dans les 45s qui suivent le dernier scan
  const justFinished = diff === 0 && (now - lastMs) < 45000
  return { h: Math.floor(diff/3600), m: Math.floor((diff%3600)/60), s: diff%60, pct, done: justFinished }
}
const pad = n => String(n).padStart(2,'0')

/* ── Composants atomiques ── */
function Spinner({ size = 16 }) {
  return <div className="spin-el" style={{ width:size, height:size, border:`${size<=16?2:2.5}px solid rgba(124,58,237,.2)`, borderTopColor:'var(--accent)', borderRadius:'50%', flexShrink:0 }} />
}

function ScoreBadge({ score }) {
  if (score == null) return null
  if (score >= 9)   return <span className="mono text-xs font-bold px-2 py-0.5 rounded-lg" style={{background:'var(--green-dim)',border:'1px solid var(--green-border)',color:'var(--green)'}}>{score}<span style={{opacity:.5}}>/10</span></span>
  if (score >= 7.5) return <span className="mono text-xs font-bold px-2 py-0.5 rounded-lg" style={{background:'var(--amber-dim)',border:'1px solid var(--amber-border)',color:'var(--amber)'}}>{score}<span style={{opacity:.5}}>/10</span></span>
  if (score >= 5)   return <span className="mono text-xs font-bold px-2 py-0.5 rounded-lg" style={{background:'var(--accent-dim)',border:'1px solid var(--accent-border)',color:'var(--accent)'}}>{score}<span style={{opacity:.5}}>/10</span></span>
  return <span className="mono text-xs font-bold px-2 py-0.5 rounded-lg" style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)'}}>{score}<span style={{opacity:.5}}>/10</span></span>
}

/* ── PlatformTag — détecte via listing_id en fallback si platform absent ── */
function PlatformTag({ platform, listingId }) {
  // Détection robuste : on se fie à platform EN PRIORITÉ,
  // sinon on détecte via le préfixe du listing_id
  const resolved = platform
    || (listingId?.startsWith('vinted_') ? 'vinted' : 'leboncoin')

  if (resolved === 'vinted') return (
    <span className="mono text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
      style={{background:'rgba(9,177,186,.1)',border:'1px solid rgba(9,177,186,.25)',color:'var(--vinted)'}}>
      <i className="fas fa-shirt" style={{fontSize:9}} /> Vinted
    </span>
  )
  if (resolved === 'both') return (
    <span className="mono text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
      style={{background:'var(--accent-dim)',border:'1px solid var(--accent-border)',color:'var(--accent)'}}>
      <i className="fas fa-layer-group" style={{fontSize:9}} /> Les deux
    </span>
  )
  return (
    <span className="mono text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
      style={{background:'rgba(255,107,0,.1)',border:'1px solid rgba(255,107,0,.25)',color:'var(--lbc)'}}>
      <i className="fas fa-tag" style={{fontSize:9}} /> Leboncoin
    </span>
  )
}

function SkCard() {
  return (
    <div className="rounded-2xl p-4" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
      <div className="flex gap-3"><div className="sk flex-shrink-0" style={{width:72,height:72,borderRadius:12}}/><div className="flex-1 space-y-2 pt-1"><div className="sk" style={{height:13,width:'70%'}}/><div className="sk" style={{height:11,width:'45%'}}/><div className="sk" style={{height:20,width:'30%'}}/></div></div>
      <div className="sk mt-3" style={{height:52,borderRadius:10}}/>
    </div>
  )
}
function SkFilter() {
  return <div className="rounded-2xl p-4 space-y-2" style={{background:'var(--surface)',border:'1px solid var(--border)'}}><div className="sk" style={{height:13,width:'40%'}}/><div className="sk" style={{height:11,width:'60%'}}/><div className="sk" style={{height:6,borderRadius:4}}/></div>
}

function CircleProgress({ pct, size=48, stroke=3 }) {
  const r = (size - stroke*2)/2; const circ = 2*Math.PI*r; const dash = (pct/100)*circ
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray 1s linear'}}/>
    </svg>
  )
}

function Countdown({ lastScanAt }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick(x=>x+1), 1000); return () => clearInterval(t) }, [])
  if (!lastScanAt) return <span className="mono text-xs" style={{color:'var(--muted)'}}>jamais scanné</span>
  const info = getNextScan(lastScanAt)
  if (!info) return null
  if (info.done) return <div className="flex items-center gap-1"><Spinner size={11}/><span className="mono text-xs" style={{color:'var(--accent)'}}>scan en cours…</span></div>
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{color:'var(--muted)'}}>prochain</span>
        <span className="mono text-xs font-bold" style={{color:'var(--accent)'}}>
          {info.h>0?`${info.h}h `:''}{pad(info.m)}<span className="colon">:</span>{pad(info.s)}
        </span>
      </div>
      <div style={{height:2,background:'var(--surface2)',borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${info.pct}%`,background:'var(--accent)',transition:'width 1s linear'}}/>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, loading, green, accent }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (loading||value==null) return
    const from=prev.current; prev.current=value; if(from===value) return
    const steps=25; let i=0; const step=(value-from)/steps
    const t=setInterval(()=>{i++;setDisplay(Math.round(i>=steps?value:from+step*i));if(i>=steps)clearInterval(t)},25)
    return()=>clearInterval(t)
  },[value,loading])
  const color = accent?'var(--accent)':green?'var(--green)':'var(--text)'
  return (
    <div className="card rounded-2xl p-4" style={{background:'var(--surface)',border:`1px solid ${accent?'var(--accent-border)':green?'var(--green-border)':'var(--border)'}`}}>
      {loading?(<div className="space-y-2"><div className="sk" style={{width:28,height:28,borderRadius:8}}/><div className="sk" style={{height:30,width:'55%'}}/><div className="sk" style={{height:10,width:'70%'}}/></div>):(
        <>
          <div style={{fontSize:20,marginBottom:8}}><i className={`fas ${icon}`} style={{color}}/></div>
          <div className="mono font-bold" style={{fontSize:28,lineHeight:1,color,animation:'count-in .3s ease'}}>{display.toLocaleString('fr-FR')}</div>
          <div className="text-xs mt-1" style={{color:'var(--muted)'}}>{label}</div>
        </>
      )}
    </div>
  )
}

/* ── Listing Card ── */
function ListingCard({ listing }) {
  // Résolution robuste de la plateforme (fallback sur listing_id)
  const platform = listing.platform
    || (listing.listing_id?.startsWith('vinted_') ? 'vinted' : 'leboncoin')
  const platColor = platform==='vinted'?'var(--vinted)':platform==='both'?'var(--accent)':'var(--lbc)'

  return (
    <div className="au card rounded-2xl overflow-hidden" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
      <div style={{padding:16}}>
        <div className="flex gap-3">
          {listing.image_url
            ?<img src={listing.image_url} alt="" loading="lazy" style={{width:76,height:76,borderRadius:12,objectFit:'cover',flexShrink:0,background:'var(--surface2)'}}/>
            :<div style={{width:76,height:76,borderRadius:12,background:'var(--surface2)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:'1px solid var(--border)'}}><i className="fas fa-box-open" style={{color:'var(--muted2)'}}/></div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-snug flex-1" style={{color:'var(--text)',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{listing.title}</h3>
              <ScoreBadge score={listing.ai_score}/>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {listing.price!=null&&<span className="mono font-bold" style={{fontSize:18,color:platColor}}>{listing.price.toLocaleString('fr-FR')} €</span>}
              {listing.location&&<span className="text-xs flex items-center gap-1" style={{color:'var(--muted)'}}><i className="fas fa-location-dot" style={{fontSize:9}}/>{listing.location}</span>}
              {listing.seller_type&&<span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={listing.seller_type==='pro'?{background:'rgba(59,130,246,.1)',border:'1px solid rgba(59,130,246,.2)',color:'#60a5fa'}:{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)'}}>
                <i className={`fas ${listing.seller_type==='pro'?'fa-building':'fa-user'}`} style={{fontSize:9}}/> {listing.seller_type==='pro'?'Pro':'Particulier'}
              </span>}
              <PlatformTag platform={listing.platform} listingId={listing.listing_id}/>
            </div>
          </div>
        </div>
        {listing.ai_analysis&&(
          <div className="mt-3 rounded-xl p-3" style={{background:'var(--accent-dim)',border:'1px solid var(--accent-border)'}}>
            <div className="flex items-center gap-2 mb-1.5">
              <i className="fas fa-robot" style={{fontSize:10,color:'var(--accent)'}}/><span className="mono text-xs font-bold" style={{color:'var(--accent)',letterSpacing:1}}>ANALYSE IA</span>
              <div className="flex-1 h-px" style={{background:'var(--accent-border)'}}/>
            </div>
            <p className="text-xs leading-relaxed" style={{color:'#a8a8c0'}}>{listing.ai_analysis}</p>
            {listing.ai_highlights?.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">{listing.ai_highlights.map((h,i)=><span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)'}}>{h}</span>)}</div>}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3" style={{borderTop:'1px solid var(--border)'}}>
          <span className="mono text-xs flex items-center gap-1.5" style={{color:'var(--muted2)'}}>
            <i className="fas fa-clock" style={{fontSize:9}}/>{timeAgo(listing.found_at)} ago
            {listing.alert_sent&&<span className="text-green-400 ml-1"><i className="fas fa-envelope-circle-check" style={{fontSize:9}}/> envoyé</span>}
          </span>
          <a href={listing.url} target="_blank" rel="noreferrer" className="text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{background:'var(--accent)',color:'#fff',padding:'6px 14px',borderRadius:10,textDecoration:'none'}}>
            Voir <i className="fas fa-arrow-up-right-from-square" style={{fontSize:10}}/>
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Filter Card ── */
function FilterCard({ filter, onDelete, onToggle, onScan }) {
  const [scanning, setScanning] = useState(false)
  const [, tick] = useState(0)
  useEffect(()=>{const t=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(t)},[])
  async function handleScan() { setScanning(true); await onScan(filter.id); setScanning(false) }
  const info = getNextScan(filter.last_scan_at)
  return (
    <div className={`au card laser-card rounded-2xl ${filter.is_active?'active':''}`}
      style={{background:'var(--surface)',border:`1px solid ${scanning?'var(--accent-border)':'var(--border)'}`,position:'relative',overflow:'hidden'}}>
      {info&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--surface2)'}}><div style={{height:'100%',width:`${info.pct}%`,background:'var(--accent)',opacity:.4,transition:'width 1s linear'}}/></div>}
      <div style={{padding:16,paddingTop:20}}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div style={{position:'relative',display:'inline-flex',flexShrink:0}}>
                {filter.is_active&&<div style={{position:'absolute',inset:-3,borderRadius:'50%',background:'var(--green)',opacity:.35,animation:'pulse-r 2s ease-out infinite'}}/>}
                <div style={{width:8,height:8,borderRadius:'50%',background:filter.is_active?'var(--green)':'var(--muted2)'}}/>
              </div>
              <span className="syne font-bold text-sm truncate" style={{color:'var(--text)'}}>{filter.name}</span>
              <PlatformTag platform={filter.platform}/>
              {!filter.is_active&&<span className="mono text-xs px-2 py-0.5 rounded-md" style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)'}}>PAUSE</span>}
              {scanning&&<div className="flex items-center gap-1.5 ml-auto"><Spinner size={12}/><span className="mono text-xs" style={{color:'var(--accent)'}}>SCAN…</span></div>}
            </div>
            <div className="space-y-1.5 mb-3">
              {[
                {k:'MOTS-CLÉ',v:filter.keywords,bold:true},
                filter.city&&{k:'VILLE',v:filter.city},
                filter.max_price&&{k:'BUDGET',v:`${filter.max_price.toLocaleString('fr-FR')} €`,accent:true},
                {k:'SCORE',v:`≥ ${filter.min_score}/10`,accent:true},
              ].filter(Boolean).map(({k,v,bold,accent})=>(
                <div key={k} className="flex items-center gap-2">
                  <span className="mono text-xs w-16 flex-shrink-0" style={{color:'var(--muted2)'}}>{k}</span>
                  <span className={`mono text-xs truncate ${bold?'font-semibold':''}`} style={{color:accent?'var(--accent)':bold?'var(--text)':'var(--muted)'}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {filter.last_scan_at&&<div className="mono text-xs flex items-center gap-2" style={{color:'var(--muted)'}}>
                <i className="fas fa-rotate" style={{fontSize:9,color:'var(--muted2)'}}/><span style={{color:'var(--muted2)'}}>dernier</span><span style={{color:'var(--text)'}}>{timeAgo(filter.last_scan_at)} ago</span>
                <span style={{color:'var(--muted2)'}}>·</span><span>{new Date(filter.last_scan_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>}
              {filter.is_active&&<div className="flex items-start gap-2"><span className="mono text-xs flex-shrink-0" style={{color:'var(--muted2)'}}>PROCHAIN</span><Countdown lastScanAt={filter.last_scan_at}/></div>}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {info&&filter.is_active&&(
              <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                <CircleProgress pct={info.pct} size={50} stroke={3}/>
                <div className="mono absolute" style={{fontSize:9,fontWeight:700,color:'var(--accent)',textAlign:'center'}}>
                  {pad(info.m)}<span className="colon">:</span>{pad(info.s)}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button onClick={handleScan} disabled={scanning} className="mono text-xs flex items-center gap-1.5 font-medium"
                style={{background:'var(--accent-dim)',border:'1px solid var(--accent-border)',color:'var(--accent)',padding:'6px 12px',borderRadius:10,opacity:scanning?.5:1,cursor:scanning?'wait':'pointer'}}>
                {scanning?<Spinner size={11}/>:<i className="fas fa-bolt" style={{fontSize:10}}/>} Scanner
              </button>
              <button onClick={()=>onToggle(filter.id)} className="mono text-xs font-medium"
                style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:10,cursor:'pointer'}}>
                <i className={`fas ${filter.is_active?'fa-pause':'fa-play'}`} style={{fontSize:9,marginRight:5}}/>{filter.is_active?'Pause':'Activer'}
              </button>
              <button onClick={()=>onDelete(filter.id)} className="mono text-xs font-medium"
                style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)',padding:'6px 12px',borderRadius:10,cursor:'pointer'}}>
                <i className="fas fa-trash-can" style={{fontSize:9,marginRight:5}}/>Suppr.
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Modal Nouveau filtre ── */
function NewFilterModal({ onClose, onCreated }) {
  const [form, setForm] = useState({name:'',keywords:'',platform:'leboncoin',city:'',max_price:'',min_score:'8'})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const iStyle = {width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',fontSize:13,color:'var(--text)',outline:'none',transition:'border-color .2s,box-shadow .2s'}
  const lStyle = {display:'block',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:2,marginBottom:6}
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await api.post('/filters/',{name:form.name,keywords:form.keywords,platform:form.platform,city:form.city||null,max_price:form.max_price?parseFloat(form.max_price):null,min_score:parseFloat(form.min_score)})
      onCreated(); onClose()
    } catch(err) { setError(err.message) } finally { setLoading(false) }
  }
  return (
    <div className="fade fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,.85)',backdropFilter:'blur(10px)'}} onClick={onClose}>
      <div className="au w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{background:'var(--surface)',border:'1px solid var(--accent-border)'}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="syne font-bold text-lg" style={{color:'var(--text)'}}>Nouveau filtre</h3>
            <p className="mono text-xs mt-0.5" style={{color:'var(--muted2)',letterSpacing:1}}>SURVEILLANCE ACTIVE</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',borderRadius:8,background:'var(--surface2)',border:'1px solid var(--border)',cursor:'pointer'}}>✕</button>
        </div>
        {error&&<div className="mb-4 text-sm rounded-xl p-3 flex items-center gap-2" style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'}}><i className="fas fa-triangle-exclamation"/>{error}</div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={lStyle}>Nom du filtre *</label>
            <input required value={form.name} onChange={set('name')} placeholder="Ex: iPhone 13 pas cher" style={iStyle}/>
          </div>
          <div>
            <label style={lStyle}>Mots-clés *</label>
            <input required value={form.keywords} onChange={set('keywords')} placeholder="Ex: iPhone 13 128Go" style={iStyle}/>
          </div>
          <div>
            <label style={lStyle}>Plateforme</label>
            <div className="flex gap-2">
              {[{v:'leboncoin',icon:'fa-tag',label:'Leboncoin',color:'var(--lbc)'},{v:'vinted',icon:'fa-shirt',label:'Vinted',color:'var(--vinted)'},{v:'both',icon:'fa-layer-group',label:'Les deux',color:'var(--accent)'}].map(p=>(
                <button type="button" key={p.v} onClick={()=>setForm(f=>({...f,platform:p.v}))}
                  style={{flex:1,padding:'8px 4px',borderRadius:10,fontSize:11,fontFamily:'JetBrains Mono',cursor:'pointer',border:`1px solid ${form.platform===p.v?p.color:'var(--border)'}`,background:form.platform===p.v?`rgba(${p.color==='var(--lbc)'?'255,107,0':p.color==='var(--vinted)'?'9,177,186':'124,58,237'},.1)`:'var(--surface2)',color:form.platform===p.v?p.color:'var(--muted)',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <i className={`fas ${p.icon}`} style={{fontSize:13}}/>{p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={lStyle}>Ville</label><input value={form.city} onChange={set('city')} placeholder="Paris" style={iStyle}/></div>
            <div><label style={lStyle}>Budget max €</label><input type="number" value={form.max_price} onChange={set('max_price')} placeholder="500" style={iStyle}/></div>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <label style={{...lStyle,marginBottom:0}}>Score min.</label>
              <span className="mono font-bold" style={{color:'var(--accent)',fontSize:14}}>{form.min_score}<span style={{color:'var(--muted)',fontWeight:400}}>/10</span></span>
            </div>
            <input type="range" min="1" max="10" step="0.5" value={form.min_score} onChange={set('min_score')} className="w-full cursor-pointer"/>
            <div className="mono flex justify-between text-xs mt-1" style={{color:'var(--muted2)'}}>
              <span>1 — tout</span><span>5 — moyen</span><span>10 — top</span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,paddingTop:4}}>
            <button type="button" onClick={onClose} style={{flex:1,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)',padding:11,borderRadius:12,fontSize:13,fontWeight:500,cursor:'pointer'}}>Annuler</button>
            <button type="submit" disabled={loading} style={{flex:1,background:'var(--accent)',color:'#fff',padding:11,borderRadius:12,fontSize:13,fontWeight:700,cursor:loading?'wait':'pointer',opacity:loading?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {loading?<><Spinner size={14}/>Création…</>:<><i className="fas fa-plus"/>Créer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Banner ── */
function SiteBanner({ banner }) {
  const [visible, setVisible] = useState(true)
  if (!banner?.banner_enabled || !visible) return null
  const map = {
    info:    {bg:'rgba(124,58,237,.1)',border:'rgba(124,58,237,.25)',color:'#a78bfa',icon:'fa-circle-info'},
    warning: {bg:'rgba(245,158,11,.1)',border:'rgba(245,158,11,.25)',color:'#fbbf24',icon:'fa-triangle-exclamation'},
    error:   {bg:'rgba(239,68,68,.1)', border:'rgba(239,68,68,.25)', color:'#f87171',icon:'fa-circle-xmark'},
  }
  const s = map[banner.banner_type] || map.info
  return (
    <div className="fade flex items-center gap-3 px-4 py-3 text-sm" style={{background:s.bg,borderBottom:`1px solid ${s.border}`,animation:'banner-in .3s ease'}}>
      <i className={`fas ${s.icon}`} style={{color:s.color,flexShrink:0}}/>
      <span style={{color:s.color,flex:1}}>{banner.banner_message}</span>
      <button onClick={()=>setVisible(false)} style={{color:s.color,opacity:.6,background:'none',border:'none',cursor:'pointer',flexShrink:0,fontSize:16}}>✕</button>
    </div>
  )
}

/* ── StatusBar ── */
function StatusBar({ filters, lastScans }) {
  const [now, setNow] = useState(new Date())
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[])
  const active = filters.filter(f=>f.is_active).length
  const lastGlobal = lastScans.length ? Math.max(...lastScans.map(d=>new Date(d))) : null
  const h=pad(now.getHours()),m=pad(now.getMinutes()),s=pad(now.getSeconds())
  return (
    <div className="au mono text-xs flex flex-wrap items-center gap-4 px-4 py-3 mb-6 rounded-2xl" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
      <div className="flex items-center gap-2">
        <div style={{position:'relative',display:'inline-flex'}}>
          <div style={{position:'absolute',inset:-3,borderRadius:'50%',background:'var(--accent)',opacity:.35,animation:'pulse-r 2s ease-out infinite'}}/>
          <div style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)'}}/>
        </div>
        <span className="font-bold tracking-widest" style={{color:'var(--accent)'}}>LIVE</span>
      </div>
      <div style={{width:1,height:16,background:'var(--border)'}} className="hidden sm:block"/>
      <span className="font-bold text-sm" style={{color:'var(--text)',letterSpacing:2}}>{h}<span className="colon">:</span>{m}<span className="colon">:</span>{s}</span>
      <div style={{width:1,height:16,background:'var(--border)'}} className="hidden sm:block"/>
      <span style={{color:'var(--muted)'}}><i className={`fas ${active>0?'fa-signal':'fa-signal-slash'}`} style={{marginRight:5,color:active>0?'var(--green)':'var(--muted)'}}/>{active} filtre{active!==1?'s':''} actif{active!==1?'s':''}</span>
      {lastGlobal&&<><div style={{width:1,height:16,background:'var(--border)'}} className="hidden sm:block"/><span style={{color:'var(--muted)'}}>dernier scan <span style={{color:'var(--text)'}}>{timeAgo(lastGlobal)} ago</span></span></>}
      <div className="ml-auto hidden md:block" style={{color:'var(--muted2)'}}>DealHunter AI · {new Date().toLocaleDateString('fr-FR')}</div>
    </div>
  )
}

/* ══ TABS ══ */
function TabOverview({ stats, listings, loading }) {
  return (
    <div className="space-y-6 au">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="fa-sliders"         label="Filtres actifs"      value={stats?.active_filters}  loading={loading}/>
        <StatCard icon="fa-magnifying-glass" label="Annonces analysées"  value={stats?.total_analyzed}  loading={loading}/>
        <StatCard icon="fa-trophy"           label="Bonnes affaires"     value={stats?.good_deals_found} loading={loading} accent/>
        <StatCard icon="fa-envelope"         label="Alertes envoyées"    value={stats?.alerts_sent}     loading={loading} green/>
      </div>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="syne font-bold text-lg" style={{color:'var(--text)'}}>Dernières annonces</h3>
          <div className="flex-1 h-px" style={{background:'var(--border)'}}/>
          {!loading&&<span className="mono text-xs" style={{color:'var(--muted2)'}}>{listings.length} total</span>}
        </div>
        {loading
          ?<div className="space-y-3">{[1,2,3].map(i=><SkCard key={i}/>)}</div>
          :listings.length===0
            ?<div className="rounded-2xl p-14 text-center" style={{background:'var(--surface)',border:'1px dashed var(--border)'}}><i className="fas fa-inbox fa-2x mb-3" style={{color:'var(--muted2)',display:'block'}}/><div className="syne font-bold mb-1" style={{color:'var(--text)'}}>Aucune annonce</div><div className="text-sm" style={{color:'var(--muted)'}}>Lancez <i className="fas fa-bolt"/> Scanner sur un filtre pour commencer</div></div>
            :<div className="space-y-3">{listings.slice(0,5).map(l=><ListingCard key={l.id} listing={l}/>)}</div>
        }
      </div>
    </div>
  )
}

function TabFilters({ filters, onDelete, onToggle, onScan, onNew, loading }) {
  const lbcCount    = filters.filter(f=>f.platform==='leboncoin').length
  const vintedCount = filters.filter(f=>f.platform==='vinted').length
  const bothCount   = filters.filter(f=>f.platform==='both').length
  return (
    <div className="au">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="mono text-xs" style={{color:'var(--muted)'}}>{filters.length}/10</span>
            <div style={{width:80,height:4,background:'var(--surface2)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(filters.length/10)*100}%`,background:'var(--accent)',borderRadius:4}}/>
            </div>
          </div>
          {lbcCount>0&&<span className="mono text-xs" style={{color:'var(--lbc)'}}><i className="fas fa-tag" style={{marginRight:4}}/>{lbcCount}</span>}
          {vintedCount>0&&<span className="mono text-xs" style={{color:'var(--vinted)'}}><i className="fas fa-shirt" style={{marginRight:4}}/>{vintedCount}</span>}
          {bothCount>0&&<span className="mono text-xs" style={{color:'var(--accent)'}}><i className="fas fa-layer-group" style={{marginRight:4}}/>{bothCount}</span>}
        </div>
        <button onClick={onNew} className="syne font-bold text-xs flex items-center gap-2" style={{background:'var(--accent)',color:'#fff',padding:'8px 16px',borderRadius:11,border:'none',cursor:'pointer'}}>
          <i className="fas fa-plus"/> Nouveau filtre
        </button>
      </div>
      {loading
        ?<div className="space-y-3">{[1,2,3].map(i=><SkFilter key={i}/>)}</div>
        :filters.length===0
          ?<div className="rounded-2xl p-14 text-center" style={{background:'var(--surface)',border:'1px dashed var(--border)'}}><i className="fas fa-satellite-dish fa-2x mb-3" style={{color:'var(--muted2)',display:'block'}}/><div className="syne font-bold mb-1" style={{color:'var(--text)'}}>Aucun filtre</div><div className="text-sm mb-5" style={{color:'var(--muted)'}}>Créez votre premier filtre de surveillance</div><button onClick={onNew} style={{background:'var(--accent)',color:'#fff',padding:'10px 24px',borderRadius:12,fontSize:13,fontWeight:700,border:'none',cursor:'pointer'}}><i className="fas fa-plus" style={{marginRight:6}}/>Créer un filtre</button></div>
          :<div className="space-y-3">{filters.map(f=><FilterCard key={f.id} filter={f} onDelete={onDelete} onToggle={onToggle} onScan={onScan}/>)}</div>
      }
    </div>
  )
}

function TabListings({ listings, filters, minScore, setMinScore, loading }) {
  const [fId, setFId]         = useState('all')
  const [platform, setPlatform] = useState('all')
  const shown = listings.filter(l => {
    const lPlatform = l.platform || (l.listing_id?.startsWith('vinted_') ? 'vinted' : 'leboncoin')
    return (fId==='all'||l.filter_id===fId) && (platform==='all'||lPlatform===platform)
  })
  const selStyle = {background:'var(--surface)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:12,fontFamily:'JetBrains Mono',padding:'7px 12px',borderRadius:11,cursor:'pointer'}
  return (
    <div className="au">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={fId} onChange={e=>setFId(e.target.value)} style={selStyle}>
          <option value="all">Tous les filtres</option>
          {filters.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={platform} onChange={e=>setPlatform(e.target.value)} style={selStyle}>
          <option value="all">Toutes plateformes</option>
          <option value="leboncoin">Leboncoin</option>
          <option value="vinted">Vinted</option>
        </select>
        <select value={minScore} onChange={e=>setMinScore(Number(e.target.value))} style={selStyle}>
          <option value={0}>Tous scores</option>
          <option value={5}>≥ 5/10</option>
          <option value={7}>≥ 7/10</option>
          <option value={8}>≥ 8/10</option>
          <option value={9}>≥ 9/10</option>
        </select>
        <span className="ml-auto mono text-xs" style={{color:'var(--muted2)'}}>{shown.length} résultat{shown.length>1?'s':''}</span>
      </div>
      {loading
        ?<div className="space-y-3">{[1,2,3,4].map(i=><SkCard key={i}/>)}</div>
        :shown.length===0
          ?<div className="rounded-2xl p-12 text-center" style={{background:'var(--surface)',border:'1px dashed var(--border)'}}><i className="fas fa-box-open fa-2x mb-3" style={{color:'var(--muted2)',display:'block'}}/><div className="syne font-bold mb-1" style={{color:'var(--text)'}}>Aucune annonce</div><div className="text-sm" style={{color:'var(--muted)'}}>Lancez <i className="fas fa-bolt"/> Scanner sur un filtre</div></div>
          :<div className="space-y-3">{shown.map(l=><ListingCard key={l.id} listing={l}/>)}</div>
      }
    </div>
  )
}

function TabAlerts({ alerts, loading }) {
  if (loading) return <div className="au space-y-2">{[1,2,3].map(i=><div key={i} className="sk rounded-2xl" style={{height:60}}/>)}</div>
  if (!alerts?.length) return <div className="au rounded-2xl p-14 text-center" style={{background:'var(--surface)',border:'1px dashed var(--border)'}}><i className="fas fa-envelope-open fa-2x mb-3" style={{color:'var(--muted2)',display:'block'}}/><div className="syne font-bold mb-1" style={{color:'var(--text)'}}>Aucune alerte</div><div className="text-sm" style={{color:'var(--muted)'}}>Les alertes email s'affichent ici</div></div>
  return (
    <div className="au space-y-2">
      {alerts.map(a=>(
        <div key={a.id} className="card flex items-center gap-4 rounded-2xl p-4" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{width:36,height:36,fontSize:14,...(a.email_status==='sent'?{background:'var(--green-dim)',border:'1px solid var(--green-border)',color:'var(--green)'}:{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'})}}>
            <i className={`fas ${a.email_status==='sent'?'fa-check':'fa-xmark'}`}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate" style={{color:'var(--text)'}}>{a.listing_title}</span>
              <span className="mono text-xs font-bold" style={{color:'var(--accent)',flexShrink:0}}>{a.ai_score}/10</span>
            </div>
            <div className="flex items-center gap-3 mt-1 mono text-xs" style={{color:'var(--muted2)'}}>
              {a.listing_price&&<span style={{color:'var(--amber)',fontWeight:700}}>{a.listing_price.toLocaleString('fr-FR')} €</span>}
              <span>{timeAgo(a.sent_at)} ago</span>
              <span style={{color:a.email_status==='sent'?'var(--green)':'var(--red)'}}>{a.email_status==='sent'?'✓ email envoyé':'✗ échec'}</span>
            </div>
          </div>
          <a href={a.listing_url} target="_blank" rel="noreferrer" className="mono text-xs font-medium flex-shrink-0" style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:10,textDecoration:'none'}}>Voir →</a>
        </div>
      ))}
    </div>
  )
}

function TabSettings({ user }) {
  return (
    <div className="au space-y-4" style={{maxWidth:520}}>
      <div className="rounded-2xl p-5" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        <div className="mono text-xs mb-4 flex items-center gap-2" style={{color:'var(--muted2)',letterSpacing:2}}><i className="fas fa-user"/>COMPTE</div>
        {[{k:'NOM',v:user?.full_name||'—'},{k:'EMAIL',v:user?.email}].map(({k,v})=>(
          <div key={k} className="flex gap-3 mb-3">
            <span className="mono text-xs w-16 flex-shrink-0 pt-2" style={{color:'var(--muted2)'}}>{k}</span>
            <div className="flex-1 mono text-sm rounded-xl px-3 py-2" style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--muted)'}}>{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        <div className="mono text-xs mb-4 flex items-center gap-2" style={{color:'var(--muted2)',letterSpacing:2}}><i className="fas fa-server"/>SYSTÈME</div>
        {[
          {k:'SERVEUR', v:'Ubuntu — en ligne', ok:true},
          {k:'SCRAPER', v:'Leboncoin + Vinted'},
          {k:'SCAN',    v:'Toutes les 10 min'},
          {k:'MODÈLE',  v:'Llama 3.1 8B (Groq)'},
          {k:'MAIL',    v:'Brevo SMTP'},
          {k:'BASE',    v:'MongoDB Atlas'},
        ].map(({k,v,ok})=>(
          <div key={k} className="flex items-center gap-3 mono text-xs py-2.5" style={{borderBottom:'1px solid var(--border)'}}>
            <span className="w-20 flex-shrink-0" style={{color:'var(--muted2)'}}>{k}</span>
            <span className="flex-1" style={{color:'var(--muted)'}}>{v}</span>
            {ok&&<div style={{width:7,height:7,borderRadius:'50%',background:'var(--green)'}}/>}
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{background:'var(--red-dim)',border:'1px solid var(--red-border)'}}>
        <div className="mono text-xs mb-2 flex items-center gap-2" style={{color:'var(--red)',letterSpacing:2}}><i className="fas fa-triangle-exclamation"/>DANGER</div>
        <p className="text-xs mb-4" style={{color:'var(--muted)'}}>La déconnexion efface uniquement la session locale.</p>
        <button onClick={logout} className="mono text-xs font-medium flex items-center gap-2" style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)',padding:'8px 16px',borderRadius:11,cursor:'pointer'}}>
          <i className="fas fa-right-from-bracket"/>Se déconnecter
        </button>
      </div>
    </div>
  )
}

/* ══ MAIN ══ */
const TABS = [
  {id:'overview', label:"Vue d'ensemble", icon:'fa-chart-line'},
  {id:'filters',  label:'Filtres',        icon:'fa-satellite-dish'},
  {id:'listings', label:'Annonces',       icon:'fa-tag'},
  {id:'alerts',   label:'Alertes',        icon:'fa-bell'},
  {id:'settings', label:'Paramètres',     icon:'fa-gear'},
]

export default function Dashboard() {
  const user = getUser()
  const [tab, setTab]           = useState('overview')
  const [stats, setStats]       = useState(null)
  const [filters, setFilters]   = useState([])
  const [listings, setListings] = useState([])
  const [alerts, setAlerts]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast]       = useState(null)
  const [minScore, setMinScore] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [banner, setBanner]     = useState(null)

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3500) }

  useEffect(() => {
    api.get('/admin/status').then(r=>setBanner(r)).catch(()=>{})
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const [s,f,l,a] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/filters/'),
        api.get(`/dashboard/listings?min_score=${minScore}&per_page=40`),
        api.get('/dashboard/alerts'),
      ])
      if(s) setStats(s)
      if(f) setFilters(f)
      if(l) setListings(l.listings||[])
      if(a) setAlerts(a)
    } finally { setLoading(false) }
  }, [minScore])

  useEffect(()=>{ loadAll() },[loadAll])

  const handleDelete = async id => {
    if(!confirm('Supprimer ce filtre et ses annonces ?')) return
    try { await api.delete(`/filters/${id}`); await loadAll(); showToast('Filtre supprimé') }
    catch(e) { showToast(e.message,false) }
  }
  const handleToggle = async id => {
    try { await api.patch(`/filters/${id}/toggle`); await loadAll() }
    catch(e) { showToast(e.message,false) }
  }
  const handleScan = async id => {
    try { const r=await api.post(`/filters/${id}/scan`,{}); showToast(r?.message||'Scan terminé ✓'); await loadAll() }
    catch(e) { showToast(e.message,false) }
  }

  const recentAlerts = (alerts||[]).filter(a=>Date.now()-new Date(a.sent_at)<86400000).length
  const lastScans    = filters.filter(f=>f.last_scan_at).map(f=>f.last_scan_at)
  const userName     = user?.full_name||user?.email?.split('@')[0]||'vous'
  const isAdmin      = user?.is_admin

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>
      <style>{STYLES}</style>
      <div className="grid-bg fixed inset-0 pointer-events-none" style={{opacity:.5}}/>
      <SiteBanner banner={banner}/>

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:20,background:'rgba(9,9,11,.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'11px 20px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <Link to="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
            <div style={{width:28,height:28,background:'var(--accent)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',fontSize:13}}>D</div>
            <span className="syne font-bold text-sm hidden sm:block" style={{color:'var(--text)'}}>DealHunter <span style={{color:'var(--accent)'}}>AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin&&<Link to="/admin" className="mono text-xs flex items-center gap-1.5" style={{color:'var(--red)',textDecoration:'none',background:'var(--red-dim)',border:'1px solid var(--red-border)',padding:'5px 10px',borderRadius:9}}><i className="fas fa-shield-halved" style={{fontSize:10}}/>Admin</Link>}
            <span className="mono text-xs hidden md:block" style={{color:'var(--muted2)'}}>{userName}</span>
            {recentAlerts>0&&<button onClick={()=>setTab('alerts')} style={{position:'relative',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--text)'}}>
              <i className="fas fa-bell"/>
              <span className="mono" style={{position:'absolute',top:-6,right:-6,width:16,height:16,background:'var(--accent)',color:'#fff',fontSize:9,fontWeight:700,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{recentAlerts}</span>
            </button>}
            <button onClick={logout} className="mono text-xs flex items-center gap-1.5" style={{color:'var(--muted)',background:'none',border:'none',cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}>
              <i className="fas fa-right-from-bracket" style={{fontSize:11}}/><span className="hidden sm:inline">Déco</span>
            </button>
          </div>
        </div>
      </nav>

      {/* TABS */}
      <div style={{position:'sticky',top:51,zIndex:10,background:'rgba(9,9,11,.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',display:'flex'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:7,padding:'13px 14px',fontSize:13,fontWeight:500,whiteSpace:'nowrap',cursor:'pointer',border:'none',borderBottom:`2px solid ${tab===t.id?'var(--accent)':'transparent'}`,background:'none',marginBottom:-1,color:tab===t.id?'var(--accent)':'var(--muted)',transition:'color .2s',fontFamily:'DM Sans'}}>
              <i className={`fas ${t.icon}`} style={{fontSize:13}}/>
              <span className="hidden sm:inline">{t.label}</span>
              {t.id==='alerts'&&recentAlerts>0&&<span className="mono" style={{width:16,height:16,background:'var(--accent)',color:'#fff',fontSize:9,fontWeight:700,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{recentAlerts}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 20px 96px'}}>
        <StatusBar filters={filters} lastScans={lastScans}/>
        {tab==='overview' &&<TabOverview  stats={stats}    listings={listings} loading={loading}/>}
        {tab==='filters'  &&<TabFilters   filters={filters} onDelete={handleDelete} onToggle={handleToggle} onScan={handleScan} onNew={()=>setShowModal(true)} loading={loading}/>}
        {tab==='listings' &&<TabListings  listings={listings} filters={filters} minScore={minScore} setMinScore={setMinScore} loading={loading}/>}
        {tab==='alerts'   &&<TabAlerts    alerts={alerts}  loading={loading}/>}
        {tab==='settings' &&<TabSettings  user={user}/>}
      </div>

      {tab==='filters'&&<button onClick={()=>setShowModal(true)} className="md:hidden active:scale-95" style={{position:'fixed',bottom:24,right:20,zIndex:40,width:56,height:56,background:'var(--accent)',color:'#fff',borderRadius:16,fontSize:22,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px var(--accent-glow)'}}><i className="fas fa-plus"/></button>}
      {showModal&&<NewFilterModal onClose={()=>setShowModal(false)} onCreated={loadAll}/>}
      {toast&&<div className="au mono text-xs fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap shadow-2xl" style={{background:'var(--surface)',border:`1px solid ${toast.ok?'var(--green-border)':'var(--red-border)'}`,color:toast.ok?'var(--green)':'var(--red)'}}><i className={`fas ${toast.ok?'fa-check':'fa-xmark'}`}/>{toast.msg}</div>}
    </div>
  )
}
