import React, { useState } from 'react'
import AdminLoginScreen from './AdminLoginScreen.jsx'

export default function LicenseScreen({ onActivated }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const activate = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Please enter an activation code.'); return }
    setLoading(true); setError('')
    const result = await window.electronAPI.activateLicense(trimmed)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    onActivated({ expiry: result.expiry, daysLeft: result.daysLeft })
  }

  if (showAdminLogin) {
    return (
      <AdminLoginScreen
        onSuccess={() => setShowAdminLogin(false)}
        onCancel={() => setShowAdminLogin(false)}
        onActivated={onActivated}
        fromLicense
      />
    )
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoJ}>J</span>
          <span style={s.logoText}>JAMB CBT</span>
        </div>
        <div style={s.lockIcon}>🔒</div>
        <h2 style={s.title}>App Activation Required</h2>
        <p style={s.desc}>
          This app requires a valid activation code. Contact your administrator to obtain a code.
        </p>
        <input
          style={s.input}
          placeholder="Enter activation code (e.g. 1ZQR-A3F2B7)"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && activate()}
          autoFocus
          spellCheck={false}
        />
        {error && <div style={s.error}>{error}</div>}
        <button style={s.btn} onClick={activate} disabled={loading}>
          {loading ? 'Validating…' : 'Activate'}
        </button>
        <button style={s.adminLink} onClick={() => setShowAdminLogin(true)}>
          Admin login
        </button>
        <div style={s.copyright}>© {new Date().getFullYear()} Logicyte Technologies</div>
      </div>
    </div>
  )
}

const s = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'linear-gradient(135deg, #006633 0%, #004422 100%)',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '48px 40px',
    width: '420px', maxWidth: '90vw', textAlign: 'center',
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
  },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' },
  logoJ: { fontSize: '36px', fontWeight: '900', color: '#FFD700', background: '#006633', width: '50px', height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '22px', fontWeight: '800', color: '#006633' },
  lockIcon: { fontSize: '40px', marginBottom: '12px' },
  title: { fontSize: '20px', fontWeight: '800', color: '#1a1a1a', marginBottom: '10px' },
  desc: { fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '28px' },
  input: {
    width: '100%', padding: '12px 16px', fontSize: '16px', letterSpacing: '2px',
    border: '2px solid #ddd', borderRadius: '8px', outline: 'none', marginBottom: '12px',
    textAlign: 'center', fontFamily: 'monospace', boxSizing: 'border-box',
  },
  error: {
    background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px', color: '#856404', marginBottom: '12px',
  },
  btn: {
    width: '100%', padding: '14px', background: '#006633', color: '#fff',
    fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '8px',
    cursor: 'pointer', marginBottom: '12px',
  },
  adminLink: {
    background: 'none', border: 'none', color: '#aaa', fontSize: '12px',
    cursor: 'pointer', marginBottom: '20px', textDecoration: 'underline',
  },
  copyright: { fontSize: '11px', color: '#aaa' },
}
