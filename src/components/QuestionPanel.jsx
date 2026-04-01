import React, { useState, useEffect } from 'react'

// Shown inline inside an option — auto-loads on mount
function InlineImage({ imagePath }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    window.electronAPI.getDiagram(imagePath).then(setSrc)
  }, [imagePath])
  return src ? <img src={src} alt="" style={styles.optImg} /> : null
}

// Collapsible diagram for the question body
function DiagramImage({ imagePath }) {
  const [src, setSrc] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { setSrc(null); setExpanded(false) }, [imagePath])

  const toggle = async () => {
    if (!src) {
      const data = await window.electronAPI.getDiagram(imagePath)
      setSrc(data)
    }
    setExpanded(p => !p)
  }

  return (
    <div style={styles.diagramBox}>
      <div style={styles.diagramLabel}>
        📊 This question has a diagram
        <button style={styles.expandBtn} onClick={toggle}>
          {expanded ? 'Hide diagram' : 'Show diagram'}
        </button>
      </div>
      {expanded && src && <img src={src} alt="Question diagram" style={styles.diagramImg} />}
    </div>
  )
}

export default function QuestionPanel({
  question, selected, onAnswer, showAnswer, showExplanation,
  isFlagged, onToggleFlag, onToggleExplanation, isPractice
}) {
  if (!question) return null

  // Parse option letter from stored format "A. text" or just use index
  const options = question.options.map((opt, i) => {
    const match = opt.match(/^([A-E])[.):]\s*(.+)/)
    if (match) return { letter: match[1], text: match[2] }
    const letters = ['A', 'B', 'C', 'D', 'E']
    return { letter: letters[i] || String(i + 1), text: opt }
  })

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.meta}>
          <span style={styles.subjectTag}>{question.subject}</span>
          {question.year && <span style={styles.yearTag}>{question.year}</span>}
        </div>
        <button
          style={{ ...styles.flagBtn, color: isFlagged ? '#e67e22' : '#999' }}
          onClick={onToggleFlag}
          title="Flag for review"
        >
          {isFlagged ? '🚩 Flagged' : '⚑ Flag'}
        </button>
      </div>

      <div style={styles.questionText}>
        {question.question}
      </div>

      {/* Question diagram */}
      {question.image_path && <DiagramImage imagePath={question.image_path} />}

      <div style={styles.options}>
        {options.map(({ letter, text }, i) => {
          const isSelected = selected === letter
          const isCorrect = showAnswer && letter === question.answer
          const isWrong = showAnswer && isSelected && letter !== question.answer
          const optImg = question.option_images?.[i] || null

          return (
            <button
              key={letter}
              onClick={() => onAnswer(letter)}
              style={{
                ...styles.option,
                background: isCorrect ? '#d4edda' : isWrong ? '#f8d7da' : isSelected ? '#cce5ff' : '#fff',
                borderColor: isCorrect ? '#006633' : isWrong ? '#cc0000' : isSelected ? '#0066cc' : '#ddd',
                fontWeight: isSelected || isCorrect ? '600' : '400',
                flexDirection: optImg ? 'column' : 'row',
                alignItems: optImg ? 'flex-start' : 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{
                  ...styles.optLetter,
                  background: isCorrect ? '#006633' : isWrong ? '#cc0000' : isSelected ? '#0066cc' : '#e0e0e0',
                  color: isSelected || isCorrect || isWrong ? '#fff' : '#555',
                  flexShrink: 0,
                }}>
                  {letter}
                </span>
                <span style={styles.optText}>{text}</span>
                {isCorrect && <span style={styles.tick}>✓</span>}
                {isWrong && <span style={styles.cross}>✗</span>}
              </div>
              {optImg && <InlineImage imagePath={optImg} />}
            </button>
          )
        })}
      </div>

      {isPractice && selected && (
        <button style={styles.explanationBtn} onClick={onToggleExplanation}>
          {showExplanation ? '▲ Hide Explanation' : '▼ Show Explanation'}
        </button>
      )}

      {showExplanation && question.explanation && (
        <div style={styles.explanation}>
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  meta: { display: 'flex', gap: '8px', alignItems: 'center' },
  subjectTag: {
    background: '#006633', color: '#fff',
    padding: '3px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
  },
  yearTag: {
    background: '#e0e0e0', color: '#555',
    padding: '3px 10px', borderRadius: '12px', fontSize: '12px',
  },
  flagBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', padding: '4px 8px',
  },
  questionText: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: '#1a1a1a',
    fontWeight: '500',
    padding: '16px',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  options: { display: 'flex', flexDirection: 'column', gap: '10px' },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '2px solid #ddd',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontSize: '14px',
  },
  optLetter: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '13px',
    flexShrink: 0,
  },
  optText: { flex: 1, lineHeight: '1.4' },
  optImg: { maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', marginTop: '8px', border: '1px solid #ddd', display: 'block' },
  tick: { color: '#006633', fontWeight: '900', fontSize: '16px' },
  cross: { color: '#cc0000', fontWeight: '900', fontSize: '16px' },
  explanationBtn: {
    background: '#f0f8ff', border: '1px solid #b8d4f0',
    color: '#0066cc', padding: '10px 16px', borderRadius: '6px',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px', textAlign: 'left',
  },
  explanation: {
    background: '#fff9c4',
    border: '1px solid #f0c040',
    borderRadius: '8px',
    padding: '14px 16px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#4a3800',
  },
  diagramBox: {
    background: '#f0f8ff',
    border: '1px solid #b8d4f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  diagramLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#0066cc',
    fontWeight: '600',
  },
  expandBtn: {
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  diagramImg: {
    width: '100%',
    display: 'block',
    borderTop: '1px solid #b8d4f0',
  },
}
