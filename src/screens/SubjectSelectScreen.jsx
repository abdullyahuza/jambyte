import React, { useEffect, useState } from 'react'

const SUBJECT_COLORS = {
  'English Language': '#8e44ad',
  'Mathematics': '#2980b9',
  'Physics': '#16a085',
  'Chemistry': '#e67e22',
  'Biology': '#27ae60',
  'Economics': '#c0392b',
  'Government': '#2c3e50',
  'Literature': '#d35400',
  'Commerce': '#16a085',
  'Accounting': '#c0392b',
  'Geography': '#2980b9',
}

function isEnglish(s) {
  return s.toLowerCase().includes('english')
}

export default function SubjectSelectScreen({ navigate, mode }) {
  const [subjects, setSubjects] = useState([])
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')

  const isMock = mode === 'mock'

  useEffect(() => {
    window.electronAPI.getSubjects().then(rows => {
      const list = rows.map(r => r.subject)
      setSubjects(list)
      // Auto-select English for mock
      if (isMock) {
        const eng = list.find(isEnglish)
        if (eng) setSelected([eng])
      }
    })
  }, [])

  const toggle = (subject) => {
    setError('')
    if (isMock) {
      // English is always locked in for mock
      if (isEnglish(subject)) return
      setSelected(prev => {
        if (prev.includes(subject)) return prev.filter(s => s !== subject)
        if (prev.filter(s => !isEnglish(s)).length >= 3) {
          setError('You can only select 3 subjects in addition to English Language.')
          return prev
        }
        return [...prev, subject]
      })
    } else {
      // Practice: only 1 subject
      setSelected(prev => prev.includes(subject) ? [] : [subject])
    }
  }

  const startMock = async () => {
    const engSelected = selected.some(isEnglish)
    if (!engSelected) { setError('English Language is required for Mock Exam.'); return }
    if (selected.length < 2) { setError('Select at least 2 subjects (English + 1 other).'); return }
    if (selected.length > 4) { setError('Maximum 4 subjects allowed.'); return }
    const questions = await window.electronAPI.getAllExamQuestions(selected)
    navigate('exam', { questions, subjects: selected, mode: 'mock' })
  }

  const startPractice = async (subject) => {
    const questions = await window.electronAPI.getQuestions({ subject, limit: 40 })
    navigate('exam', { questions, subjects: [subject], mode: 'practice' })
  }

  // Calculate expected question count
  const mockQCount = selected.reduce((n, s) => n + (isEnglish(s) ? 60 : 40), 0)
  const nonEnglishSelected = selected.filter(s => !isEnglish(s)).length

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => navigate('home')}>← Back</button>
        <h1 style={styles.title}>{isMock ? 'Mock Exam — Select Subjects' : 'Practice Mode — Select Subject'}</h1>
        <div />
      </div>

      {isMock ? (
        <div style={styles.hint}>
          English Language is <strong>mandatory</strong>. Select <strong>3 more subjects</strong> to complete your 4-subject JAMB exam (180 questions, 120 minutes).
          {error && <span style={styles.hintError}> ⚠ {error}</span>}
        </div>
      ) : (
        <div style={{ ...styles.hint, background: '#e8f5e9', color: '#2e7d32', borderColor: '#a5d6a7' }}>
          Select <strong>one subject</strong> to practice. You'll get 40 questions with a 30-minute timer.
          {error && <span style={styles.hintError}> ⚠ {error}</span>}
        </div>
      )}

      <div style={styles.grid}>
        {subjects.map(subject => {
          const isEng = isEnglish(subject)
          const isSel = selected.includes(subject)
          const isLocked = isMock && isEng // English locked in mock
          const color = SUBJECT_COLORS[subject] || '#006633'

          return (
            <div
              key={subject}
              style={{
                ...styles.subjectCard,
                borderColor: isSel ? color : '#ddd',
                background: isSel ? color + '18' : '#fff',
                opacity: isLocked ? 0.85 : 1,
                cursor: isLocked ? 'default' : 'pointer',
              }}
              onClick={() => !isLocked && toggle(subject)}
            >
              <div style={{ ...styles.subjectDot, background: color }} />
              <span style={styles.subjectName}>{subject}</span>
              {isLocked && <span style={styles.lockBadge}>Required</span>}
              {isSel && !isLocked && <span style={styles.check}>✓</span>}
              {!isMock && (
                <button
                  style={styles.practiceBtn}
                  onClick={e => { e.stopPropagation(); startPractice(subject) }}
                >
                  Start
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isMock && (
        <div style={styles.footer}>
          <div style={styles.footerInfo}>
            <span style={styles.selectedCount}>
              {selected.length}/4 subjects · {mockQCount} questions · 120 min
            </span>
            <span style={{ ...styles.progress, color: nonEnglishSelected === 3 ? '#006633' : '#888' }}>
              English ✓ · {nonEnglishSelected}/3 other subjects
            </span>
          </div>
          <button
            style={{ ...styles.startBtn, opacity: selected.length >= 2 ? 1 : 0.4 }}
            disabled={selected.length < 2}
            onClick={startMock}
          >
            Start Mock Exam →
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f2f5' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', background: '#006633', color: '#fff',
  },
  backBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none' },
  title: { fontSize: '18px', fontWeight: '700' },
  hint: {
    padding: '12px 24px', background: '#fff3cd', color: '#856404',
    fontSize: '13px', borderBottom: '1px solid #ffc107', lineHeight: '1.5',
  },
  hintError: { color: '#cc0000', fontWeight: '700' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '20px 24px', flex: 1, overflowY: 'auto', alignContent: 'flex-start' },
  subjectCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 18px', background: '#fff', borderRadius: '10px',
    border: '2px solid #ddd', minWidth: '200px', flex: '1 1 180px', maxWidth: '260px',
    transition: 'all 0.15s',
  },
  subjectDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  subjectName: { fontWeight: '600', flex: 1, fontSize: '14px' },
  check: { color: '#006633', fontWeight: '900', fontSize: '18px' },
  lockBadge: { background: '#8e44ad', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' },
  practiceBtn: { background: '#006633', color: '#fff', padding: '5px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', background: '#fff', borderTop: '1px solid #ddd',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
  },
  footerInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  selectedCount: { fontSize: '14px', fontWeight: '700', color: '#333' },
  progress: { fontSize: '12px' },
  startBtn: {
    background: '#006633', color: '#fff', padding: '12px 32px',
    borderRadius: '8px', fontWeight: '700', fontSize: '15px', border: 'none', cursor: 'pointer',
  },
}
