import React, { useEffect, useState } from 'react'

export default function HomeScreen({ navigate, license }) {
  const [results, setResults] = useState([])

  useEffect(() => {
    window.electronAPI.getResults().then(setResults)
  }, [])

  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') navigate('admin')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const licenseColor = license?.daysLeft <= 3 ? '#ff6b6b' : license?.daysLeft <= 7 ? '#FFD700' : '#4cff91'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>JAMB</span>
          <span style={styles.logoSub}>CBT Practice</span>
        </div>
        <p style={styles.tagline}>Prepare smarter. Score higher.</p>
        {license && (
          <span style={{ ...styles.licenseBadge, color: licenseColor }}>
            License valid · {license.daysLeft} day{license.daysLeft !== 1 ? 's' : ''} remaining
          </span>
        )}
      </div>

      <div style={styles.cards}>
        <div style={styles.card} onClick={() => navigate('select', { mode: 'mock' })}>
          <div style={styles.cardIcon}>📝</div>
          <h2 style={styles.cardTitle}>Mock Exam</h2>
          <p style={styles.cardDesc}>Full JAMB simulation — 4 subjects, 2-hour timer, real exam conditions</p>
          <button style={{ ...styles.btn, background: '#006633' }}>Start Mock Exam</button>
        </div>

        <div style={styles.card} onClick={() => navigate('select', { mode: 'practice' })}>
          <div style={styles.cardIcon}>📚</div>
          <h2 style={styles.cardTitle}>Practice Mode</h2>
          <p style={styles.cardDesc}>Drill one subject at a time, no timer, see explanations immediately</p>
          <button style={{ ...styles.btn, background: '#0066cc' }}>Start Practice</button>
        </div>
      </div>

      {results.length > 0 && (
        <div style={styles.recentSection}>
          <h3 style={styles.recentTitle}>Recent Results</h3>
          <div style={styles.resultsList}>
            {results.slice(0, 5).map(r => (
              <div key={r.id} style={styles.resultRow}>
                <span style={styles.resultSubject}>{r.subject}</span>
                <span style={styles.resultScore(r.score, r.total)}>
                  {r.score}/{r.total} ({Math.round(r.score / r.total * 100)}%)
                </span>
                <span style={styles.resultDate}>{new Date(r.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <span>JAMB CBT Practice v1.0</span>
          <span style={styles.copyright}>© {new Date().getFullYear()} Logicyte Technologies</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100vh', background: 'linear-gradient(135deg, #006633 0%, #004422 100%)',
    color: '#fff', padding: '30px 20px', overflowY: 'auto',
  },
  header: { textAlign: 'center', marginBottom: '40px' },
  logo: { display: 'flex', alignItems: 'baseline', gap: '10px', justifyContent: 'center', marginBottom: '8px' },
  logoText: { fontSize: '48px', fontWeight: '900', color: '#FFD700', letterSpacing: '4px' },
  logoSub: { fontSize: '24px', fontWeight: '600', color: '#fff' },
  tagline: { fontSize: '16px', opacity: 0.8, marginBottom: '8px' },
  licenseBadge: { fontSize: '12px', fontWeight: '600', opacity: 0.9 },
  cards: { display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px',
    padding: '30px', width: '280px', textAlign: 'center', cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.2)', transition: 'transform 0.2s',
  },
  cardIcon: { fontSize: '40px', marginBottom: '12px' },
  cardTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '10px' },
  cardDesc: { fontSize: '13px', opacity: 0.8, marginBottom: '20px', lineHeight: '1.5' },
  btn: { padding: '10px 24px', color: '#fff', fontWeight: '600', borderRadius: '6px', fontSize: '14px', border: 'none', cursor: 'pointer' },
  recentSection: { width: '100%', maxWidth: '600px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  recentTitle: { fontSize: '16px', marginBottom: '12px', color: '#FFD700' },
  resultsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '14px' },
  resultSubject: { fontWeight: '600', flex: 1 },
  resultScore: (score, total) => ({ color: score / total >= 0.5 ? '#4cff91' : '#ff6b6b', fontWeight: '700', flex: 1, textAlign: 'center' }),
  resultDate: { opacity: 0.7, flex: 1, textAlign: 'right', fontSize: '12px' },
  footer: { marginTop: 'auto', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '600px', justifyContent: 'space-between' },
  footerLeft: { display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.6 },
  copyright: { fontSize: '11px' },
}
