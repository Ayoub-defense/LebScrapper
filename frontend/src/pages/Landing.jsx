import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef(null)

  useEffect(() => {
    const handleMouse = e => setMousePos({ x: e.clientX, y: e.clientY })
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('scroll', handleScroll)
    return () => { window.removeEventListener('mousemove', handleMouse); window.removeEventListener('scroll', handleScroll) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050507', color: '#fff', overflowX: 'hidden', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,500,400&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
        :root {
          --lbc: #FF6B00;
          --vinted: #09B1BA;
          --accent: #E8FF47;
          --surface: rgba(255,255,255,.04);
          --border: rgba(255,255,255,.07);
        }
        body { background: #050507 }
        ::selection { background: var(--accent); color: #050507 }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1) }

        @keyframes float-up {
          from { opacity: 0; transform: translateY(30px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes fade-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes scan {
          0%   { transform: translateX(-100%) }
          100% { transform: translateX(400%) }
        }
        @keyframes blink-dot {
          0%, 49% { opacity: 1 }
          50%, 100% { opacity: 0 }
        }
        @keyframes ticker {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: .6 }
          100% { transform: scale(2.2); opacity: 0 }
        }
        @keyframes number-count {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }

        .au1 { animation: float-up .8s cubic-bezier(.2,.8,.3,1) both }
        .au2 { animation: float-up .8s .1s cubic-bezier(.2,.8,.3,1) both }
        .au3 { animation: float-up .8s .2s cubic-bezier(.2,.8,.3,1) both }
        .au4 { animation: float-up .8s .3s cubic-bezier(.2,.8,.3,1) both }
        .au5 { animation: float-up .8s .4s cubic-bezier(.2,.8,.3,1) both }
        .fade { animation: fade-in 1s .5s both }

        .nav-link {
          color: rgba(255,255,255,.5);
          font-size: 13px;
          text-decoration: none;
          transition: color .2s;
          padding: 8px 14px;
          border-radius: 10px;
        }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,.06) }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #050507;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 26px;
          border-radius: 14px;
          text-decoration: none;
          transition: transform .15s, box-shadow .2s;
          box-shadow: 0 0 40px rgba(232,255,71,.2);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(232,255,71,.35);
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          color: rgba(255,255,255,.7);
          font-weight: 500;
          font-size: 14px;
          padding: 13px 26px;
          border-radius: 14px;
          text-decoration: none;
          transition: all .2s;
        }
        .btn-secondary:hover { background: rgba(255,255,255,.1); color: #fff }

        .feature-card {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 20px;
          padding: 28px;
          transition: border-color .2s, transform .2s;
          position: relative;
          overflow: hidden;
        }
        .feature-card:hover {
          border-color: rgba(255,255,255,.14);
          transform: translateY(-3px);
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
        }

        .platform-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 50px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: .5px;
        }

        .ticker-wrap {
          overflow: hidden;
          white-space: nowrap;
          border-top: 1px solid rgba(255,255,255,.06);
          border-bottom: 1px solid rgba(255,255,255,.06);
          padding: 12px 0;
        }
        .ticker-inner {
          display: inline-flex;
          gap: 0;
          animation: ticker 25s linear infinite;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 32px;
          font-size: 12px;
          color: rgba(255,255,255,.25);
          font-family: 'JetBrains Mono', monospace;
        }
        .ticker-item .score { color: var(--accent); font-weight: 700 }

        .mockup-card {
          background: #111115;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          padding: 14px;
          position: relative;
          overflow: hidden;
        }
        .mockup-card::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.03), transparent);
          animation: scan 3s ease-in-out infinite;
        }

        .stat-number {
          font-family: 'Instrument Serif', serif;
          font-size: 56px;
          line-height: 1;
          color: var(--accent);
          animation: number-count .6s ease both;
        }

        .glow-orb {
          position: fixed;
          pointer-events: none;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,255,71,.04) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          transition: left .1s, top .1s;
          z-index: 0;
        }

        section { position: relative; z-index: 1 }
      `}</style>

      {/* Mouse glow */}
      <div className="glow-orb" style={{ left: mousePos.x, top: mousePos.y }} />

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,5,7,.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,.05)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#050507', fontSize: 14, fontFamily: 'Cabinet Grotesk'
          }}>D</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            DealHunter <span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: '#10b981', opacity: .3, animation: 'pulse-ring 2s ease-out infinite' }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'block' }} />
            </span>
            <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>EN LIGNE</span>
          </div>
          <Link to="/login" className="nav-link">Connexion</Link>
          <Link to="/register" className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>Démarrer →</Link>
        </div>
      </nav>

      {/* TICKER */}
      <div className="ticker-wrap fade">
        <div className="ticker-inner">
          {[...Array(2)].map((_, ri) => (
            <React.Fragment key={ri}>
              {[
                { label: 'iPhone 15 Pro — 750€', score: '9.2', plat: 'LBC' },
                { label: 'MacBook Air M2 — 820€', score: '8.7', plat: 'LBC' },
                { label: 'AirPods Pro 2 — 140€', score: '8.1', plat: 'VTD' },
                { label: 'PS5 + 2 manettes — 320€', score: '9.5', plat: 'LBC' },
                { label: 'SSD 2To Samsung — 55€', score: '7.8', plat: 'VTD' },
                { label: 'iPad Air M1 — 390€', score: '8.4', plat: 'LBC' },
                { label: 'Switch OLED — 195€', score: '8.9', plat: 'VTD' },
                { label: 'Sony WH-1000XM5 — 165€', score: '8.3', plat: 'LBC' },
              ].map((item, i) => (
                <span key={i} className="ticker-item">
                  <span style={{ color: item.plat === 'VTD' ? 'var(--vinted)' : 'var(--lbc)', fontSize: 9 }}>●</span>
                  {item.label}
                  <span className="score">⭐ {item.score}</span>
                  <span style={{ opacity: .3 }}>·</span>
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section ref={heroRef} style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div className="au1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <span className="platform-pill" style={{ background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.2)', color: 'var(--lbc)' }}>
            🏷 Leboncoin
          </span>
          <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 12 }}>+</span>
          <span className="platform-pill" style={{ background: 'rgba(9,177,186,.1)', border: '1px solid rgba(9,177,186,.2)', color: 'var(--vinted)' }}>
            👕 Vinted
          </span>
        </div>

        <h1 className="au2" style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 'clamp(44px, 8vw, 80px)',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-1px'
        }}>
          Les meilleures affaires,<br />
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>avant tout le monde.</span>
        </h1>

        <p className="au3" style={{
          fontSize: 17, color: 'rgba(255,255,255,.45)', maxWidth: 460,
          margin: '0 auto 36px', lineHeight: 1.7
        }}>
          Notre IA surveille Leboncoin et Vinted en continu,
          analyse chaque annonce et t'alerte quand une vraie bonne affaire apparaît.
        </p>

        <div className="au4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn-primary">
            Commencer gratuitement →
          </Link>
          <Link to="/login" className="btn-secondary">
            Déjà un compte
          </Link>
        </div>

        <div className="au5" style={{
          display: 'flex', gap: 24, justifyContent: 'center', marginTop: 48,
          flexWrap: 'wrap'
        }}>
          {[
            { n: '10 min', label: 'fréquence de scan' },
            { n: '100%', label: 'gratuit' },
            { n: '2', label: 'plateformes couvertes' },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 32, color: 'var(--accent)', lineHeight: 1
              }}>{n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MOCKUP CARDS */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {[
            { title: 'iPhone 15 128Go', price: '750€', score: 9.2, platform: 'leboncoin', analysis: 'Prix 18% sous le marché, description détaillée, vendeur avec historique.', tag: '🔥 Top affaire' },
            { title: 'AirPods Pro 2ème gen', price: '140€', score: 8.1, platform: 'vinted', analysis: 'Bon état, boîte originale incluse, prix correct pour 2026.', tag: '✓ Recommandé' },
            { title: 'MacBook Air M2', price: '820€', score: 8.7, platform: 'leboncoin', analysis: 'Sous la cote de revente, facture présente, garantie restante.', tag: '💎 Excellent' },
          ].map((card, i) => (
            <div key={i} className="mockup-card" style={{ animationDelay: `${i * .1}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{card.title}</div>
                  <span className="platform-pill" style={card.platform === 'vinted'
                    ? { background: 'rgba(9,177,186,.1)', border: '1px solid rgba(9,177,186,.2)', color: 'var(--vinted)' }
                    : { background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.2)', color: 'var(--lbc)' }}>
                    {card.platform === 'vinted' ? '👕 Vinted' : '🏷 Leboncoin'}
                  </span>
                </div>
                <div style={{
                  background: card.score >= 9 ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                  border: `1px solid ${card.score >= 9 ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}`,
                  color: card.score >= 9 ? '#10b981' : '#f59e0b',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12, fontWeight: 700,
                  padding: '4px 10px', borderRadius: 8
                }}>{card.score}<span style={{ opacity: .5 }}>/10</span></div>
              </div>
              <div style={{
                fontSize: 22, fontFamily: 'Instrument Serif, serif',
                color: card.platform === 'vinted' ? 'var(--vinted)' : 'var(--lbc)',
                marginBottom: 8
              }}>{card.price}</div>
              <div style={{
                background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)',
                borderRadius: 10, padding: 10, fontSize: 11, color: 'rgba(255,255,255,.5)',
                lineHeight: 1.5
              }}>
                <span style={{ color: '#a78bfa', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, fontWeight: 700 }}>🤖 IA — </span>
                {card.analysis}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{card.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'rgba(255,255,255,.25)', letterSpacing: 3,
            textTransform: 'uppercase', marginBottom: 12
          }}>COMMENT ÇA MARCHE</div>
          <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px,5vw,42px)', lineHeight: 1.2 }}>
            Simple comme <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>bonjour</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { icon: '⚙️', n: '01', title: 'Configure', desc: 'Mots-clés, plateforme, budget max, score minimum' },
            { icon: '🔍', n: '02', title: 'On surveille', desc: 'Scan automatique toutes les 10 minutes, 24h/24' },
            { icon: '🤖', n: '03', title: "L'IA analyse", desc: 'Score /10 basé sur le prix marché, description, vendeur' },
            { icon: '📧', n: '04', title: 'Tu reçois', desc: "Alerte email instantanée avec l'analyse complète" },
          ].map(s => (
            <div key={s.n} className="feature-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,.15)', fontWeight: 700 }}>{s.n}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="feature-card" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>ANALYSE IA</div>
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, marginBottom: 10, lineHeight: 1.3 }}>
                Llama 3 analyse chaque<br />annonce en profondeur
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.7 }}>
                Comparaison avec les prix du marché, analyse de la description, historique vendeur, 
                rapport qualité/prix — tout ça en moins d'une seconde.
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ background: '#0a0a0e', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,.2)', marginBottom: 10 }}>EXEMPLE D'ANALYSE</div>
                {[
                  { k: 'Prix marché', v: '200-280€', ok: true },
                  { k: 'Prix annonce', v: '180€', ok: true },
                  { k: 'Rapport Q/P', v: 'Excellent', ok: true },
                  { k: 'Description', v: 'Détaillée', ok: true },
                  { k: 'Score final', v: '8.7/10', accent: true },
                ].map(({ k, v, ok, accent }) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,.3)' }}>{k}</span>
                    <span style={{ color: accent ? 'var(--accent)' : ok ? '#10b981' : 'rgba(255,255,255,.5)', fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 14 }}>🏷</div>
            <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, marginBottom: 8 }}>Leboncoin</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>
              Scraping intelligent avec anti-détection. Toutes les catégories, avec ou sans filtre de prix.
            </p>
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.2)', borderRadius: 8, padding: '5px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lbc)', animation: 'blink-dot 1s step-end infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--lbc)', fontFamily: 'JetBrains Mono, monospace' }}>ACTIF</span>
            </div>
          </div>

          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 14 }}>👕</div>
            <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, marginBottom: 8 }}>Vinted</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>
              API officielle avec authentification automatique. Mode, électronique, et plus encore.
            </p>
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(9,177,186,.1)', border: '1px solid rgba(9,177,186,.2)', borderRadius: 8, padding: '5px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--vinted)', animation: 'blink-dot 1s .5s step-end infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--vinted)', fontFamily: 'JetBrains Mono, monospace' }}>ACTIF</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,255,71,.06) 0%, rgba(9,177,186,.04) 100%)',
          border: '1px solid rgba(232,255,71,.12)',
          borderRadius: 28, padding: 'clamp(32px, 5vw, 60px)',
          textAlign: 'center', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(232,255,71,.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--accent)', letterSpacing: 3, marginBottom: 16
          }}>100% GRATUIT · SANS CB</div>
          <h2 style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 'clamp(28px, 5vw, 44px)', marginBottom: 14, lineHeight: 1.2
          }}>
            Prêt à ne plus rater<br />
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>une seule bonne affaire ?</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            Crée ton compte, configure ton premier filtre, et reçois ta première alerte dans les 10 minutes.
          </p>
          <Link to="/register" className="btn-primary" style={{ fontSize: 15, padding: '15px 32px' }}>
            Créer mon compte gratuit →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,.05)',
        padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#050507', fontSize: 11 }}>D</div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>DealHunter AI</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.15)', fontFamily: 'JetBrains Mono, monospace' }}>
          Pas affilié à Leboncoin ni Vinted
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>Connexion</Link>
          <Link to="/register" style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>Inscription</Link>
        </div>
      </footer>
    </div>
  )
}
