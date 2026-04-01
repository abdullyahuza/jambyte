#!/usr/bin/env node
/**
 * JAMB PDF Question Importer
 * Usage: node scripts/import-pdf.js <path-to-pdf> <subject> [year]
 * Example: node scripts/import-pdf.js ~/pdfs/chemistry-2019.pdf Chemistry 2019
 *
 * Requires: ANTHROPIC_API_KEY env variable
 *   export ANTHROPIC_API_KEY=sk-ant-...
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')
const Anthropic = require('@anthropic-ai/sdk')
const Database = require('better-sqlite3')

// ── Config ──────────────────────────────────────────────────────────────────
const PDF_PATH = process.argv[2]
const SUBJECT   = process.argv[3]
const YEAR      = parseInt(process.argv[4]) || null

if (!PDF_PATH || !SUBJECT) {
  console.error('Usage: node scripts/import-pdf.js <pdf-path> <subject> [year]')
  console.error('Example: node scripts/import-pdf.js ~/Chemistry.pdf Chemistry 2019')
  process.exit(1)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable not set.')
  console.error('Run: export ANTHROPIC_API_KEY=sk-ant-...')
  process.exit(1)
}
if (!fs.existsSync(PDF_PATH)) {
  console.error(`Error: File not found: ${PDF_PATH}`)
  process.exit(1)
}

const DB_PATH      = path.join(__dirname, '../questions/jamb.db')
const DIAGRAMS_DIR = path.join(__dirname, '../questions/diagrams')
const TEMP_DIR     = path.join('/tmp', `jamb-import-${Date.now()}`)

fs.mkdirSync(TEMP_DIR, { recursive: true })
fs.mkdirSync(DIAGRAMS_DIR, { recursive: true })

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Database setup ───────────────────────────────────────────────────────────
const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subject     TEXT NOT NULL,
    year        INTEGER,
    question    TEXT NOT NULL,
    options     TEXT NOT NULL,
    answer      TEXT NOT NULL,
    explanation TEXT,
    image_path  TEXT
  )
`)

// Add image_path column if it doesn't exist (migration for existing DBs)
const cols = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name)
if (!cols.includes('image_path')) {
  db.exec('ALTER TABLE questions ADD COLUMN image_path TEXT')
  console.log('✓ Migrated DB: added image_path column')
}

const insertQ = db.prepare(`
  INSERT INTO questions (subject, year, question, options, answer, explanation, image_path)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

// ── Step 1: Convert PDF pages to PNG images ──────────────────────────────────
console.log(`\n📄 Converting PDF to images: ${path.basename(PDF_PATH)}`)

const result = spawnSync('pdftoppm', ['-r', '150', '-png', PDF_PATH, path.join(TEMP_DIR, 'page')], {
  encoding: 'utf8'
})

if (result.status !== 0) {
  console.error('pdftoppm failed:', result.stderr)
  process.exit(1)
}

const pageFiles = fs.readdirSync(TEMP_DIR)
  .filter(f => f.endsWith('.png'))
  .sort()
  .map(f => path.join(TEMP_DIR, f))

console.log(`✓ Generated ${pageFiles.length} page images`)

// ── Step 2: Process each page with Claude ───────────────────────────────────
const SYSTEM_PROMPT = `You are an expert at extracting exam questions from scanned PDF pages.
Your task is to extract ALL exam questions visible on the page and return them as structured JSON.

Rules:
- Extract every complete question you can see (may be 2-column layout)
- Options are labeled A, B, C, D, E (use just the letter, not the full text prefix)
- If a question has a diagram/figure/graph, set has_diagram to true
- For the answer field: if the answer key is not on this page, leave it as "" (empty string)
- For chemical equations, use plain text (e.g. H2SO4, not subscripts)
- If a question is cut off or incomplete (continues on next page), set incomplete to true
- Return ONLY valid JSON, no other text`

const USER_PROMPT = `Extract all exam questions from this page. Return JSON in this exact format:
{
  "questions": [
    {
      "number": 1,
      "question": "full question text here",
      "options": {
        "A": "option A text",
        "B": "option B text",
        "C": "option C text",
        "D": "option D text",
        "E": "option E text"
      },
      "answer": "A",
      "explanation": "",
      "has_diagram": false,
      "incomplete": false
    }
  ]
}

Notes:
- Some questions may only have options A-D, that is fine
- If this is an answer key page, extract the answers as: {"answers": {"1": "B", "2": "C", ...}}
- If the page has no questions (cover page, instructions, etc.), return {"questions": []}`

let allQuestions = []
let answerKey = {}
let savedCount = 0

for (let i = 0; i < pageFiles.length; i++) {
  const pageFile = pageFiles[i]
  const pageNum = i + 1
  process.stdout.write(`  Processing page ${pageNum}/${pageFiles.length}...`)

  const imageData = fs.readFileSync(pageFile)
  const base64Image = imageData.toString('base64')

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64Image }
          },
          { type: 'text', text: USER_PROMPT }
        ]
      }]
    })

    const text = response.content[0].text.trim()

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : text

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.log(` ⚠ Could not parse JSON on page ${pageNum}, skipping`)
      continue
    }

    // Check if this is an answer key page
    if (parsed.answers) {
      Object.assign(answerKey, parsed.answers)
      console.log(` ✓ Answer key page (${Object.keys(parsed.answers).length} answers)`)
      continue
    }

    const pageQuestions = parsed.questions || []

    for (const q of pageQuestions) {
      if (!q.question || q.incomplete) continue

      // Handle diagram: save the page image as the diagram for this question
      let imagePath = null
      if (q.has_diagram) {
        const diagName = `${SUBJECT.toLowerCase().replace(/\s+/g, '-')}_q${q.number}_p${pageNum}.png`
        const diagDest = path.join(DIAGRAMS_DIR, diagName)
        fs.copyFileSync(pageFile, diagDest)
        imagePath = `diagrams/${diagName}`
      }

      // Store question with placeholder answer (will be filled from answer key)
      allQuestions.push({
        number: q.number,
        question: q.question,
        options: q.options,
        answer: q.answer || '',
        explanation: q.explanation || '',
        image_path: imagePath,
        page: pageNum,
      })
    }

    console.log(` ✓ ${pageQuestions.filter(q => !q.incomplete).length} questions extracted`)

  } catch (err) {
    console.log(` ✗ Error: ${err.message}`)
  }

  // Small delay to avoid rate limits
  if (i < pageFiles.length - 1) {
    await new Promise(r => setTimeout(r, 500))
  }
}

// ── Step 3: Apply answer key (if found on separate page) ─────────────────────
if (Object.keys(answerKey).length > 0) {
  console.log(`\n🔑 Applying answer key to ${Object.keys(answerKey).length} questions...`)
  for (const q of allQuestions) {
    const keyAnswer = answerKey[String(q.number)]
    if (keyAnswer && !q.answer) {
      q.answer = keyAnswer
    }
  }
}

// ── Step 4: Save to database ─────────────────────────────────────────────────
console.log('\n💾 Saving to database...')

const saveMany = db.transaction((questions) => {
  for (const q of questions) {
    if (!q.answer) {
      console.log(`  ⚠ Skipping Q${q.number} — no answer found`)
      continue
    }
    const optionsArr = Object.entries(q.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, text]) => `${letter}. ${text}`)

    insertQ.run(
      SUBJECT,
      YEAR,
      q.question,
      JSON.stringify(optionsArr),
      q.answer,
      q.explanation || null,
      q.image_path || null
    )
    savedCount++
  }
})

saveMany(allQuestions)

// ── Step 5: Cleanup temp files ───────────────────────────────────────────────
fs.rmSync(TEMP_DIR, { recursive: true, force: true })

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Import complete!
   Subject  : ${SUBJECT}
   Year     : ${YEAR || 'not set'}
   Extracted: ${allQuestions.length} questions
   Saved    : ${savedCount} questions
   Skipped  : ${allQuestions.length - savedCount} (missing answers)
   Diagrams : ${allQuestions.filter(q => q.image_path).length} pages saved
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${savedCount === 0 ? '⚠ No questions saved. Check if answer key is in the PDF.' : ''}
${allQuestions.filter(q => q.image_path).length > 0 ? '📸 Diagram pages saved to questions/diagrams/' : ''}

Next steps:
  1. Run the app: npm run dev
  2. Review imported questions in the Admin screen
  3. Fix any questions with wrong answers manually
`)

db.close()
