import React, { useState, useEffect, useCallback } from 'react'

const PAGE_SIZE = 20
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E']

const EMPTY_FORM = {
  subject: '', year: '', question: '',
  options: ['', '', '', '', ''],
  answer: '', explanation: '',
  image_path: null,
  option_images: [null, null, null, null, null],
}

// ── ImagePicker ───────────────────────────────────────────────────────────────
function ImagePicker({ value, onChange }) {
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (value) { window.electronAPI.getDiagram(value).then(setPreview) }
    else { setPreview(null) }
  }, [value])

  const handleFile = async (filePath) => {
    const name = await window.electronAPI.adminSaveImage(filePath)
    if (name) onChange(name)
  }

  const browse = async () => {
    const name = await window.electronAPI.adminPickImage()
    if (name) onChange(name)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file.path)
  }

  const remove = (e) => { e.stopPropagation(); onChange(null); setPreview(null) }

  if (preview) {
    return (
      <div style={ip.previewBox}>
        <img src={preview} alt="preview" style={ip.img} />
        <button style={ip.removeBtn} onClick={remove} title="Remove">✕</button>
      </div>
    )
  }

  return (
    <div
      style={{ ...ip.dropZone, borderColor: dragging ? '#0066cc' : '#b8d0ee', background: dragging ? '#e8f0ff' : '#f5f8ff' }}
      onClick={browse}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <span style={ip.icon}>🖼</span>
      <span style={ip.hint}>Click to browse or drag image here</span>
    </div>
  )
}

const ip = {
  dropZone: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1.5px dashed', borderRadius: '6px', cursor: 'pointer', marginTop: '4px', transition: 'all 0.15s' },
  icon: { fontSize: '16px' },
  hint: { fontSize: '12px', color: '#5580aa' },
  previewBox: { position: 'relative', display: 'inline-block', marginTop: '4px' },
  img: { height: '64px', borderRadius: '6px', border: '1px solid #ddd', display: 'block' },
  removeBtn: { position: 'absolute', top: '-6px', right: '-6px', background: '#cc0000', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

// ── Question Form Modal (Add & Edit) ─────────────────────────────────────────
function QuestionFormModal({ initial, subjects, years, onSave, onClose }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        ...initial,
        options: [...initial.options, '', '', ''].slice(0, 5),
        option_images: initial.option_images
          ? [...initial.option_images, null, null, null, null, null].slice(0, 5)
          : [null, null, null, null, null],
      }
    }
    return { ...EMPTY_FORM, options: [...EMPTY_FORM.options], option_images: [...EMPTY_FORM.option_images] }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setOpt = (i, val) => setForm(f => {
    const opts = [...f.options]; opts[i] = val; return { ...f, options: opts }
  })
  const setOptImg = (i, val) => setForm(f => {
    const imgs = [...(f.option_images || [null,null,null,null,null])]; imgs[i] = val; return { ...f, option_images: imgs }
  })

  const validate = () => {
    if (!form.subject) return 'Please select a subject.'
    if (!form.question.trim()) return 'Question text is required.'
    if (form.options.filter(o => o.trim()).length < 2) return 'At least 2 options are required.'
    if (!form.answer) return 'Please select the correct answer.'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError('')
    const cleanOptions = form.options.filter(o => o.trim())
    const payload = { ...form, options: cleanOptions, year: form.year ? parseInt(form.year) : null }
    if (isEdit) {
      await window.electronAPI.adminUpdateQuestion(payload)
      onSave(payload)
    } else {
      const { id } = await window.electronAPI.adminAddQuestion(payload)
      onSave({ ...payload, id })
    }
    setSaving(false)
  }

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal.box}>
        <div style={modal.header}>
          <span style={modal.title}>{isEdit ? `Edit Question #${initial.id}` : 'Add New Question'}</span>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={modal.body}>
          {error && <div style={modal.errorBox}>{error}</div>}

          {/* Subject + Year */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...modal.row, flex: 1 }}>
              <label style={modal.label}>Subject *</label>
              <select
                style={modal.select}
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
              >
                <option value="">— Select subject —</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ ...modal.row, width: '140px' }}>
              <label style={modal.label}>Year</label>
              <select
                style={modal.select}
                value={form.year || ''}
                onChange={e => set('year', e.target.value)}
              >
                <option value="">— Year —</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Question text */}
          <div style={modal.row}>
            <label style={modal.label}>Question *</label>
            <textarea
              style={{ ...modal.input, height: '100px', resize: 'vertical' }}
              value={form.question}
              onChange={e => set('question', e.target.value)}
              placeholder="Type the full question here..."
            />
            <ImagePicker value={form.image_path} onChange={val => set('image_path', val)} />
          </div>

          {/* Options */}
          <div style={modal.row}>
            <label style={modal.label}>Options * — click "Mark correct" on the right answer</label>
            {form.options.map((opt, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={modal.optRow}>
                  <span style={{
                    ...modal.optLetter,
                    background: form.answer === OPTION_LETTERS[i] ? '#006633' : '#e0e0e0',
                    color: form.answer === OPTION_LETTERS[i] ? '#fff' : '#555',
                  }}>{OPTION_LETTERS[i]}</span>
                  <input
                    style={{ ...modal.input, flex: 1, margin: 0 }}
                    value={opt}
                    onChange={e => setOpt(i, e.target.value)}
                    placeholder={`Option ${OPTION_LETTERS[i]}${i >= 4 ? ' (optional)' : ''}`}
                  />
                  <button
                    style={{
                      ...modal.answerBtn,
                      background: form.answer === OPTION_LETTERS[i] ? '#006633' : '#f0f0f0',
                      color: form.answer === OPTION_LETTERS[i] ? '#fff' : '#333',
                    }}
                    onClick={() => set('answer', OPTION_LETTERS[i])}
                  >
                    {form.answer === OPTION_LETTERS[i] ? '✓ Correct' : 'Mark correct'}
                  </button>
                </div>
                <div style={{ paddingLeft: '36px' }}>
                  <ImagePicker value={form.option_images?.[i] || null} onChange={val => setOptImg(i, val)} />
                </div>
              </div>
            ))}
          </div>

          {/* Answer quick-pick */}
          <div style={modal.row}>
            <label style={modal.label}>Correct Answer</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {OPTION_LETTERS.map(l => (
                <button key={l}
                  style={{ ...modal.letterBtn, background: form.answer === l ? '#006633' : '#e0e0e0', color: form.answer === l ? '#fff' : '#333' }}
                  onClick={() => set('answer', l)}
                >{l}</button>
              ))}
              {form.answer && <span style={{ fontSize: '13px', color: '#006633', fontWeight: '600', marginLeft: '8px' }}>Option {form.answer} is correct</span>}
            </div>
          </div>

          {/* Explanation */}
          <div style={modal.row}>
            <label style={modal.label}>Explanation (optional)</label>
            <textarea
              style={{ ...modal.input, height: '80px', resize: 'vertical' }}
              value={form.explanation || ''}
              onChange={e => set('explanation', e.target.value)}
              placeholder="Explain why the answer is correct..."
            />
          </div>
        </div>

        <div style={modal.footer}>
          <button style={modal.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...modal.saveBtn, background: isEdit ? '#006633' : '#0066cc', opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Question Row ─────────────────────────────────────────────────────────────
function QuestionRow({ q, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    await window.electronAPI.adminDeleteQuestion(q.id)
    onDelete(q.id)
  }

  return (
    <div style={row.container}>
      <div style={row.top}>
        <span style={row.id}>#{q.id}</span>
        <span style={row.meta}>{q.subject}{q.year ? ` · ${q.year}` : ''}</span>
        {!q.answer && <span style={row.missingBadge}>No answer</span>}
        {q.image_path && <span style={row.diagramBadge}>📊 Diagram</span>}
        <div style={row.actions}>
          <button style={row.editBtn} onClick={() => onEdit(q)}>Edit</button>
          <button
            style={{ ...row.deleteBtn, background: confirming ? '#cc0000' : '#fee', color: confirming ? '#fff' : '#cc0000' }}
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
          >
            {confirming ? 'Confirm delete?' : 'Delete'}
          </button>
        </div>
      </div>
      <p style={row.questionText}>{q.question}</p>
      <div style={row.options}>
        {q.options.map((opt, i) => {
          const isAnswer = q.answer === OPTION_LETTERS[i]
          return (
            <span key={i} style={{ ...row.opt, background: isAnswer ? '#d4edda' : '#f5f5f5', fontWeight: isAnswer ? '700' : '400', color: isAnswer ? '#006633' : '#444' }}>
              {isAnswer ? '✓ ' : ''}{opt}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Aiken Parser ─────────────────────────────────────────────────────────────
// Aiken format:
//   What is the capital of Nigeria?
//   A. Abuja
//   B. Lagos
//   C. Kano
//   D. Ibadan
//   ANSWER: A
function parseAiken(text) {
  const questions = []
  const blocks = text.trim().split(/\n\s*\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 3) continue

    const answerLine = lines.find(l => /^ANSWER\s*:\s*[A-Ea-e]$/i.test(l))
    if (!answerLine) continue

    const answer = answerLine.match(/[A-Ea-e]/)[0].toUpperCase()
    const optionLines = lines.filter(l => /^[A-Ea-e][.)]\s+.+/i.test(l))
    const questionLines = lines.filter(l =>
      !/^[A-Ea-e][.)]\s+/i.test(l) && !/^ANSWER\s*:/i.test(l)
    )

    if (questionLines.length === 0 || optionLines.length < 2) continue

    const options = optionLines.map(l => l.replace(/^[A-Ea-e][.)]\s+/, '').trim())
    questions.push({ question: questionLines.join(' '), options, answer })
  }
  return questions
}

function AikenImportTab({ allSubjects, allYears, onImportDone }) {
  const [text, setText] = useState('')
  const [subject, setSubject] = useState('')
  const [year, setYear] = useState('')
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const preview = () => {
    const qs = parseAiken(text)
    setParsed(qs)
    setResult(null)
  }

  const loadFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => { setText(e.target.result); setParsed(null); setResult(null) }
    reader.readAsText(file)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  const importAll = async () => {
    if (!parsed?.length || !subject) return
    setImporting(true)
    let saved = 0
    for (const q of parsed) {
      await window.electronAPI.adminAddQuestion({
        subject,
        year: year ? parseInt(year) : null,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: '',
        image_path: null,
        option_images: null,
      })
      saved++
    }
    setResult(saved)
    setImporting(false)
    setParsed(null)
    setText('')
    onImportDone()
  }

  return (
    <div style={ai.container}>
      <div style={ai.intro}>
        <h2 style={ai.heading}>Import Questions — Aiken Format</h2>
        <p style={ai.sub}>Paste your questions below or drop a <code>.txt</code> file. Each question must follow the Aiken format.</p>
        <div style={ai.example}>
          <strong>Format example:</strong>
          <pre style={ai.pre}>{`What is the atomic number of Carbon?\nA. 4\nB. 6\nC. 8\nD. 12\nANSWER: B`}</pre>
        </div>
      </div>

      {/* Subject + Year */}
      <div style={ai.row}>
        <div style={ai.field}>
          <label style={ai.label}>Subject *</label>
          <select style={ai.select} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">— Select subject —</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={ai.field}>
          <label style={ai.label}>Year</label>
          <select style={ai.select} value={year} onChange={e => setYear(e.target.value)}>
            <option value="">— Optional —</option>
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Drop zone + textarea */}
      <div
        style={{ ...ai.dropZone, borderColor: dragOver ? '#006633' : '#ccc', background: dragOver ? '#e8f5e9' : '#fafafa' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {dragOver
          ? <p style={ai.dropHint}>Drop the .txt file here</p>
          : <p style={ai.dropHint}>Drag & drop a .txt file here, or type/paste below</p>
        }
      </div>
      <textarea
        style={ai.textarea}
        value={text}
        onChange={e => { setText(e.target.value); setParsed(null); setResult(null) }}
        placeholder={`What is the atomic number of Carbon?\nA. 4\nB. 6\nC. 8\nD. 12\nANSWER: B\n\nNext question here...`}
        spellCheck={false}
      />

      <div style={ai.actions}>
        <button style={ai.previewBtn} onClick={preview} disabled={!text.trim()}>
          Preview questions
        </button>
        {parsed !== null && (
          <button
            style={{ ...ai.importBtn, opacity: !subject || importing ? 0.5 : 1 }}
            onClick={importAll}
            disabled={!subject || importing || parsed.length === 0}
          >
            {importing ? 'Importing...' : `Import ${parsed.length} question${parsed.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {result !== null && (
        <div style={ai.successBox}>✓ Successfully imported {result} questions into <strong>{subject}</strong>.</div>
      )}

      {/* Preview table */}
      {parsed !== null && (
        <div style={ai.previewSection}>
          <h3 style={ai.previewHeading}>
            {parsed.length === 0
              ? '⚠ No valid questions found. Check your formatting.'
              : `${parsed.length} question${parsed.length !== 1 ? 's' : ''} ready to import`}
          </h3>
          {parsed.map((q, i) => (
            <div key={i} style={ai.previewCard}>
              <p style={ai.previewQ}><strong>Q{i + 1}.</strong> {q.question}</p>
              <div style={ai.previewOpts}>
                {q.options.map((opt, j) => (
                  <span key={j} style={{
                    ...ai.previewOpt,
                    background: OPTION_LETTERS[j] === q.answer ? '#d4edda' : '#f5f5f5',
                    fontWeight: OPTION_LETTERS[j] === q.answer ? '700' : '400',
                    color: OPTION_LETTERS[j] === q.answer ? '#006633' : '#444',
                  }}>
                    {OPTION_LETTERS[j] === q.answer ? '✓ ' : ''}{OPTION_LETTERS[j]}. {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ai = {
  container: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px' },
  intro: { display: 'flex', flexDirection: 'column', gap: '6px' },
  heading: { fontSize: '18px', fontWeight: '700', color: '#006633' },
  sub: { fontSize: '13px', color: '#555' },
  example: { background: '#f8f9fa', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', border: '1px solid #e0e0e0' },
  pre: { margin: '6px 0 0', fontFamily: 'monospace', fontSize: '12px', color: '#333', whiteSpace: 'pre-wrap' },
  row: { display: 'flex', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  label: { fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { padding: '9px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff' },
  dropZone: { border: '2px dashed', borderRadius: '8px', padding: '14px', textAlign: 'center', transition: 'all 0.15s', cursor: 'default' },
  dropHint: { margin: 0, fontSize: '13px', color: '#666' },
  textarea: { width: '100%', height: '220px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  actions: { display: 'flex', gap: '12px', alignItems: 'center' },
  previewBtn: { background: '#e8f0ff', color: '#0066cc', border: '1px solid #b8d0ee', borderRadius: '6px', padding: '10px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  importBtn: { background: '#006633', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  successBox: { background: '#d4edda', border: '1px solid #a8d5b5', borderRadius: '6px', padding: '12px 16px', color: '#006633', fontWeight: '600', fontSize: '14px' },
  previewSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  previewHeading: { fontSize: '15px', fontWeight: '700', color: '#333' },
  previewCard: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px 16px' },
  previewQ: { fontSize: '14px', marginBottom: '8px', lineHeight: '1.5' },
  previewOpts: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  previewOpt: { fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
}

// ── Subjects & Years Tab ──────────────────────────────────────────────────────
function SubjectsYearsTab() {
  const [subjects, setSubjects] = useState([])
  const [years, setYears] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [newYear, setNewYear] = useState('')
  const [subjectError, setSubjectError] = useState('')
  const [yearError, setYearError] = useState('')
  const [subjectSuccess, setSubjectSuccess] = useState('')
  const [yearSuccess, setYearSuccess] = useState('')

  const load = () => {
    window.electronAPI.adminGetAllSubjects().then(setSubjects)
    window.electronAPI.adminGetAllYears().then(setYears)
  }
  useEffect(() => { load() }, [])

  const addSubject = async () => {
    setSubjectError(''); setSubjectSuccess('')
    const res = await window.electronAPI.adminAddSubject(newSubject)
    if (res?.error) { setSubjectError(res.error); return }
    setNewSubject('')
    setSubjectSuccess(`"${newSubject.trim()}" added successfully.`)
    load()
  }

  const addYear = async () => {
    setYearError(''); setYearSuccess('')
    const res = await window.electronAPI.adminAddYear(newYear)
    if (res?.error) { setYearError(res.error); return }
    setYearSuccess(`Year ${newYear} added successfully.`)
    setNewYear('')
    load()
  }

  return (
    <div style={sy.container}>
      {/* Subjects panel */}
      <div style={sy.panel}>
        <div style={sy.panelHeader}>
          <h2 style={sy.panelTitle}>Subjects</h2>
          <span style={sy.count}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={sy.addRow}>
          <input
            style={sy.input}
            value={newSubject}
            onChange={e => { setNewSubject(e.target.value); setSubjectError(''); setSubjectSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            placeholder="e.g. Economics, Government..."
          />
          <button style={sy.addBtn} onClick={addSubject} disabled={!newSubject.trim()}>Add Subject</button>
        </div>
        {subjectError   && <p style={sy.error}>{subjectError}</p>}
        {subjectSuccess && <p style={sy.success}>{subjectSuccess}</p>}

        <div style={sy.list}>
          {subjects.length === 0
            ? <p style={sy.empty}>No subjects yet. Add one above.</p>
            : subjects.map(s => (
              <div key={s} style={sy.listItem}>
                <span style={sy.itemDot} />
                <span style={sy.itemName}>{s}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Years panel */}
      <div style={sy.panel}>
        <div style={sy.panelHeader}>
          <h2 style={sy.panelTitle}>Years</h2>
          <span style={sy.count}>{years.length} year{years.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={sy.addRow}>
          <input
            style={sy.input}
            type="number"
            value={newYear}
            onChange={e => { setNewYear(e.target.value); setYearError(''); setYearSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && addYear()}
            placeholder="e.g. 2023"
            min="1990"
            max="2100"
          />
          <button style={sy.addBtn} onClick={addYear} disabled={!newYear}>Add Year</button>
        </div>
        {yearError   && <p style={sy.error}>{yearError}</p>}
        {yearSuccess && <p style={sy.success}>{yearSuccess}</p>}

        <div style={sy.list}>
          {years.length === 0
            ? <p style={sy.empty}>No years yet. Add one above.</p>
            : years.map(y => (
              <div key={y} style={sy.listItem}>
                <span style={sy.itemDot} />
                <span style={sy.itemName}>{y}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Screen ─────────────────────────────────────────────────────────
// ── License Tab ───────────────────────────────────────────────────────────────
function LicenseTab() {
  const [note, setNote] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [generatedExpiry, setGeneratedExpiry] = useState('')
  const [genError, setGenError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [currentLicense, setCurrentLicense] = useState(null)
  const [licenses, setLicenses] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [revoking, setRevoking] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.electronAPI.checkLicense().then(setCurrentLicense)
    loadLicenses()
  }, [])

  const loadLicenses = async () => {
    setLoadingList(true); setListError('')
    const res = await window.electronAPI.listLicenses()
    setLoadingList(false)
    if (res.error) { setListError(res.error); return }
    setLicenses(res.licenses || [])
  }

  const generate = async () => {
    setGenError(''); setGeneratedCode(''); setGenerating(true)
    const res = await window.electronAPI.generateLicense({ note })
    setGenerating(false)
    if (res.error) { setGenError(res.error); return }
    setGeneratedCode(res.code)
    setGeneratedExpiry(res.expiry)
    setNote('')
    loadLicenses()
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const revoke = async (activationId) => {
    setRevoking(activationId)
    await window.electronAPI.revokeActivation(activationId)
    setRevoking(null)
    loadLicenses()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>License Management</h2>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
        Each code activates one device for <strong>30 days</strong>. Generate a code and share it with the user.
      </p>

      {/* This device status */}
      {currentLicense && (
        <div style={{ background: currentLicense.valid ? '#e8f5e9' : '#fff3cd', border: `1px solid ${currentLicense.valid ? '#a5d6a7' : '#ffc107'}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: currentLicense.valid ? '#2e7d32' : '#856404' }}>
          {currentLicense.valid
            ? `✓ This device is licensed — expires ${currentLicense.expiry} · ${currentLicense.daysLeft} day${currentLicense.daysLeft !== 1 ? 's' : ''} left${currentLicense.offline ? ' (offline mode)' : ''}`
            : `⚠ This device: ${currentLicense.reason === 'expired' ? 'license expired' : currentLicense.reason === 'grace_expired' ? `offline too long (${currentLicense.daysSinceOnline}d)` : 'not activated'}`}
        </div>
      )}

      {/* Generate */}
      <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '14px' }}>Generate New 30-Day Code</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={ls.label}>Note (optional — e.g. student name or school)</label>
            <input style={{ ...ls.input, width: '100%' }} placeholder="e.g. John Doe / School ABC"
              value={note} onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()} />
          </div>
          <button style={ls.genBtn} onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : '+ Generate Code'}
          </button>
        </div>
        {genError && <div style={{ color: '#cc0000', fontSize: '12px', marginTop: '8px' }}>{genError}</div>}
      </div>

      {/* Generated code display */}
      {generatedCode && (
        <div style={{ background: '#f0fff4', border: '2px solid #006633', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>New Activation Code — Valid 30 Days</div>
          <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '5px', color: '#006633', fontFamily: 'monospace', marginBottom: '8px' }}>{generatedCode}</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Expires <strong>{generatedExpiry}</strong> · 1 device</div>
          <button style={ls.genBtn} onClick={copyCode}>{copied ? '✓ Copied!' : 'Copy Code'}</button>
        </div>
      )}

      {/* All licenses + activations */}
      <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>
            Issued Licenses <span style={{ fontWeight: '400', color: '#888', fontSize: '13px' }}>({licenses.length})</span>
          </div>
          <button style={ls.smallBtn} onClick={loadLicenses}>↻ Refresh</button>
        </div>
        {listError && <div style={{ color: '#888', fontSize: '13px', padding: '8px 0' }}>{listError}</div>}
        {loadingList && <div style={{ color: '#888', fontSize: '13px' }}>Loading…</div>}
        {!loadingList && licenses.length === 0 && !listError && (
          <div style={{ color: '#aaa', fontSize: '13px' }}>No licenses issued yet.</div>
        )}
        {licenses.map(lic => {
          const expired = new Date(lic.expiry) < new Date()
          const activated = (lic.activations || []).length > 0
          return (
            <div key={lic.code} style={{ borderRadius: '8px', border: `1px solid ${expired ? '#ffcccc' : '#e0e0e0'}`, marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: expired ? '#fff5f5' : '#f8f9fa', flexWrap: 'wrap' }}>
                <code style={{ fontWeight: '700', fontSize: '13px', letterSpacing: '2px', color: expired ? '#cc0000' : '#006633' }}>{lic.code}</code>
                <span style={{ fontSize: '12px', color: expired ? '#cc0000' : '#555' }}>{expired ? '⚠ expired' : `expires ${lic.expiry}`}</span>
                <span style={{ fontSize: '12px', color: activated ? '#006633' : '#aaa' }}>
                  {activated ? `✓ activated (${lic.activations.length} device)` : '○ not yet used'}
                </span>
                {lic.note && <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginLeft: 'auto' }}>{lic.note}</span>}
              </div>
              {(lic.activations || []).map(act => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 14px', borderTop: '1px solid #f0f0f0', fontSize: '13px' }}>
                  <span style={{ flex: 1, fontWeight: '600' }}>💻 {act.machine_name}</span>
                  <span style={{ color: '#888', fontSize: '12px' }}>activated {new Date(act.activated_at).toLocaleDateString()}</span>
                  <span style={{ color: '#aaa', fontSize: '12px' }}>last seen {new Date(act.last_seen).toLocaleDateString()}</span>
                  <button
                    style={{ padding: '3px 10px', background: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    onClick={() => revoke(act.id)} disabled={revoking === act.id}
                  >
                    {revoking === act.id ? '…' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ls = {
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' },
  input: { padding: '8px 10px', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  smallBtn: { padding: '7px 12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' },
  genBtn: { padding: '10px 22px', background: '#006633', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
}

export default function AdminScreen({ navigate, onLogout }) {
  const [stats, setStats] = useState(null)
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Registry lists (for dropdowns in modal)
  const [allSubjects, setAllSubjects] = useState([])
  const [allYears, setAllYears] = useState([])

  // Filters
  const [filterSubject, setFilterSubject] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYears, setFilterYears] = useState([])

  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('questions')

  const loadStats = useCallback(() => {
    window.electronAPI.adminGetStats().then(setStats)
  }, [])

  const loadRegistry = useCallback(() => {
    window.electronAPI.adminGetAllSubjects().then(setAllSubjects)
    window.electronAPI.adminGetAllYears().then(setAllYears)
  }, [])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    const res = await window.electronAPI.adminGetQuestions({
      subject: filterSubject || null,
      year: filterYear ? parseInt(filterYear) : null,
      filter: filterStatus || null,
      page,
      pageSize: PAGE_SIZE,
    })
    setQuestions(res.questions)
    setTotal(res.total)
    setLoading(false)
  }, [filterSubject, filterYear, filterStatus, page])

  useEffect(() => { loadStats(); loadRegistry() }, [])
  useEffect(() => { loadQuestions() }, [loadQuestions])

  useEffect(() => {
    if (filterSubject) {
      window.electronAPI.adminGetYears(filterSubject).then(rows => setFilterYears(rows.map(r => r.year)))
      setFilterYear('')
    } else {
      setFilterYears([])
      setFilterYear('')
    }
    setPage(1)
  }, [filterSubject])

  useEffect(() => { setPage(1) }, [filterStatus, filterYear])

  // Reload registry when switching back to questions tab (user may have added subjects/years)
  useEffect(() => {
    if (activeTab === 'questions') loadRegistry()
  }, [activeTab])

  const handleSave = (saved) => {
    if (editing) {
      setQuestions(qs => qs.map(q => q.id === saved.id ? saved : q))
      setEditing(null)
    } else {
      setQuestions(qs => [saved, ...qs])
      setTotal(t => t + 1)
      setAdding(false)
    }
    loadStats()
  }

  const handleDelete = (id) => {
    setQuestions(qs => qs.filter(q => q.id !== id))
    setTotal(t => t - 1)
    loadStats()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={s.container}>
      {/* Top bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('home')}>← Home</button>
        <h1 style={s.title}>Admin Dashboard</h1>
        <div style={s.tabs}>
          {[['questions', 'Questions'], ['stats', 'Stats'], ['registry', 'Subjects & Years'], ['aiken', 'Import (Aiken)'], ['license', 'License']].map(([id, label]) => (
            <button key={id}
              style={{ ...s.tab, borderBottom: activeTab === id ? '3px solid #FFD700' : '3px solid transparent' }}
              onClick={() => setActiveTab(id)}
            >{label}</button>
          ))}
        </div>
        <button style={s.logoutBtn} onClick={onLogout} title="Logout">⏻ Logout</button>
      </div>

      {/* ── Stats Tab ── */}
      {activeTab === 'stats' && stats && (
        <div style={s.body}>
          <div style={s.statCards}>
            {[
              [stats.total, 'Total Questions', '#006633'],
              [stats.subjects.length, 'Subjects', '#006633'],
              [stats.subjects.reduce((n, s) => n + s.missing_answers, 0), 'Missing Answers', '#cc0000'],
              [stats.subjects.reduce((n, s) => n + s.with_diagrams, 0), 'With Diagrams', '#0066cc'],
            ].map(([num, label, color]) => (
              <div key={label} style={s.statCard}>
                <span style={{ ...s.statNum, color }}>{num}</span>
                <span style={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>
          <div style={s.subjectTable}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Subject', 'Total', 'Years', 'Missing Answers', 'With Diagrams', 'Coverage'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.subjects.map(sub => {
                  const pct = Math.round(((sub.total - sub.missing_answers) / sub.total) * 100)
                  return (
                    <tr key={sub.subject} style={s.tr}>
                      <td style={s.td}><strong>{sub.subject}</strong></td>
                      <td style={s.td}>{sub.total}</td>
                      <td style={s.td}>{sub.years}</td>
                      <td style={{ ...s.td, color: sub.missing_answers > 0 ? '#cc0000' : '#006633', fontWeight: '600' }}>
                        {sub.missing_answers === 0 ? '✓ None' : sub.missing_answers}
                      </td>
                      <td style={s.td}>{sub.with_diagrams > 0 ? `📊 ${sub.with_diagrams}` : '—'}</td>
                      <td style={s.td}>
                        <div style={s.coverageBar}>
                          <div style={{ ...s.coverageFill, width: `${pct}%`, background: pct === 100 ? '#006633' : pct > 80 ? '#e67e22' : '#cc0000' }} />
                          <span style={s.coveragePct}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── License Tab ── */}
      {activeTab === 'license' && <LicenseTab />}

      {/* ── Subjects & Years Tab ── */}
      {activeTab === 'registry' && <SubjectsYearsTab />}

      {/* ── Aiken Import Tab ── */}
      {activeTab === 'aiken' && (
        <AikenImportTab
          allSubjects={allSubjects}
          allYears={allYears}
          onImportDone={() => { loadStats(); loadRegistry(); }}
        />
      )}

      {/* ── Questions Tab ── */}
      {activeTab === 'questions' && (
        <>
          <div style={s.filterBar}>
            <select style={s.select} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">All subjects</option>
              {allSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>

            <select style={s.select} value={filterYear} onChange={e => setFilterYear(e.target.value)} disabled={!filterSubject}>
              <option value="">All years</option>
              {filterYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <div style={s.filterBtns}>
              {[['', 'All'], ['missing', '⚠ Missing answers'], ['diagrams', '📊 Has diagram']].map(([val, label]) => (
                <button key={val}
                  style={{ ...s.filterBtn, background: filterStatus === val ? '#006633' : '#e0e0e0', color: filterStatus === val ? '#fff' : '#333' }}
                  onClick={() => setFilterStatus(val)}
                >{label}</button>
              ))}
            </div>

            <span style={s.countLabel}>{total} question{total !== 1 ? 's' : ''}</span>
            <button style={s.addBtn} onClick={() => setAdding(true)}>+ Add Question</button>
          </div>

          <div style={s.body}>
            {loading ? (
              <div style={s.loading}>Loading...</div>
            ) : questions.length === 0 ? (
              <div style={s.empty}>No questions found.</div>
            ) : (
              questions.map(q => <QuestionRow key={q.id} q={q} onEdit={setEditing} onDelete={handleDelete} />)
            )}
          </div>

          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span style={s.pageInfo}>Page {page} of {totalPages}</span>
              <button style={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button style={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          )}
        </>
      )}

      {editing && <QuestionFormModal initial={editing} subjects={allSubjects} years={allYears} onSave={handleSave} onClose={() => setEditing(null)} />}
      {adding  && <QuestionFormModal initial={null}    subjects={allSubjects} years={allYears} onSave={handleSave} onClose={() => setAdding(false)} />}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f2f5' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '0 20px', background: '#006633', color: '#fff', height: '56px', flexShrink: 0 },
  backBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px' },
  title: { fontSize: '18px', fontWeight: '700', marginRight: 'auto' },
  tabs: { display: 'flex', height: '100%', alignItems: 'flex-end' },
  tab: { background: 'none', border: 'none', color: '#fff', padding: '0 18px', height: '48px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', borderRadius: 0, whiteSpace: 'nowrap' },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '8px' },

  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #ddd', flexShrink: 0 },
  select: { padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', background: '#fff' },
  filterBtns: { display: 'flex', gap: '6px' },
  filterBtn: { padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  countLabel: { fontSize: '13px', color: '#666', fontWeight: '600', marginLeft: 'auto' },
  addBtn: { background: '#0066cc', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },

  body: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  empty: { textAlign: 'center', padding: '40px', color: '#999' },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#fff', borderTop: '1px solid #ddd', flexShrink: 0 },
  pageBtn: { padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '14px' },
  pageInfo: { fontSize: '13px', color: '#555', padding: '0 8px' },

  statCards: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' },
  statCard: { background: '#fff', borderRadius: '10px', padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flex: '1 1 140px' },
  statNum: { fontSize: '36px', fontWeight: '900' },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '4px', textAlign: 'center' },

  subjectTable: { background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9fa' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e0e0' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#333' },
  coverageBar: { display: 'flex', alignItems: 'center', gap: '8px' },
  coverageFill: { height: '8px', borderRadius: '4px', minWidth: '4px', transition: 'width 0.3s' },
  coveragePct: { fontSize: '12px', fontWeight: '700', minWidth: '36px' },
}

const row = {
  container: { background: '#fff', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' },
  top: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  id: { fontSize: '11px', color: '#aaa', fontWeight: '600', minWidth: '36px' },
  meta: { fontSize: '12px', color: '#006633', fontWeight: '600' },
  missingBadge: { background: '#fff0f0', color: '#cc0000', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  diagramBadge: { background: '#e8f0ff', color: '#0066cc', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' },
  actions: { display: 'flex', gap: '6px', marginLeft: 'auto' },
  editBtn: { background: '#e8f0ff', color: '#0066cc', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { border: '1px solid #ffcccc', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  questionText: { fontSize: '14px', lineHeight: '1.5', color: '#1a1a1a', marginBottom: '10px' },
  options: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  opt: { fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box: { background: '#fff', borderRadius: '12px', width: '640px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e0e0e0' },
  title: { fontWeight: '700', fontSize: '16px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666', lineHeight: 1 },
  body: { overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e0e0e0' },
  row: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit', width: '100%', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff' },
  optRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  optLetter: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 },
  answerBtn: { padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  letterBtn: { width: '36px', height: '36px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  cancelBtn: { background: '#f0f0f0', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  errorBox: { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' },
}

const sy = {
  container: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  panel: { background: '#fff', borderRadius: '12px', padding: '24px', flex: '1 1 300px', maxWidth: '480px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  panelTitle: { fontSize: '18px', fontWeight: '700', color: '#006633' },
  count: { background: '#e8f5e9', color: '#006633', padding: '3px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  addRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  input: { flex: 1, padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  addBtn: { background: '#006633', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  error: { color: '#cc0000', fontSize: '13px', margin: '4px 0 8px' },
  success: { color: '#006633', fontSize: '13px', margin: '4px 0 8px', fontWeight: '600' },
  list: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' },
  listItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #eee' },
  itemDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#006633', flexShrink: 0 },
  itemName: { fontSize: '14px', color: '#1a1a1a', fontWeight: '500' },
  empty: { color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px 0' },
}
