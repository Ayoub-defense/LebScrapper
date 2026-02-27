import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getUser, getToken } from '../hooks/useApi'

const STYLES = `
  :root {
    --bg:#09090b;--surface:#111118;--surface2:#18181f;
    --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);
    --text:#f0f0f4;--muted:#6b6b7a;--muted2:#3d3d4a;
    --accent:#7C3AED;--accent-dim:rgba(124,58,237,.12);--accent-border:rgba(124,58,237,.25);
    --green:#10b981;--green-dim:rgba(16,185,129,.1);--green-border:rgba(16,185,129,.25);
    --red:#ef4444;--red-dim:rgba(239,68,68,.1);--red-border:rgba(239,68,68,.25);
    --amber:#f59e0b;--amber-dim:rgba(245,158,11,.1);--amber-border:rgba(245,158,11,.25);
    --warn:#eab308;--warn-dim:rgba(234,179,8,.1);--warn-border:rgba(234,179,8,.25);
  }
  *{font-family:'DM Sans',sans-serif;box-sizing:border-box}
  .mono{font-family:'JetBrains Mono',monospace}
  .syne{font-family:'Syne',sans-serif}
  .grid-bg{background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:32px 32px}
  @keyframes slide-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fade-in{from{opacity:0}to{opacity:1}}
  @keyframes shimmer{0%{background-position:-500px 0}100%{background-position:500px 0}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse-r{0%{transform:scale(1);opacity:.5}70%,100%{transform:scale(2.5);opacity:0}}
  .au{animation:slide-up .3s cubic-bezier(.2,.8,.4,1) both}
  .fade{animation:fade-in .2s ease both}
  .sk{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:500px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px}
  .spin-el{animation:spin .8s linear infinite}
  .card{transition:border-color .2s}
  .card:hover{border-color:var(--border2)!important}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;outline:none;box-shadow:0 0 0 3px rgba(124,58,237,.08)}
  input[type=range]{accent-color:var(--accent)}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
  .toggle{position:relative;width:44px;height:24px;border-radius:12px;cursor:pointer;border:1px solid var(--border);flex-shrink:0}
  .toggle-knob{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s}
  .row-hover:hover{background:rgba(255,255,255,.02)}
`

function Spinner({size=16}){return<div className="spin-el"style={{width:size,height:size,border:`${size<=16?2:2.5}px solid rgba(124,58,237,.2)`,borderTopColor:'var(--accent)',borderRadius:'50%',flexShrink:0}}/>}

function Toggle({value,onChange,red}){
  return<button className="toggle" onClick={()=>onChange(!value)} style={{background:value?(red?'var(--red)':'var(--green)'):'var(--surface2)'}}>
    <div className="toggle-knob" style={{left:value?23:3}}/>
  </button>
}

function Badge({color,icon,children}){
  const map={green:{bg:'var(--green-dim)',b:'var(--green-border)',c:'var(--green)'},red:{bg:'var(--red-dim)',b:'var(--red-border)',c:'var(--red)'},amber:{bg:'var(--amber-dim)',b:'var(--amber-border)',c:'var(--amber)'},warn:{bg:'var(--warn-dim)',b:'var(--warn-border)',c:'var(--warn)'},accent:{bg:'var(--accent-dim)',b:'var(--accent-border)',c:'var(--accent)'},muted:{bg:'var(--surface2)',b:'var(--border)',c:'var(--muted)'}}
  const s=map[color]||map.muted
  return<span className="mono text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1"style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c}}>
    {icon&&<i className={`fas ${icon}`}style={{fontSize:9}}/>}{children}
  </span>
}

function StatCard({icon,label,value,color,loading}){
  const colors={accent:'var(--accent)',green:'var(--green)',red:'var(--red)',amber:'var(--amber)',white:'var(--text)'}
  const c=colors[color]||colors.white
  return<div className="card rounded-2xl p-4"style={{background:'var(--surface)',border:`1px solid ${color&&color!=='white'?`var(--${color}-border)`:'var(--border)'}`}}>
    {loading?<div className="space-y-2"><div className="sk"style={{width:28,height:28,borderRadius:8}}/><div className="sk"style={{height:28,width:'55%'}}/><div className="sk"style={{height:10,width:'70%'}}/></div>:<>
      <div style={{fontSize:20,marginBottom:8}}><i className={`fas ${icon}`}style={{color:c}}/></div>
      <div className="mono font-bold"style={{fontSize:26,color:c}}>{(value??0).toLocaleString('fr-FR')}</div>
      <div className="text-xs mt-1"style={{color:'var(--muted)'}}>{label}</div>
    </>}
  </div>
}

/* ══ SECTION DASHBOARD ══ */
function SectionDashboard({data,loading}){
  if(loading)return<div className="space-y-4 au"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4,5,6,7].map(i=><div key={i}className="sk rounded-2xl"style={{height:96}}/>)}</div></div>
  if(!data)return null
  const{stats,top_users,last_alerts}=data
  return<div className="space-y-6 au">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon="fa-users"         label="Utilisateurs"    value={stats.total_users}    />
      <StatCard icon="fa-sliders"        label="Filtres actifs"  value={stats.active_filters} color="green"/>
      <StatCard icon="fa-box-archive"    label="Annonces en DB"  value={stats.total_listings} />
      <StatCard icon="fa-envelope"       label="Alertes envoyées"value={stats.sent_alerts}    color="accent"/>
      <StatCard icon="fa-circle-xmark"   label="Alertes échouées"value={stats.failed_alerts}  color={stats.failed_alerts>0?'red':'white'}/>
      <StatCard icon="fa-satellite-dish" label="Filtres total"   value={stats.total_filters}  />
      <StatCard icon="fa-bell"           label="Total alertes"   value={stats.total_alerts}   />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-4"style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        <div className="mono text-xs mb-4 flex items-center gap-2"style={{color:'var(--muted2)',letterSpacing:2}}><i className="fas fa-crown"style={{color:'var(--amber)'}}/>TOP UTILISATEURS</div>
        {top_users.length===0?<div className="text-xs text-center py-6"style={{color:'var(--muted)'}}>Aucun utilisateur</div>
          :top_users.map((u,i)=><div key={u.id} className="row-hover flex items-center gap-3 py-2.5 rounded-xl px-1" style={{borderBottom:i<top_users.length-1?'1px solid var(--border)':'none'}}>
            <span className="mono text-xs w-5"style={{color:'var(--muted2)'}}>#{i+1}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"style={{background:u.is_admin?'var(--red-dim)':'var(--accent-dim)',color:u.is_admin?'var(--red)':'var(--accent)',border:`1px solid ${u.is_admin?'var(--red-border)':'var(--accent-border)'}`}}>{(u.full_name||u.email)[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate"style={{color:'var(--text)'}}>{u.full_name||u.email.split('@')[0]}</div><div className="mono text-xs truncate"style={{color:'var(--muted)'}}>{u.email}</div></div>
            <Badge color="accent">{u.filters} filtres</Badge>
          </div>)
        }
      </div>
      <div className="rounded-2xl p-4"style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        <div className="mono text-xs mb-4 flex items-center gap-2"style={{color:'var(--muted2)',letterSpacing:2}}><i className="fas fa-bell"style={{color:'var(--accent)'}}/>DERNIÈRES ALERTES</div>
        {last_alerts.length===0?<div className="text-xs text-center py-6"style={{color:'var(--muted)'}}>Aucune alerte</div>
          :last_alerts.map((a,i)=><div key={a.id} className="row-hover flex items-center gap-3 py-2.5 rounded-xl px-1"style={{borderBottom:i<last_alerts.length-1?'1px solid var(--border)':'none'}}>
            <i className={`fas ${a.email_status==='sent'?'fa-circle-check':'fa-circle-xmark'}`}style={{color:a.email_status==='sent'?'var(--green)':'var(--red)',fontSize:14,flexShrink:0}}/>
            <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate"style={{color:'var(--text)'}}>{a.listing_title}</div><div className="mono text-xs"style={{color:'var(--muted)'}}>{new Date(a.sent_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
            <Badge color={a.ai_score>=8?'green':a.ai_score>=6?'amber':'muted'}>{a.ai_score}/10</Badge>
          </div>)
        }
      </div>
    </div>
  </div>
}

/* ══ SECTION USERS ══ */
function SectionUsers({onToast}){
  const[users,setUsers]=useState([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')

  const load=async()=>{setLoading(true);try{const r=await api.get('/admin/users');setUsers(r||[])}catch(e){onToast(e.message,false)}finally{setLoading(false)}}
  useEffect(()=>{load()},[])

  const filtered=users.filter(u=>u.email.toLowerCase().includes(search.toLowerCase())||(u.full_name||'').toLowerCase().includes(search.toLowerCase()))

  const toggleActive=async id=>{try{await api.patch(`/admin/users/${id}/toggle-active`);await load();onToast('Statut modifié')}catch(e){onToast(e.message,false)}}
  const toggleAdmin=async id=>{if(!confirm('Modifier le rôle admin ?'))return;try{await api.patch(`/admin/users/${id}/toggle-admin`);await load();onToast('Rôle modifié')}catch(e){onToast(e.message,false)}}
  const deleteUser=async(id,email)=>{if(!confirm(`Supprimer définitivement "${email}" et TOUTES ses données ?`))return;try{await api.delete(`/admin/users/${id}`);await load();onToast('Utilisateur supprimé')}catch(e){onToast(e.message,false)}}

  return<div className="au space-y-3">
    <div className="flex items-center gap-3">
      <div className="relative flex-1" style={{maxWidth:300}}>
        <i className="fas fa-magnifying-glass absolute"style={{left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:12,pointerEvents:'none'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" className="mono text-xs"style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',padding:'8px 12px 8px 32px',borderRadius:11}}/>
      </div>
      <span className="mono text-xs"style={{color:'var(--muted2)'}}>{filtered.length} compte{filtered.length>1?'s':''}</span>
    </div>
    {loading?<div className="space-y-2">{[1,2,3,4].map(i=><div key={i}className="sk rounded-xl"style={{height:58}}/>)}</div>
      :filtered.length===0?<div className="text-center py-12 text-sm"style={{color:'var(--muted)'}}>Aucun résultat</div>
      :<div className="rounded-2xl overflow-hidden"style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        {filtered.map((u,i)=><div key={u.id} className="row-hover flex items-center gap-3 p-4"style={{borderBottom:i<filtered.length-1?'1px solid var(--border)':'none'}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"style={{background:u.is_admin?'var(--red-dim)':'var(--accent-dim)',color:u.is_admin?'var(--red)':'var(--accent)',border:`1px solid ${u.is_admin?'var(--red-border)':'var(--accent-border)'}`}}>{(u.full_name||u.email)[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-semibold"style={{color:'var(--text)'}}>{u.full_name||u.email.split('@')[0]}</span>
              {u.is_admin&&<Badge color="red" icon="fa-shield-halved">ADMIN</Badge>}
              {!u.is_active&&<Badge color="muted" icon="fa-ban">INACTIF</Badge>}
            </div>
            <div className="mono text-xs"style={{color:'var(--muted)'}}>{u.email} · {u.filter_count} filtres · {u.listing_count} annonces · {u.alert_count} alertes · inscrit {new Date(u.created_at).toLocaleDateString('fr-FR')}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={()=>toggleActive(u.id)} title={u.is_active?'Désactiver':'Activer'} className="mono text-xs px-2.5 py-1.5 rounded-lg"style={{background:u.is_active?'var(--green-dim)':'var(--surface2)',border:`1px solid ${u.is_active?'var(--green-border)':'var(--border)'}`,color:u.is_active?'var(--green)':'var(--muted)',cursor:'pointer'}}>
              <i className={`fas ${u.is_active?'fa-check':'fa-xmark'}`}/>
            </button>
            <button onClick={()=>toggleAdmin(u.id)} title={u.is_admin?'Retirer admin':'Rendre admin'} className="mono text-xs px-2.5 py-1.5 rounded-lg"style={{background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--muted)',cursor:'pointer'}}>
              <i className={`fas ${u.is_admin?'fa-user-minus':'fa-user-plus'}`}/>
            </button>
            <button onClick={()=>deleteUser(u.id,u.email)} className="mono text-xs px-2.5 py-1.5 rounded-lg"style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)',cursor:'pointer'}}>
              <i className="fas fa-trash-can"/>
            </button>
          </div>
        </div>)}
      </div>
    }
  </div>
}

/* ══ SECTION MAINTENANCE & BANNIÈRE ══ */
function SectionMaintenance({settings,onSave,onToast}){
  const[form,setForm]=useState(settings||{})
  const[saving,setSaving]=useState(false)
  useEffect(()=>{setForm(settings||{})},[settings])
  const set=k=>v=>setForm(f=>({...f,[k]:v}))
  const setVal=k=>e=>setForm(f=>({...f,[k]:e.target.value}))

  async function save(){
    setSaving(true)
    try{await api.patch('/admin/settings',form);onToast('Paramètres sauvegardés ✓');onSave(form)}
    catch(e){onToast(e.message,false)}finally{setSaving(false)}
  }

  const card={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:16}
  const lbl={display:'block',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:2,marginBottom:6}
  const inp={width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',fontSize:13,color:'var(--text)',outline:'none',transition:'border-color .2s,box-shadow .2s'}

  return<div className="au"style={{maxWidth:600}}>
    {/* Maintenance */}
    <div style={{...card,borderColor:form.maintenance_mode?'var(--red-border)':'var(--border)'}}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-wrench"style={{color:form.maintenance_mode?'var(--red)':'var(--muted)'}}/>Mode maintenance</div>
          <div className="text-xs mt-0.5"style={{color:'var(--muted)'}}>Bloque toutes les requêtes API sauf auth et admin</div>
        </div>
        <Toggle value={!!form.maintenance_mode} onChange={set('maintenance_mode')} red/>
      </div>
      {form.maintenance_mode&&<div className="mono text-xs px-3 py-2 rounded-xl mb-3 flex items-center gap-2"style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'}}><i className="fas fa-circle-exclamation"/>MAINTENANCE ACTIVE — les utilisateurs voient une page d'erreur</div>}
      <div>
        <label style={lbl}>Message affiché aux utilisateurs</label>
        <textarea value={form.maintenance_message||''} onChange={setVal('maintenance_message')} rows={3} style={{...inp,resize:'vertical',fontFamily:'JetBrains Mono',fontSize:12}}/>
      </div>
    </div>

    {/* Bannière */}
    <div style={{...card,borderColor:form.banner_enabled?'var(--accent-border)':'var(--border)'}}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-bullhorn"style={{color:form.banner_enabled?'var(--accent)':'var(--muted)'}}/>Bannière d'annonce</div>
          <div className="text-xs mt-0.5"style={{color:'var(--muted)'}}>Message visible en haut du dashboard pour tous les utilisateurs</div>
        </div>
        <Toggle value={!!form.banner_enabled} onChange={set('banner_enabled')}/>
      </div>
      {form.banner_enabled&&<div className="space-y-3">
        <div>
          <label style={lbl}>Message de la bannière</label>
          <input value={form.banner_message||''} onChange={setVal('banner_message')} placeholder="Ex: Maintenance prévue ce soir à 22h" style={inp}/>
        </div>
        {/* Prévisualisation */}
        {form.banner_message&&<div>
          <label style={lbl}>Aperçu</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"style={form.banner_type==='error'?{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'}:form.banner_type==='warning'?{background:'var(--warn-dim)',border:'1px solid var(--warn-border)',color:'var(--warn)'}:{background:'var(--accent-dim)',border:'1px solid var(--accent-border)',color:'#a78bfa'}}>
            <i className={`fas ${form.banner_type==='error'?'fa-circle-xmark':form.banner_type==='warning'?'fa-triangle-exclamation':'fa-circle-info'}`}/>
            <span style={{flex:1}}>{form.banner_message}</span>
            <span style={{opacity:.5,fontSize:13}}>✕</span>
          </div>
        </div>}
        <div>
          <label style={lbl}>Type</label>
          <div className="flex gap-2">
            {[{v:'info',icon:'fa-circle-info',label:'Info',color:'accent'},{v:'warning',icon:'fa-triangle-exclamation',label:'Warning',color:'warn'},{v:'error',icon:'fa-circle-xmark',label:'Erreur',color:'red'}].map(t=><button key={t.v} type="button" onClick={()=>set('banner_type')(t.v)} className="mono text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg"style={{background:form.banner_type===t.v?`var(--${t.color}-dim)`:'var(--surface2)',border:`1px solid ${form.banner_type===t.v?`var(--${t.color}-border)`:'var(--border)'}`,color:form.banner_type===t.v?`var(--${t.color})`:'var(--muted)',cursor:'pointer'}}>
              <i className={`fas ${t.icon}`}style={{fontSize:10}}/>{t.label}
            </button>)}
          </div>
        </div>
      </div>}
    </div>

    <button onClick={save} disabled={saving} className="flex items-center gap-2 font-bold"style={{background:'var(--accent)',color:'#fff',padding:'11px 24px',borderRadius:12,fontSize:13,border:'none',cursor:saving?'wait':'pointer',opacity:saving?.7:1}}>
      {saving?<Spinner size={14}/>:<i className="fas fa-floppy-disk"/>}{saving?'Sauvegarde…':'Sauvegarder'}
    </button>
  </div>
}

/* ══ SECTION SCRAPER ══ */
function SectionScraper({settings,onSave,onToast}){
  const[form,setForm]=useState(settings||{})
  const[saving,setSaving]=useState(false)
  useEffect(()=>{setForm(settings||{})},[settings])
  const set=k=>v=>setForm(f=>({...f,[k]:v}))
  const setNum=k=>e=>setForm(f=>({...f,[k]:Number(e.target.value)}))

  async function save(){setSaving(true);try{await api.patch('/admin/settings',form);onToast('Sauvegardé ✓');onSave(form)}catch(e){onToast(e.message,false)}finally{setSaving(false)}}

  const card={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:16}
  const lbl={display:'block',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:2,marginBottom:6}

  return<div className="au"style={{maxWidth:600}}>
    <div style={{...card,borderColor:!form.scraper_enabled?'var(--red-border)':'var(--border)'}}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-bolt"style={{color:form.scraper_enabled?'var(--amber)':'var(--muted)'}}/>Scraper actif</div>
          <div className="text-xs mt-0.5"style={{color:'var(--muted)'}}>Active ou désactive le scraping automatique (Leboncoin + Vinted)</div>
        </div>
        <Toggle value={!!form.scraper_enabled} onChange={set('scraper_enabled')} red={!form.scraper_enabled}/>
      </div>
      {!form.scraper_enabled&&<div className="mono text-xs px-3 py-2 rounded-xl mt-3 flex items-center gap-2"style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'}}><i className="fas fa-circle-pause"/>Scraper désactivé — aucun scan automatique</div>}
    </div>

    <div style={card}>
      <div className="font-semibold mb-4 flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-sliders"style={{color:'var(--accent)'}}/>Paramètres de scan</div>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2"><label style={{...lbl,marginBottom:0}}>Intervalle entre les scans</label><span className="mono font-bold"style={{color:'var(--accent)'}}>{form.scan_interval_minutes||60} min</span></div>
          <input type="range" min="15" max="240" step="15" value={form.scan_interval_minutes||60} onChange={setNum('scan_interval_minutes')} className="w-full cursor-pointer"/>
          <div className="mono flex justify-between text-xs mt-1"style={{color:'var(--muted2)'}}><span>15min</span><span>1h</span><span>2h</span><span>4h</span></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><label style={{...lbl,marginBottom:0}}>Annonces max par scan</label><span className="mono font-bold"style={{color:'var(--accent)'}}>{form.max_listings_per_scan||20}</span></div>
          <input type="range" min="5" max="50" step="5" value={form.max_listings_per_scan||20} onChange={setNum('max_listings_per_scan')} className="w-full cursor-pointer"/>
          <div className="mono flex justify-between text-xs mt-1"style={{color:'var(--muted2)'}}><span>5</span><span>25</span><span>50</span></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><label style={{...lbl,marginBottom:0}}>Score minimum global</label><span className="mono font-bold"style={{color:'var(--accent)'}}>{form.min_score_global??1}/10</span></div>
          <input type="range" min="1" max="10" step="0.5" value={form.min_score_global??1} onChange={setNum('min_score_global')} className="w-full cursor-pointer"/>
          <div className="mono text-xs mt-1"style={{color:'var(--muted2)'}}>Mettre à 1/10 = toutes les alertes passent sans restriction</div>
        </div>
      </div>
    </div>

    <button onClick={save} disabled={saving} className="flex items-center gap-2 font-bold"style={{background:'var(--accent)',color:'#fff',padding:'11px 24px',borderRadius:12,fontSize:13,border:'none',cursor:saving?'wait':'pointer',opacity:saving?.7:1}}>
      {saving?<Spinner size={14}/>:<i className="fas fa-floppy-disk"/>}{saving?'Sauvegarde…':'Sauvegarder'}
    </button>
  </div>
}

/* ══ SECTION DONNÉES ══ */
function SectionData({onToast}){
  const[loading,setLoading]=useState({})
  const[results,setResults]=useState({})

  async function purge(endpoint,key){
    setLoading(l=>({...l,[key]:true}))
    try{const r=await api.delete(endpoint);setResults(res=>({...res,[key]:r.message}));onToast(r.message)}
    catch(e){onToast(e.message,false)}finally{setLoading(l=>({...l,[key]:false}))}
  }

  const card={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:12}
  const btnStyle=(danger)=>({display:'flex',alignItems:'center',gap:6,fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600,padding:'7px 14px',borderRadius:10,border:`1px solid ${danger?'var(--red-border)':'var(--accent-border)'}`,background:danger?'var(--red-dim)':'var(--accent-dim)',color:danger?'var(--red)':'var(--accent)',cursor:'pointer'})

  return<div className="au"style={{maxWidth:600}}>
    <div style={card}>
      <div className="font-semibold mb-1 flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-box-archive"style={{color:'var(--accent)'}}/>Purge des annonces</div>
      <div className="text-sm mb-4"style={{color:'var(--muted)'}}>Supprime les annonces trop anciennes pour libérer de l'espace.</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {[7,14,30,60].map(d=><button key={d} onClick={()=>purge(`/admin/data/listings/old?days=${d}`,`listings_${d}`)} disabled={loading[`listings_${d}`]} style={btnStyle(d<=14)}>
          {loading[`listings_${d}`]&&<Spinner size={11}/>}<i className="fas fa-clock"style={{fontSize:9}}/>> {d}j
        </button>)}
        <button onClick={()=>{if(confirm('Supprimer TOUTES les annonces ?'))purge('/admin/data/all-listings','listings_all')}} disabled={loading.listings_all} style={btnStyle(true)}>
          {loading.listings_all&&<Spinner size={11}/>}<i className="fas fa-trash"/>Tout supprimer
        </button>
      </div>
      {results.listings_all&&<div className="mono text-xs mt-2 flex items-center gap-1"style={{color:'var(--green)'}}><i className="fas fa-check"/>  {results.listings_all}</div>}
      {Object.entries(results).filter(([k])=>k.startsWith('listings_')&&k!=='listings_all').map(([k,v])=><div key={k}className="mono text-xs mt-1 flex items-center gap-1"style={{color:'var(--green)'}}><i className="fas fa-check"/>{v}</div>)}
    </div>

    <div style={card}>
      <div className="font-semibold mb-1 flex items-center gap-2"style={{color:'var(--text)'}}><i className="fas fa-envelope"style={{color:'var(--accent)'}}/>Purge des alertes</div>
      <div className="text-sm mb-4"style={{color:'var(--muted)'}}>Supprime l'historique des alertes email envoyées.</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {[7,14,30,60].map(d=><button key={d} onClick={()=>purge(`/admin/data/alerts/old?days=${d}`,`alerts_${d}`)} disabled={loading[`alerts_${d}`]} style={btnStyle(d<=14)}>
          {loading[`alerts_${d}`]&&<Spinner size={11}/>}<i className="fas fa-clock"style={{fontSize:9}}/>> {d}j
        </button>)}
      </div>
      {Object.entries(results).filter(([k])=>k.startsWith('alerts_')).map(([k,v])=><div key={k}className="mono text-xs mt-1 flex items-center gap-1"style={{color:'var(--green)'}}><i className="fas fa-check"/>{v}</div>)}
    </div>

    <div className="rounded-2xl p-4"style={{background:'var(--red-dim)',border:'1px solid var(--red-border)'}}>
      <div className="mono text-xs mb-1 flex items-center gap-2"style={{color:'var(--red)',letterSpacing:2}}><i className="fas fa-triangle-exclamation"/>ZONE CRITIQUE</div>
      <div className="text-xs"style={{color:'var(--muted)'}}>Les suppressions sont <strong style={{color:'var(--text)'}}>irréversibles</strong>. Il n'existe aucun système de récupération.</div>
    </div>
  </div>
}

/* ══════════════════════════════════════════════
   MAIN ADMIN
══════════════════════════════════════════════ */
const TABS = [
  {id:'dashboard',   label:'Vue d\'ensemble',  icon:'fa-chart-pie'},
  {id:'users',       label:'Utilisateurs',     icon:'fa-users'},
  {id:'maintenance', label:'Maintenance',      icon:'fa-wrench'},
  {id:'scraper',     label:'Scraper',          icon:'fa-bolt'},
  {id:'data',        label:'Données',          icon:'fa-database'},
]

export default function Admin(){
  const navigate=useNavigate()
  const user=getUser()
  const[tab,setTab]=useState('dashboard')
  const[dashData,setDashData]=useState(null)
  const[settings,setSettings]=useState(null)
  const[loading,setLoading]=useState(true)
  const[toast,setToast]=useState(null)
  const[checking,setChecking]=useState(true)

  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3500)}

  useEffect(()=>{
    async function check(){
      if(!getToken()){navigate('/login');return}
      try{
        const r=await api.get('/admin/dashboard')
        setDashData(r); setSettings(r.settings)
      }catch(e){
        if(e.message?.includes('403')||e.message?.toLowerCase().includes('admin')){navigate('/dashboard')}
        else{showToast(e.message,false)}
      }finally{setChecking(false);setLoading(false)}
    }
    check()
  },[])

  async function refreshDash(){
    try{const r=await api.get('/admin/dashboard');setDashData(r);setSettings(r.settings)}
    catch(e){showToast(e.message,false)}
  }

  if(checking)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{STYLES}</style><div className="text-center"><Spinner size={32}/><div className="mono text-xs mt-4"style={{color:'var(--muted)'}}>Vérification des droits…</div></div></div>

  return<div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>
    <style>{STYLES}</style>
    <div className="grid-bg fixed inset-0 pointer-events-none"style={{opacity:.4}}/>

    {/* NAV */}
    <nav style={{position:'sticky',top:0,zIndex:20,background:'rgba(9,9,11,.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--red-border)',padding:'11px 20px'}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div className="flex items-center gap-3">
          <Link to="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
            <div style={{width:26,height:26,background:'var(--accent)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',fontSize:11}}>D</div>
          </Link>
          <div style={{width:1,height:16,background:'var(--border)'}}/>
          <div className="flex items-center gap-2">
            <div style={{position:'relative',display:'inline-flex'}}>
              <div style={{position:'absolute',inset:-3,borderRadius:'50%',background:'var(--red)',opacity:.3,animation:'pulse-r 2s ease-out infinite'}}/>
              <i className="fas fa-shield-halved"style={{color:'var(--red)',fontSize:13,position:'relative'}}/>
            </div>
            <span className="syne font-bold text-sm"style={{color:'var(--red)',letterSpacing:.5}}>ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-xs hidden md:block"style={{color:'var(--muted2)'}}>{user?.email}</span>
          <Link to="/dashboard" className="mono text-xs flex items-center gap-1.5"style={{color:'var(--muted)',textDecoration:'none'}}><i className="fas fa-arrow-left"style={{fontSize:10}}/>Dashboard</Link>
        </div>
      </div>
    </nav>

    {/* TABS */}
    <div style={{position:'sticky',top:51,zIndex:10,background:'rgba(9,9,11,.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',display:'flex'}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:7,padding:'13px 14px',fontSize:13,fontWeight:500,whiteSpace:'nowrap',cursor:'pointer',border:'none',borderBottom:`2px solid ${tab===t.id?'var(--red)':'transparent'}`,background:'none',marginBottom:-1,color:tab===t.id?'var(--red)':'var(--muted)',transition:'color .2s',fontFamily:'DM Sans'}}>
          <i className={`fas ${t.icon}`}style={{fontSize:13}}/><span className="hidden sm:inline">{t.label}</span>
        </button>)}
      </div>
    </div>

    {/* CONTENU */}
    <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 20px 96px'}}>
      {tab==='dashboard'   &&<SectionDashboard data={dashData} loading={loading}/>}
      {tab==='users'       &&<SectionUsers onToast={showToast}/>}
      {tab==='maintenance' &&<SectionMaintenance settings={settings} onSave={s=>setSettings({...settings,...s})} onToast={showToast}/>}
      {tab==='scraper'     &&<SectionScraper settings={settings} onSave={s=>setSettings({...settings,...s})} onToast={showToast}/>}
      {tab==='data'        &&<SectionData onToast={showToast}/>}
    </div>

    {toast&&<div className="au mono text-xs fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap shadow-2xl"style={{background:'var(--surface)',border:`1px solid ${toast.ok?'var(--green-border)':'var(--red-border)'}`,color:toast.ok?'var(--green)':'var(--red)'}}><i className={`fas ${toast.ok?'fa-check':'fa-xmark'}`}/>{toast.msg}</div>}
  </div>
}
