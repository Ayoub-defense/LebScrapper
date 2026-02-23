import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        *{font-family:'DM Sans',sans-serif}
        .syne{font-family:'Syne',sans-serif}
        @keyframes au{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(251,191,36,.2)}50%{box-shadow:0 0 40px rgba(251,191,36,.4)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .au1{animation:au .7s ease both}
        .au2{animation:au .7s .12s ease both}
        .au3{animation:au .7s .24s ease both}
        .au4{animation:au .7s .36s ease both}
        .glow{animation:glow 3s ease infinite}
        .dot{animation:pulse 2s ease infinite}
        .card{transition:transform .2s,border-color .2s}
        .card:hover{transform:translateY(-3px);border-color:rgba(251,191,36,.3)!important}
        .grid-bg{background-image:linear-gradient(rgba(251,191,36,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,.04) 1px,transparent 1px);background-size:52px 52px}
      `}</style>

      <div className="fixed inset-0 grid-bg opacity-70 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/6 blur-3xl rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-5 md:px-10 py-4 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center font-bold text-zinc-950 text-sm">D</div>
          <span className="syne font-bold">DealHunter <span className="text-amber-400">AI</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-zinc-400 hover:text-white text-sm transition px-3 py-2 rounded-xl hover:bg-white/5">
            Connexion
          </Link>
          <Link to="/register" className="glow bg-amber-400 hover:bg-amber-300 text-zinc-950 px-4 py-2 rounded-xl text-sm font-bold transition">
            Démarrer →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-5 pt-16 pb-12 text-center">
        <div className="au1 inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium px-4 py-1.5 rounded-full mb-7">
          <span className="dot w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
          Surveillance Leboncoin automatique par IA
        </div>
        <h1 className="au2 syne text-4xl md:text-6xl font-extrabold leading-tight mb-5">
          Trouvez la voiture<br />
          de vos rêves<br />
          <span className="text-amber-400">avant tout le monde</span>
        </h1>
        <p className="au3 text-zinc-400 text-base md:text-lg max-w-md mx-auto mb-8 leading-relaxed">
          Notre IA surveille Leboncoin 24h/24, analyse chaque annonce et vous alerte immédiatement quand une vraie bonne affaire apparaît.
        </p>
        <div className="au4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="glow bg-amber-400 hover:bg-amber-300 text-zinc-950 px-7 py-3.5 rounded-xl font-bold transition text-sm">
            Créer mon compte gratuit →
          </Link>
          <Link to="/login" className="bg-white/5 hover:bg-white/8 border border-white/10 px-7 py-3.5 rounded-xl font-medium transition text-sm">
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 max-w-4xl mx-auto px-5 pb-20">
        <p className="text-center text-zinc-600 text-xs uppercase tracking-widest font-semibold mb-5">Comment ça marche</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '⚙️', n: '01', title: 'Configurez', desc: 'Mots-clés, ville, budget max' },
            { icon: '🔍', n: '02', title: 'On surveille', desc: 'Scan automatique 24h/24' },
            { icon: '🤖', n: '03', title: 'IA analyse', desc: 'Score sur 10 par annonce' },
            { icon: '📧', n: '04', title: 'Alerte email', desc: 'Notification instantanée' },
          ].map(s => (
            <div key={s.n} className="card bg-zinc-900/80 border border-white/6 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xl">{s.icon}</span>
                <span className="text-zinc-700 text-xs font-mono font-bold">{s.n}</span>
              </div>
              <div className="font-semibold text-sm mb-1">{s.title}</div>
              <div className="text-zinc-500 text-xs leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
