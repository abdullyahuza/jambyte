const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const Database = require('better-sqlite3')
const sb = require('./supabase')

// ── License helpers ───────────────────────────────────────────────────────────
const APP_SECRET = 'LOGICYTE_CBT_JAMB_2024_X7K9'

function generateLicenseCode(expiryDateStr) {
  const daysSinceEpoch = Math.floor(new Date(expiryDateStr).getTime() / 86400000)
  const encoded = daysSinceEpoch.toString(36).toUpperCase()
  const hmac = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('hex').slice(0, 6).toUpperCase()
  return `${encoded}-${hmac}`
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

function getDbPath() {
  if (isDev) return path.join(__dirname, '../questions/jamb.db')
  // In production: use a writable copy in AppData/userData.
  // On first launch, seed it from the read-only bundled copy in resources/.
  const userDb = path.join(app.getPath('userData'), 'jamb.db')
  if (!fs.existsSync(userDb)) {
    fs.copyFileSync(path.join(process.resourcesPath, 'jamb.db'), userDb)
  }
  return userDb
}

const DB_PATH = getDbPath()

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
    // License table — create if new, then migrate older schemas
    db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        code         TEXT NOT NULL UNIQUE,
        machine_id   TEXT NOT NULL DEFAULT '',
        expiry       TEXT NOT NULL,
        last_online  TEXT NOT NULL DEFAULT '',
        activated_at TEXT NOT NULL
      )
    `)
    const licCols = db.prepare('PRAGMA table_info(licenses)').all().map(c => c.name)
    if (!licCols.includes('machine_id'))  db.exec(`ALTER TABLE licenses ADD COLUMN machine_id  TEXT NOT NULL DEFAULT ''`)
    if (!licCols.includes('last_online')) db.exec(`ALTER TABLE licenses ADD COLUMN last_online TEXT NOT NULL DEFAULT ''`)
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
  if (isDev) return path.join(__dirname, '../questions/diagrams')
  // Admin-uploaded images go to writable userData/diagrams.
  // Bundled diagrams from resources/ are also checked in get-diagram below.
  const dir = path.join(app.getPath('userData'), 'diagrams')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getBundledDiagramsDir() {
  return path.join(process.resourcesPath, 'diagrams')
}

ipcMain.handle('get-diagram', (event, imagePath) => {
  const name = path.basename(imagePath)
  // Check userData/diagrams first (admin-uploaded), then bundled resources/diagrams
  const candidates = [
    path.join(getDiagramsDir(), name),
    ...(isDev ? [] : [path.join(getBundledDiagramsDir(), name)]),
  ]
  const fullPath = candidates.find(p => fs.existsSync(p))
  if (!fullPath) return null
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
  if (username !== ADMIN_USER || passHash !== ADMIN_PASS_HASH) {
    return { error: 'Invalid username or password' }
  }
  // Auto-activate this device for 7 days (admin devices don't need Supabase)
  try {
    const machineId = sb.getMachineId()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 7)
    const expiryStr = expiry.toISOString().split('T')[0]
    saveCachedLicense('ADMIN-DEVICE', machineId, expiryStr)
  } catch (e) {
    console.warn('admin-login: could not save local license:', e.message)
  }
  return { ok: true }
})

// ── Local license cache helpers ───────────────────────────────────────────────
function ensureLicenseTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      code         TEXT NOT NULL UNIQUE,
      machine_id   TEXT NOT NULL,
      expiry       TEXT NOT NULL,
      last_online  TEXT NOT NULL,
      activated_at TEXT NOT NULL
    )
  `)
}

function getCachedLicense() {
  ensureLicenseTable()
  return getDb().prepare(`SELECT * FROM licenses ORDER BY activated_at DESC LIMIT 1`).get()
}

function saveCachedLicense(code, machineId, expiry) {
  ensureLicenseTable()
  const now = new Date().toISOString()
  getDb().prepare(`
    INSERT OR REPLACE INTO licenses (code, machine_id, expiry, last_online, activated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, machineId, expiry, now, now)
}

function updateLastOnline(code) {
  ensureLicenseTable()
  getDb().prepare(`UPDATE licenses SET last_online = ? WHERE code = ?`)
    .run(new Date().toISOString(), code)
}

// ── License IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('check-license', async () => {
  try {
    const cached = getCachedLicense()
    if (!cached) return { valid: false, reason: 'no_license' }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const expiry = new Date(cached.expiry)

    // If Supabase is configured, try online revalidation
    if (sb.isConfigured()) {
      const online = await sb.revalidateOnline(cached.code, cached.machine_id)
      if (online) {
        // Got a response — trust it
        if (!online.valid) return { valid: false, reason: online.reason || 'revoked' }
        updateLastOnline(cached.code)
        // Update expiry in case admin extended it
        getDb().prepare(`UPDATE licenses SET expiry = ? WHERE code = ?`).run(online.expiry, cached.code)
        return { valid: true, expiry: online.expiry, daysLeft: online.daysLeft }
      }
      // No response = offline — apply grace period
      const lastOnline = new Date(cached.last_online)
      const daysSinceOnline = Math.floor((Date.now() - lastOnline.getTime()) / 86400000)
      if (daysSinceOnline > sb.GRACE_DAYS) {
        return { valid: false, reason: 'grace_expired', daysSinceOnline }
      }
    }

    // Offline or Supabase not configured — check local expiry
    if (expiry < today) return { valid: false, reason: 'expired', expiry: cached.expiry }
    const daysLeft = Math.ceil((expiry - today) / 86400000)
    return { valid: true, expiry: cached.expiry, daysLeft, offline: sb.isConfigured() }
  } catch (e) {
    console.error('check-license error:', e.message)
    return { valid: false, reason: 'no_license' }
  }
})

ipcMain.handle('activate-license', async (event, code) => {
  const trimmed = code.toUpperCase().trim()

  if (!sb.isConfigured()) {
    return { error: 'Activation requires an internet connection. Please connect and try again.' }
  }

  try {
    const result = await sb.activateOnline(trimmed)
    if (result.error) return { error: result.error }
    saveCachedLicense(trimmed, result.machineId, result.expiry)
    return { ok: true, expiry: result.expiry, daysLeft: result.daysLeft }
  } catch (e) {
    return { error: 'Could not reach the activation server. Please check your internet connection and try again.' }
  }
})

ipcMain.handle('generate-license', async (event, { note } = {}) => {
  // All licenses are valid for exactly 1 month from today
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 1)
  const expiryDateStr = expiry.toISOString().split('T')[0]

  const code = generateLicenseCode(expiryDateStr)

  if (sb.isConfigured()) {
    const result = await sb.createLicenseOnline(code, expiryDateStr, 1, note || '')
    if (result.error) console.warn('createLicenseOnline:', result.error)
  }

  return { code, expiry: expiryDateStr }
})

ipcMain.handle('list-licenses', async () => {
  if (!sb.isConfigured()) return { error: 'Supabase not configured' }
  try {
    return { licenses: await sb.listLicensesOnline() }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('revoke-activation', async (event, activationId) => {
  if (!sb.isConfigured()) return { error: 'Supabase not configured' }
  try {
    await sb.revokeActivation(activationId)
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})
