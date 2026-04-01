import React, { useState } from 'react'

// When fromLicense=true: after login, show inline license generator so admin
// can generate + activate a code without needing the full admin dashboard.
export default function AdminLoginScreen({ onSuccess, onCancel, onActivated, fromLicense }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  // License generator state (used when fromLicense=true)
  const [expiryDate, setExpiryDate] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [genError, setGenError] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState('')

  const login = async () => {
    if (!username || !password) { setError('Enter username and password.'); return }
    setLoading(true); setError('')
    const result = await window.electronAPI.adminLogin({ username, password })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (fromLicense) {
      setLoggedIn(true)
      // Default expiry = 7 days
      const d = new Date(); d.setDate(d.getDate() + 7)
      setExpiryDate(d.toISOString().split('T')[0])
    } else {
      onSuccess()
    }
  }

  const generate = async () => {
    setGenError(''); setGeneratedCode(''); setActivateError('')
    const res = await window.electronAPI.generateLicense(expiryDate)
    if (res.error) { setGenError(res.error); return }
    setGeneratedCode(res.code)
  }

  const activateAndContinue = async () => {
    setActivating(true); setActivateError('')
    const res = await window.electronAPI.activateLicense(generatedCode)
    setActivating(false)
    if (res.error) { setActivateError(res.error); return }
    onActivated({ expiry: res.expiry, daysLeft: res.daysLeft })
  }

  // ── Login form ────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div style={fromLicense ? s.fullPage : s.overlay}>
        <div style={s.card}>
          <h2 style={s.title}>Admin Login</h2>
          <p style={s.desc}>Enter administrator credentials to continue.</p>
          <input
            style={s.input}
            placeholder="Username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            autoFocus
            spellCheck={false}
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {error && <div style={s.error}>{error}</div>}
          <div style={s.actions}>
            <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
            <button style={s.loginBtn} onClick={login} disabled={loading}>
              {loading ? 'Checking…' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── License generator (shown after admin login from license screen) ────────
  return (
    <div style={s.fullPage}>
      <div style={{ ...s.card, width: '480px' }}>
        <h2 style={s.title}>Generate Activation Code</h2>
        <p style={s.desc}>Pick an expiry date, generate a code, then activate this device.</p>

        <label style={s.label}>Expiry Date</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="date"
            style={{ ...s.input, marginBottom: 0, flex: 1 }}
            value={expiryDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => { setExpiryDate(e.target.value); setGeneratedCode(''); setGenError('') }}
          />
          <button style={s.loginBtn} onClick={generate}>Generate</button>
        </div>
        {genError && <div style={s.error}>{genError}</div>}

        {generatedCode && (
          <div style={s.codeBox}>
            <div style={s.codeLabel}>Activation Code</div>
            <div style={s.code}>{generatedCode}</div>
            <div style={s.codeNote}>Valid until {expiryDate}</div>
            {activateError && <div style={{ ...s.error, marginTop: '8px' }}>{activateError}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={s.cancelBtn} onClick={() => navigator.clipboard.writeText(generatedCode)}>
                Copy Code
              </button>
              <button style={s.loginBtn} onClick={activateAndContinue} disabled={activating}>
                {activating ? 'Activating…' : 'Activate This Device'}
              </button>
            </div>
          </div>
        )}

        <button style={{ ...s.cancelBtn, marginTop: '16px', width: '100%' }} onClick={onCancel}>
          Back
        </button>
      </div>
    </div>
  )
}

const s = {
  fullPage: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'linear-gradient(135deg, #006633 0%, #004422 100%)',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
  card: {
    background: '#fff', borderRadius: '14px', padding: '36px',
    width: '360px', maxWidth: '92vw', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  title: { fontSize: '20px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px', textAlign: 'center' },
  desc: { fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '8px' },
  input: {
    display: 'block', width: '100%', padding: '11px 14px', fontSize: '14px',
    border: '1.5px solid #ddd', borderRadius: '7px', marginBottom: '12px',
    outline: 'none', boxSizing: 'border-box',
  },
  error: {
    background: '#ffeaea', border: '1px solid #ffaaaa', borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px', color: '#cc0000', marginBottom: '12px',
  },
  actions: { display: 'flex', gap: '10px', marginTop: '4px' },
  cancelBtn: {
    flex: 1, padding: '11px', background: '#f0f0f0', color: '#333',
    border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
  },
  loginBtn: {
    flex: 2, padding: '11px', background: '#006633', color: '#fff',
    border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
  },
  codeBox: {
    background: '#f0fff4', border: '2px solid #006633', borderRadius: '10px',
    padding: '18px', textAlign: 'center',
  },
  codeLabel: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  code: { fontSize: '26px', fontWeight: '900', letterSpacing: '4px', color: '#006633', fontFamily: 'monospace', marginBottom: '6px' },
  codeNote: { fontSize: '12px', color: '#555' },
}
