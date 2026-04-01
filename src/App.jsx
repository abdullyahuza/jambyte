import React, { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen.jsx'
import SubjectSelectScreen from './screens/SubjectSelectScreen.jsx'
import ExamScreen from './screens/ExamScreen.jsx'
import ResultScreen from './screens/ResultScreen.jsx'
import AdminScreen from './screens/AdminScreen.jsx'
import LicenseScreen from './screens/LicenseScreen.jsx'
import AdminLoginScreen from './screens/AdminLoginScreen.jsx'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [examConfig, setExamConfig] = useState(null)
  const [examResult, setExamResult] = useState(null)
  const [selectMode, setSelectMode] = useState('mock')
  const [license, setLicense] = useState(null)       // null = checking, false = invalid, obj = valid
  const [licenseChecked, setLicenseChecked] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminAuthed, setAdminAuthed] = useState(false)

  useEffect(() => {
    window.electronAPI.checkLicense().then(result => {
      setLicense(result.valid ? result : false)
      setLicenseChecked(true)
    })
  }, [])

  const navigate = (to, data) => {
    if (to === 'admin') {
      if (!adminAuthed) { setShowAdminLogin(true); return }
    }
    setScreen(to)
    if (data) {
      if (to === 'select') setSelectMode(data.mode || 'mock')
      if (to === 'exam') setExamConfig(data)
      if (to === 'result') setExamResult(data)
    }
  }

  // Still checking
  if (!licenseChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#006633', color: '#fff', fontSize: '16px' }}>
        Loading…
      </div>
    )
  }

  // No valid license
  if (!license) {
    return <LicenseScreen onActivated={info => setLicense({ valid: true, ...info })} />
  }

  return (
    <div className="app">
      {showAdminLogin && (
        <AdminLoginScreen
          onSuccess={() => { setAdminAuthed(true); setShowAdminLogin(false); setScreen('admin') }}
          onCancel={() => setShowAdminLogin(false)}
        />
      )}
      {!showAdminLogin && screen === 'home' && <HomeScreen navigate={navigate} license={license} />}
      {!showAdminLogin && screen === 'select' && <SubjectSelectScreen navigate={navigate} mode={selectMode} />}
      {!showAdminLogin && screen === 'exam' && <ExamScreen config={examConfig} navigate={navigate} />}
      {!showAdminLogin && screen === 'result' && <ResultScreen result={examResult} navigate={navigate} />}
      {!showAdminLogin && screen === 'admin' && adminAuthed && (
        <AdminScreen navigate={navigate} onLogout={() => { setAdminAuthed(false); setScreen('home') }} />
      )}
    </div>
  )
}
