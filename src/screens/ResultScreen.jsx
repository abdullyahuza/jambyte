import React from 'react'

export default function ResultScreen({ result, navigate }) {
  const { questions, answers, subjectScores, totalScore, totalQuestions } = result
  const percentage = Math.round((totalScore / totalQuestions) * 100)
  const [reviewSubject, setReviewSubject] = React.useState(null)

  const grade = percentage >= 70 ? 'Excellent' : percentage >= 50 ? 'Good' : percentage >= 40 ? 'Average' : 'Below Average'
  const gradeColor = percentage >= 70 ? '#006633' : percentage >= 50 ? '#2980b9' : percentage >= 40 ? '#e67e22' : '#cc0000'

  const reviewQuestions = reviewSubject
    ? questions.filter(q => q.subject === reviewSubject)
    : []

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => navigate('home')}>← Home</button>
        <h1 style={styles.title}>Exam Results</h1>
        <button style={styles.retryBtn} onClick={() => navigate('select')}>Retry</button>
      </div>

      <div style={styles.body}>
        {/* Score summary */}
        <div style={styles.scoreCard}>
          <div style={styles.scoreCircle}>
            <span style={{ ...styles.scoreNum, color: gradeColor }}>{percentage}%</span>
            <span style={styles.scoreLabel}>Overall</span>
          </div>
          <div style={styles.scoreMeta}>
            <div style={styles.gradeTag(gradeColor)}>{grade}</div>
            <p style={styles.scoreDetail}>{totalScore} correct out of {totalQuestions} questions</p>
          </div>
        </div>

        {/* Per subject breakdown */}
        <div style={styles.breakdown}>
          <h3 style={styles.sectionTitle}>Subject Breakdown</h3>
          {Object.entries(subjectScores).map(([subject, data]) => {
            const pct = Math.round(data.score / data.total * 100)
            return (
              <div key={subject} style={styles.subjectRow}>
                <div style={styles.subjectInfo}>
                  <span style={styles.subjectName}>{subject}</span>
                  <span style={styles.subjectScore}>{data.score}/{data.total}</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${pct}%`, background: pct >= 50 ? '#006633' : '#cc0000' }} />
                </div>
                <span style={styles.pct(pct)}>{pct}%</span>
                <button
                  style={styles.reviewBtn}
                  onClick={() => setReviewSubject(reviewSubject === subject ? null : subject)}
                >
                  {reviewSubject === subject ? 'Hide' : 'Review'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Review panel */}
        {reviewSubject && (
          <div style={styles.reviewPanel}>
            <h3 style={styles.sectionTitle}>Review: {reviewSubject}</h3>
            {reviewQuestions.map((q, i) => {
              const userAns = answers[q.id]
              const correct = userAns === q.answer
              return (
                <div key={q.id} style={{ ...styles.reviewItem, borderLeft: `4px solid ${correct ? '#006633' : '#cc0000'}` }}>
                  <p style={styles.reviewQ}><strong>Q{i + 1}.</strong> {q.question}</p>
                  <div style={styles.reviewOptions}>
                    {q.options.map(opt => (
                      <div key={opt} style={{
                        ...styles.reviewOpt,
                        background: opt === q.answer ? '#d4edda' : opt === userAns && !correct ? '#f8d7da' : 'transparent',
                        fontWeight: opt === q.answer ? '700' : '400',
                      }}>
                        {opt === q.answer ? '✓ ' : opt === userAns && !correct ? '✗ ' : '   '}
                        {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p style={styles.explanation}>💡 {q.explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f2f5' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', background: '#006633', color: '#fff',
  },
  backBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' },
  retryBtn: { background: '#FFD700', color: '#000', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', border: 'none', cursor: 'pointer' },
  title: { fontSize: '20px', fontWeight: '700' },
  body: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  scoreCard: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    display: 'flex', alignItems: 'center', gap: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  scoreCircle: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', width: '100px', height: '100px',
    borderRadius: '50%', border: '4px solid #e0e0e0',
  },
  scoreNum: { fontSize: '28px', fontWeight: '900' },
  scoreLabel: { fontSize: '12px', color: '#999' },
  scoreMeta: { display: 'flex', flexDirection: 'column', gap: '8px' },
  gradeTag: (color) => ({
    display: 'inline-block', background: color, color: '#fff',
    padding: '4px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px', width: 'fit-content',
  }),
  scoreDetail: { color: '#555', fontSize: '14px' },
  breakdown: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#006633' },
  subjectRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  subjectInfo: { display: 'flex', flexDirection: 'column', width: '160px' },
  subjectName: { fontWeight: '600', fontSize: '14px' },
  subjectScore: { fontSize: '12px', color: '#666' },
  barTrack: { flex: 1, height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  pct: (p) => ({ width: '40px', fontSize: '13px', fontWeight: '700', color: p >= 50 ? '#006633' : '#cc0000', textAlign: 'right' }),
  reviewBtn: { background: '#006633', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' },
  reviewPanel: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  reviewItem: { padding: '14px', marginBottom: '12px', background: '#f8f9fa', borderRadius: '6px' },
  reviewQ: { fontSize: '14px', marginBottom: '10px', lineHeight: '1.5' },
  reviewOptions: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' },
  reviewOpt: { fontSize: '13px', padding: '4px 8px', borderRadius: '4px' },
  explanation: { fontSize: '13px', color: '#555', background: '#fff9c4', padding: '8px 12px', borderRadius: '4px', marginTop: '8px' },
}
