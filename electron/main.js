const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const Database = require('better-sqlite3')

// ── License helpers ───────────────────────────────────────────────────────────
const APP_SECRET = 'LOGICYTE_CBT_JAMB_2024_X7K9'

function generateLicenseCode(expiryDateStr) {
  const daysSinceEpoch = Math.floor(new Date(expiryDateStr).getTime() / 86400000)
  const encoded = daysSinceEpoch.toString(36).toUpperCase()
  const hmac = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('hex').slice(0, 6).toUpperCase()
  return `${encoded}-${hmac}`
}

function validateLicenseCode(code) {
  const parts = code.toUpperCase().trim().split('-')
  if (parts.length !== 2) return null
  const [encoded, hmac] = parts
  const expected = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('hex').slice(0, 6).toUpperCase()
  if (hmac !== expected) return null
  const daysSinceEpoch = parseInt(encoded, 36)
  if (isNaN(daysSinceEpoch)) return null
  const expiryDate = new Date(daysSinceEpoch * 86400000)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (expiryDate < today) return { expired: true, expiryDate }
  return { expired: false, expiryDate, daysLeft: Math.ceil((expiryDate - today) / 86400000) }
}

// ── Options shuffler ─────────────────────────────────────────────────────────
// Options are stored as arrays: ["A. text", "B. text", "C. text", "D. text"]
// Answer is stored as a letter: "A", "B", "C", "D"
function shuffleOptions(options, answer) {
  if (!Array.isArray(options) || options.length === 0) return { options, answer }

  // Fisher-Yates shuffle on a copy
  const shuffled = [...options]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const letters = ['A', 'B', 'C', 'D', 'E']
  let newAnswer = answer

  const result = shuffled.map((opt, i) => {
    // Extract the original letter prefix and text (handles "A. ", "A) ", "A: ")
    const match = opt.match(/^([A-E])[.):\s]\s*(.+)/s)
    const originalLetter = match ? match[1] : null
    const text = match ? match[2] : opt
    const newLetter = letters[i]

    if (originalLetter === answer) newAnswer = newLetter

    return `${newLetter}. ${text}`
  })

  return { options: result, answer: newAnswer }
}

const isDev = !app.isPackaged
const DB_PATH = isDev
  ? path.join(__dirname, '../questions/jamb.db')
  : path.join(process.resourcesPath, 'jamb.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    // Migrations
    const cols = db.prepare('PRAGMA table_info(questions)').all().map(c => c.name)
    if (!cols.includes('image_path')) {
      db.exec('ALTER TABLE questions ADD COLUMN image_path TEXT')
    }
    if (!cols.includes('option_images')) {
      db.exec('ALTER TABLE questions ADD COLUMN option_images TEXT')
    }
    // Subjects registry table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subjects (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `)
    // Years registry table
    db.exec(`
      CREATE TABLE IF NOT EXISTS years (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL UNIQUE
      )
    `)
    // Seed subjects/years from existing questions so existing DBs work
    db.prepare(`INSERT OR IGNORE INTO subjects (name) SELECT DISTINCT subject FROM questions`).run()
    db.prepare(`INSERT OR IGNORE INTO years (year) SELECT DISTINCT year FROM questions WHERE year IS NOT NULL`).run()
    // License table
    db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        code    TEXT NOT NULL UNIQUE,
        expiry  TEXT NOT NULL,
        activated_at TEXT NOT NULL
      )
    `)
  }
  return db
}

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon.png')
    : path.join(process.resourcesPath, 'icon.png')

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'JAMB CBT Practice',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers

ipcMain.handle('get-subjects', () => {
  return getDb().prepare('SELECT DISTINCT subject FROM questions ORDER BY subject').all()
})

ipcMain.handle('get-questions', (event, { subject, limit }) => {
  const q = limit
    ? getDb().prepare('SELECT * FROM questions WHERE subject = ? ORDER BY RANDOM() LIMIT ?').all(subject, limit)
    : getDb().prepare('SELECT * FROM questions WHERE subject = ? ORDER BY RANDOM()').all(subject)
  return q.map(r => {
    const parsed = JSON.parse(r.options)
    const { options, answer } = shuffleOptions(parsed, r.answer)
    return { ...r, options, answer, option_images: r.option_images ? JSON.parse(r.option_images) : null }
  })
})

ipcMain.handle('get-all-exam-questions', (event, subjects) => {
  // English Language: 60 questions; all other subjects: 40 questions
  const all = []
  for (const subject of subjects) {
    const isEnglish = subject.toLowerCase().includes('english')
    const limit = isEnglish ? 60 : 40
    const rows = getDb()
      .prepare('SELECT * FROM questions WHERE subject = ? ORDER BY RANDOM() LIMIT ?')
      .all(subject, limit)
    rows.forEach(r => {
      const parsed = JSON.parse(r.options)
      const { options, answer } = shuffleOptions(parsed, r.answer)
      all.push({ ...r, options, answer, option_images: r.option_images ? JSON.parse(r.option_images) : null })
    })
  }
  return all
})

ipcMain.handle('save-result', (event, result) => {
  getDb().prepare(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      score INTEGER,
      total INTEGER,
      date TEXT
    )
  `).run()
  getDb().prepare('INSERT INTO results (subject, score, total, date) VALUES (?, ?, ?, ?)')
    .run(result.subject, result.score, result.total, new Date().toISOString())
  return { ok: true }
})

ipcMain.handle('get-results', () => {
  try {
    return getDb().prepare('SELECT * FROM results ORDER BY date DESC LIMIT 50').all()
  } catch {
    return []
  }
})

// ── Admin IPC Handlers ───────────────────────────────────────────────────────

ipcMain.handle('admin-get-stats', () => {
  const subjects = getDb().prepare(`
    SELECT subject,
      COUNT(*) as total,
      SUM(CASE WHEN answer = '' OR answer IS NULL THEN 1 ELSE 0 END) as missing_answers,
      SUM(CASE WHEN image_path IS NOT NULL THEN 1 ELSE 0 END) as with_diagrams,
      COUNT(DISTINCT year) as years
    FROM questions GROUP BY subject ORDER BY subject
  `).all()
  const total = getDb().prepare('SELECT COUNT(*) as n FROM questions').get()
  return { subjects, total: total.n }
})

ipcMain.handle('admin-get-questions', (event, { subject, year, filter, page, pageSize }) => {
  let where = []
  let params = []
  if (subject) { where.push('subject = ?'); params.push(subject) }
  if (year)    { where.push('year = ?');    params.push(year) }
  if (filter === 'missing') where.push("(answer = '' OR answer IS NULL)")
  if (filter === 'diagrams') where.push('image_path IS NOT NULL')
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const offset = (page - 1) * pageSize
  const rows = getDb().prepare(
    `SELECT * FROM questions ${whereStr} ORDER BY subject, year, id LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset)
  const countRow = getDb().prepare(`SELECT COUNT(*) as n FROM questions ${whereStr}`).get(...params)
  return {
    questions: rows.map(r => ({ ...r, options: JSON.parse(r.options), option_images: r.option_images ? JSON.parse(r.option_images) : null })),
    total: countRow.n,
  }
})

ipcMain.handle('admin-add-question', (event, q) => {
  const addQ = getDb().transaction(() => {
    // Auto-register subject and year if not already present
    getDb().prepare('INSERT OR IGNORE INTO subjects (name) VALUES (?)').run(q.subject)
    if (q.year) getDb().prepare('INSERT OR IGNORE INTO years (year) VALUES (?)').run(q.year)
    const info = getDb().prepare(`
      INSERT INTO questions (subject, year, question, options, answer, explanation, image_path, option_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(q.subject, q.year || null, q.question, JSON.stringify(q.options), q.answer, q.explanation || null, q.image_path || null, q.option_images ? JSON.stringify(q.option_images) : null)
    return { id: info.lastInsertRowid }
  })
  return addQ()
})

ipcMain.handle('admin-update-question', (event, q) => {
  getDb().prepare(`
    UPDATE questions SET subject=?, year=?, question=?, options=?, answer=?, explanation=?, image_path=?, option_images=?
    WHERE id=?
  `).run(q.subject, q.year, q.question, JSON.stringify(q.options), q.answer, q.explanation, q.image_path || null, q.option_images ? JSON.stringify(q.option_images) : null, q.id)
  return { ok: true }
})

ipcMain.handle('admin-delete-question', (event, id) => {
  getDb().prepare('DELETE FROM questions WHERE id=?').run(id)
  return { ok: true }
})

ipcMain.handle('admin-get-years', (event, subject) => {
  return getDb().prepare(
    'SELECT DISTINCT year FROM questions WHERE subject=? AND year IS NOT NULL ORDER BY year DESC'
  ).all(subject)
})

ipcMain.handle('admin-get-all-subjects', () => {
  return getDb().prepare('SELECT name FROM subjects ORDER BY name').all().map(r => r.name)
})

ipcMain.handle('admin-add-subject', (event, name) => {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Subject name cannot be empty' }
  try {
    getDb().prepare('INSERT INTO subjects (name) VALUES (?)').run(trimmed)
    return { ok: true }
  } catch {
    return { error: 'Subject already exists' }
  }
})

ipcMain.handle('admin-get-all-years', () => {
  return getDb().prepare('SELECT year FROM years ORDER BY year DESC').all().map(r => r.year)
})

ipcMain.handle('admin-add-year', (event, year) => {
  const y = parseInt(year)
  if (!y || y < 1990 || y > 2100) return { error: 'Enter a valid year (e.g. 2023)' }
  try {
    getDb().prepare('INSERT INTO years (year) VALUES (?)').run(y)
    return { ok: true }
  } catch {
    return { error: 'Year already exists' }
  }
})

function getDiagramsDir() {
  return isDev
    ? path.join(__dirname, '../questions/diagrams')
    : path.join(process.resourcesPath, 'diagrams')
}

ipcMain.handle('get-diagram', (event, imagePath) => {
  const fullPath = path.join(getDiagramsDir(), path.basename(imagePath))
  if (!fs.existsSync(fullPath)) return null
  const ext = path.extname(fullPath).toLowerCase()
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/png'
  return `data:${mime};base64,` + fs.readFileSync(fullPath).toString('base64')
})

function saveImageToDiagrams(srcPath) {
  const ext = path.extname(srcPath).toLowerCase()
  const name = `img_${Date.now()}${ext}`
  const dest = path.join(getDiagramsDir(), name)
  fs.mkdirSync(getDiagramsDir(), { recursive: true })
  fs.copyFileSync(srcPath, dest)
  return name
}

ipcMain.handle('admin-pick-image', async (event) => {
  const win = BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths.length) return null
  return saveImageToDiagrams(filePaths[0])
})

// Called when user drops a file — receives the absolute path from the renderer
ipcMain.handle('admin-save-image', (event, srcPath) => {
  if (!fs.existsSync(srcPath)) return null
  return saveImageToDiagrams(srcPath)
})

// ── Admin auth ────────────────────────────────────────────────────────────────
const ADMIN_USER = 'logicyte'
const ADMIN_PASS_HASH = crypto.createHash('sha256').update('cbt++').digest('hex')

ipcMain.handle('admin-login', (event, { username, password }) => {
  const passHash = crypto.createHash('sha256').update(password).digest('hex')
  if (username === ADMIN_USER && passHash === ADMIN_PASS_HASH) return { ok: true }
  return { error: 'Invalid username or password' }
})

// ── License IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('check-license', () => {
  try {
    const d = getDb()
    // Ensure table exists before querying
    d.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        code    TEXT NOT NULL UNIQUE,
        expiry  TEXT NOT NULL,
        activated_at TEXT NOT NULL
      )
    `)
    const row = d.prepare(`SELECT * FROM licenses ORDER BY expiry DESC LIMIT 1`).get()
    if (!row) return { valid: false, reason: 'no_license' }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const expiry = new Date(row.expiry)
    if (expiry < today) return { valid: false, reason: 'expired', expiry: row.expiry }
    const daysLeft = Math.ceil((expiry - today) / 86400000)
    return { valid: true, expiry: row.expiry, daysLeft }
  } catch (e) {
    console.error('check-license error:', e.message)
    return { valid: false, reason: 'no_license' }
  }
})

ipcMain.handle('activate-license', (event, code) => {
  const result = validateLicenseCode(code)
  if (!result) return { error: 'Invalid license code' }
  if (result.expired) return { error: `License code expired on ${result.expiryDate.toLocaleDateString()}` }
  try {
    const d = getDb()
    // Ensure table exists (in case migration was skipped on older DB)
    d.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        code    TEXT NOT NULL UNIQUE,
        expiry  TEXT NOT NULL,
        activated_at TEXT NOT NULL
      )
    `)
    d.prepare(
      `INSERT OR REPLACE INTO licenses (code, expiry, activated_at) VALUES (?, ?, ?)`
    ).run(code.toUpperCase().trim(), result.expiryDate.toISOString().split('T')[0], new Date().toISOString())
    return { ok: true, expiry: result.expiryDate.toISOString().split('T')[0], daysLeft: result.daysLeft }
  } catch (e) {
    console.error('activate-license error:', e.message)
    return { error: `Failed to save license: ${e.message}` }
  }
})

ipcMain.handle('generate-license', (event, expiryDateStr) => {
  if (!expiryDateStr) return { error: 'Expiry date required' }
  const d = new Date(expiryDateStr)
  if (isNaN(d.getTime())) return { error: 'Invalid date' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (d < today) return { error: 'Expiry date must be in the future' }
  return { code: generateLicenseCode(expiryDateStr) }
})
