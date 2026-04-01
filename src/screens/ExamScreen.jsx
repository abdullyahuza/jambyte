import React, { useState, useEffect, useCallback, useRef } from 'react'
import Timer from '../components/Timer.jsx'
import QuestionPanel from '../components/QuestionPanel.jsx'

const OPTION_KEYS = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' }

// ── End Exam Confirmation Modal ───────────────────────────────────────────────
function EndExamModal({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered
  return (
    <div style={m.overlay}>
      <div style={m.box}>
        <h2 style={m.title}>End Exam?</h2>
        <div style={m.stats}>
          <div style={m.statItem}>
            <span style={{ ...m.statNum, color: '#006633' }}>{answered}</span>
            <span style={m.statLabel}>Answered</span>
          </div>
          <div style={m.statItem}>
            <span style={{ ...m.statNum, color: unanswered > 0 ? '#cc0000' : '#006633' }}>{unanswered}</span>
            <span style={m.statLabel}>Unanswered</span>
          </div>
          <div style={m.statItem}>
            <span style={m.statNum}>{total}</span>
            <span style={m.statLabel}>Total</span>
          </div>
        </div>
        {unanswered > 0 && (
          <p style={m.warning}>
            ⚠ You have <strong>{unanswered}</strong> unanswered question{unanswered !== 1 ? 's' : ''}. Unanswered questions score zero.
          </p>
        )}
        <p style={m.confirm}>Are you sure you want to submit and end the exam?</p>
        <div style={m.actions}>
          <button style={m.cancelBtn} onClick={onCancel}>Continue Exam</button>
          <button style={m.confirmBtn} onClick={onConfirm}>Yes, Submit</button>
        </div>
      </div>
    </div>
  )
}

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box: { background: '#fff', borderRadius: '14px', padding: '32px', width: '400px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', textAlign: 'center' },
  title: { fontSize: '22px', fontWeight: '800', color: '#1a1a1a', marginBottom: '24px' },
  stats: { display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '20px' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statNum: { fontSize: '36px', fontWeight: '900', color: '#333' },
  statLabel: { fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  warning: { background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#856404', marginBottom: '16px' },
  confirm: { fontSize: '15px', color: '#444', marginBottom: '24px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  cancelBtn: { background: '#f0f0f0', color: '#333', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  confirmBtn: { background: '#cc0000', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
}

// ── Main Exam Screen ──────────────────────────────────────────────────────────
export default function ExamScreen({ config, navigate }) {
  const { questions, subjects, mode } = config
  const isPractice = mode === 'practice'

  // Mock: 120 min flat. Practice: 30 min.
  const totalTime = isPractice ? 30 * 60 : 120 * 60

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [showExplanation, setShowExplanation] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)

  const q = questions[current]
  const answeredCount = Object.keys(answers).length

  const handleAnswer = useCallback((questionId, option) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionId]: option }))
    setShowExplanation(false)
  }, [submitted])

  const toggleFlag = useCallback(() => {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(current) ? next.delete(current) : next.add(current)
      return next
    })
  }, [current])

  const submitExam = useCallback(async () => {
    if (submitted) return
    setSubmitted(true)
    setShowEndModal(false)

    const subjectScores = {}
    questions.forEach(q => {
      if (!subjectScores[q.subject]) subjectScores[q.subject] = { score: 0, total: 0 }
      subjectScores[q.subject].total++
      if (answers[q.id] === q.answer) subjectScores[q.subject].score++
    })
    const totalScore = Object.values(subjectScores).reduce((sum, s) => sum + s.score, 0)

    for (const [subject, data] of Object.entries(subjectScores)) {
      await window.electronAPI.saveResult({ subject, score: data.score, total: data.total })
    }

    navigate('result', { questions, answers, subjectScores, totalScore, totalQuestions: questions.length })
  }, [submitted, questions, answers, navigate])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (showEndModal) {
        if (e.key === 'Escape') setShowEndModal(false)
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'n' || key === 'arrowright') {
        if (current < questions.length - 1) { setCurrent(p => p + 1); setShowExplanation(false) }
      } else if (key === 'p' || key === 'arrowleft') {
        if (current > 0) { setCurrent(p => p - 1); setShowExplanation(false) }
      } else if (key === 's') {
        if (!submitted) setShowEndModal(true)
      } else if (key === 'f') {
        toggleFlag()
      } else if (OPTION_KEYS[key] && q) {
        handleAnswer(q.id, OPTION_KEYS[key])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, questions.length, submitted, showEndModal, q, handleAnswer, toggleFlag])

  // ── Question navigator groups ─────────────────────────────────────────────
  const bySubject = subjects.map(s => ({
    subject: s,
    questions: questions.filter(qq => qq.subject === s),
    start: questions.findIndex(qq => qq.subject === s),
  }))

  const isAnswered = answers[q?.id] !== undefined
  const isFlagged = flagged.has(current)

  return (
    <div style={styles.container}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div style={styles.examInfo}>
          <span style={styles.examTitle}>
            {isPractice ? `Practice — ${subjects[0]}` : 'JAMB Mock Examination'}
          </span>
          <span style={styles.examMeta}>Q {current + 1} / {questions.length}</span>
        </div>

        <Timer totalSeconds={totalTime} onExpire={submitExam} />

        <div style={styles.topActions}>
          <span style={styles.answeredBadge}>{answeredCount}/{questions.length} answered</span>
          <button style={styles.endBtn} onClick={() => setShowEndModal(true)}>
            ⏹ End Exam
          </button>
        </div>
      </div>

      {/* ── Question area ── */}
      <div style={styles.questionArea}>
        <QuestionPanel
          question={q}
          selected={answers[q?.id]}
          onAnswer={(opt) => handleAnswer(q.id, opt)}
          showAnswer={isPractice && isAnswered}
          showExplanation={showExplanation && isPractice}
          isFlagged={isFlagged}
          onToggleFlag={toggleFlag}
          onToggleExplanation={() => setShowExplanation(p => !p)}
          isPractice={isPractice}
        />
      </div>

      {/* ── Prev / Next bar ── */}
      <div style={styles.navBar}>
        <button
          style={{ ...styles.navArrow, opacity: current === 0 ? 0.35 : 1 }}
          onClick={() => { if (current > 0) { setCurrent(p => p - 1); setShowExplanation(false) } }}
          disabled={current === 0}
          title="Previous (P)"
        >
          ← Prev
        </button>

        <div style={styles.kbHint}>
          <kbd style={styles.kbd}>A–E</kbd> select &nbsp;
          <kbd style={styles.kbd}>N</kbd> next &nbsp;
          <kbd style={styles.kbd}>P</kbd> prev &nbsp;
          <kbd style={styles.kbd}>F</kbd> flag &nbsp;
          <kbd style={styles.kbd}>S</kbd> submit
        </div>

        <button
          style={{ ...styles.navArrow, background: '#006633', color: '#fff', opacity: current === questions.length - 1 ? 0.35 : 1 }}
          onClick={() => { if (current < questions.length - 1) { setCurrent(p => p + 1); setShowExplanation(false) } }}
          disabled={current === questions.length - 1}
          title="Next (N)"
        >
          Next →
        </button>
      </div>

      {/* ── Question navigator (bottom) ── */}
      <div style={styles.navigator}>
        {bySubject.map(({ subject, questions: sq, start }) => (
          <div key={subject} style={styles.navGroup}>
            <div style={styles.navGroupLabel}>{subject}</div>
            <div style={styles.navGrid}>
              {sq.map((qq, i) => {
                const idx = start + i
                const isAns = answers[qq.id] !== undefined
                const isFlg = flagged.has(idx)
                const isCur = idx === current
                return (
                  <button
                    key={qq.id}
                    onClick={() => { setCurrent(idx); setShowExplanation(false) }}
                    style={{
                      ...styles.navBtn,
                      background: isCur ? '#FFD700' : isFlg ? '#e67e22' : isAns ? '#006633' : '#e0e0e0',
                      color: isCur ? '#000' : (isAns || isFlg) ? '#fff' : '#444',
                      fontWeight: isCur ? '800' : '400',
                      outline: isCur ? '2px solid #cc9900' : 'none',
                    }}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={styles.legend}>
          {[['#006633', 'Answered'], ['#e67e22', 'Flagged'], ['#e0e0e0', 'Not answered'], ['#FFD700', 'Current']].map(([bg, label]) => (
            <span key={label} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: bg }} />{label}
            </span>
          ))}
        </div>
      </div>

      {/* ── End Exam Modal ── */}
      {showEndModal && (
        <EndExamModal
          answered={answeredCount}
          total={questions.length}
          onConfirm={submitExam}
          onCancel={() => setShowEndModal(false)}
        />
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f2f5', overflow: 'hidden' },

  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', background: '#006633', color: '#fff', gap: '16px', flexShrink: 0,
  },
  examInfo: { display: 'flex', flexDirection: 'column' },
  examTitle: { fontWeight: '700', fontSize: '15px' },
  examMeta: { fontSize: '12px', opacity: 0.8 },
  topActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  answeredBadge: { background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '13px' },
  endBtn: {
    background: '#cc0000', color: '#fff', fontWeight: '700',
    padding: '8px 18px', borderRadius: '6px', fontSize: '13px', border: 'none', cursor: 'pointer',
  },

  questionArea: { flex: 1, overflowY: 'auto', minHeight: 0 },

  navBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 20px', background: '#fff', borderTop: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0', flexShrink: 0,
  },
  navArrow: {
    background: '#f0f0f0', color: '#333', padding: '8px 20px',
    borderRadius: '6px', fontWeight: '600', border: 'none', cursor: 'pointer', fontSize: '14px',
  },
  kbHint: { fontSize: '11px', color: '#999', display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' },
  kbd: { background: '#eee', border: '1px solid #ccc', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontFamily: 'monospace', color: '#555' },

  navigator: {
    background: '#fff', borderTop: '1px solid #ddd', padding: '10px 16px',
    flexShrink: 0, maxHeight: '180px', overflowY: 'auto',
    display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start',
  },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' },
  navGroupLabel: {
    fontSize: '10px', fontWeight: '700', color: '#006633',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  navGrid: { display: 'flex', flexWrap: 'wrap', gap: '3px' },
  navBtn: {
    width: '26px', height: '26px', borderRadius: '4px',
    border: 'none', fontSize: '10px', cursor: 'pointer', transition: 'all 0.1s',
  },
  legend: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto', paddingLeft: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', whiteSpace: 'nowrap' },
  legendDot: { width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block', flexShrink: 0 },
}
