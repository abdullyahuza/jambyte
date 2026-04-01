# JAMB CBT Practice
//sudo apt install build-essential gcc-multilib g++-multilib
//npx electron-builder --win portable
A desktop application for Nigerian students to practise for the Joint Admissions and Matriculation Board (JAMB) Computer-Based Test. Built with Electron, React, and SQLite.

© 2024 Logicyte Technologies

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started (Development)](#getting-started-development)
- [Project Structure](#project-structure)
- [Admin Guide](#admin-guide)
  - [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
  - [Managing Questions](#managing-questions)
  - [Importing Questions (Aiken Format)](#importing-questions-aiken-format)
  - [License Management](#license-management)
- [License & Activation System](#license--activation-system)
  - [Setting Up Supabase](#setting-up-supabase)
  - [Activating a Device (Student)](#activating-a-device-student)
  - [Revoking a Device](#revoking-a-device)
- [Building for Windows](#building-for-windows)
  - [Local Build](#local-build)
  - [GitHub Actions Build](#github-actions-build)
- [Exam Rules](#exam-rules)

---

## Features

- **Mock Exam Mode** — Full JAMB simulation: 4 subjects (English fixed + 3 of choice), 180 questions, 120-minute timer
- **Practice Mode** — Single subject, 40 questions, 30-minute timer
- **Question shuffling** — Questions and answer options are randomly shuffled every session
- **Keyboard shortcuts** — N/P (next/prev), A–E (select option), F (flag), S (end exam)
- **Question navigator** — Bottom panel grouped by subject, colour-coded by status
- **Image support** — Questions and answer options can have diagrams/images
- **Admin dashboard** — Full question management, statistics, subject/year registry, Aiken import
- **License system** — Per-device 30-day activation codes, tracked via Supabase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 29 |
| UI | React 18 + Vite |
| Database | SQLite via better-sqlite3 |
| License backend | Supabase (PostgreSQL REST) |
| Packaging | electron-builder |

---

## Getting Started (Development)

### Prerequisites

- Node.js 20+
- npm 9+

### Install and run

```bash
git clone <repo-url>
cd jamb-cbt
npm install
npm run dev
```

> **Note:** If you are running inside Claude Code (or any Electron-based terminal), the `ELECTRON_RUN_AS_NODE` environment variable may be set and will prevent Electron from launching its GUI. The `dev` script automatically unsets it using `env -u ELECTRON_RUN_AS_NODE electron .`

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Electron |
| `npm run build` | Build React app only (Vite) |
| `npm run dist` | Build production app for current platform |
| `npm run dist:win` | Cross-compile Windows installer from Linux |
| `npm run seed` | Seed sample questions into the database |

---

## Project Structure

```
jamb-cbt/
├── electron/
│   ├── main.js          # Main process — IPC handlers, DB, license logic
│   ├── preload.js       # Context bridge (exposes APIs to renderer)
│   └── supabase.js      # Supabase REST client + machine fingerprint
├── src/
│   ├── App.jsx          # Root — screen router, license gate, admin auth
│   ├── screens/
│   │   ├── HomeScreen.jsx
│   │   ├── SubjectSelectScreen.jsx
│   │   ├── ExamScreen.jsx
│   │   ├── ResultScreen.jsx
│   │   ├── AdminScreen.jsx
│   │   ├── AdminLoginScreen.jsx
│   │   └── LicenseScreen.jsx
│   └── components/
│       ├── QuestionPanel.jsx   # Renders question text, images, options
│       └── Timer.jsx
├── questions/
│   ├── jamb.db          # SQLite database (questions, results, licenses)
│   ├── diagrams/        # Question/option image files
│   └── seed.js          # Sample data seeder
├── public/
│   ├── icon.png         # App icon (Linux/Mac)
│   └── icon.ico         # App icon (Windows)
├── supabase-setup.sql   # SQL to run in Supabase to create tables
└── .github/workflows/
    └── build-win.yml    # GitHub Actions Windows build
```

---

## Admin Guide

### Accessing the Admin Dashboard

**On an already-activated device:**
1. From the Home screen, click **⚙ Admin** in the footer
2. Enter credentials:
   - **Username:** `logicyte`
   - **Password:** `cbt++`
3. Click **Login**

**On a device with no active license (first setup):**
1. On the activation screen, press **Ctrl + Shift + A** (no visible button — this is a hidden shortcut)
2. Enter admin credentials
3. Click **Generate 30-Day Code** → **Activate This Device**
4. The app unlocks and opens the home screen

To **logout**, click the **⏻ Logout** button in the top-right of the Admin Dashboard.

---

### Managing Questions

From the Admin Dashboard → **Questions** tab:

- **Filter** by subject, year, or status (missing answers / has diagram)
- **Add** a new question with the **+ Add Question** button
- **Edit** any existing question by clicking the edit icon on its row
- **Delete** a question from the edit modal

Each question supports:
- Question text
- Up to 5 answer options (A–E)
- Correct answer selection
- Optional explanation
- Optional image for the question and/or each option (drag & drop or browse)

---

### Importing Questions (Aiken Format)

The **Import (Aiken)** tab lets you bulk-import questions from plain text.

**Aiken format:**
```
What is the capital of Nigeria?
A. Lagos
B. Abuja
C. Kano
D. Ibadan
ANSWER: B

Which gas is most abundant in the atmosphere?
A. Oxygen
B. Carbon dioxide
C. Nitrogen
D. Hydrogen
ANSWER: C
```

**Steps:**
1. Go to Admin → **Import (Aiken)** tab
2. Paste text directly or drag a `.txt` file onto the drop zone
3. Select the **Subject** and **Year** from the dropdowns
4. Review the parsed preview
5. Click **Import All** to save to the database

---

## License & Activation System

Every device must be activated with a 30-day code before students can use the app. Codes are generated by the admin and tracked in Supabase.

### Setting Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** → paste and run the contents of [`supabase-setup.sql`](supabase-setup.sql)
4. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
5. Open [`electron/supabase.js`](electron/supabase.js) and fill in lines 3–4:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

6. Rebuild the app: `npm run dist:win`

> If Supabase is not configured, the app falls back to offline HMAC-based validation. Codes still work — they just won't be tracked per-device.

### Activating a Device (Student)

1. Admin opens the Admin Dashboard → **License** tab
2. Optionally enter a note (student name or school)
3. Click **+ Generate Code** — a 30-day code is created and saved to Supabase
4. Share the code with the student (WhatsApp, paper, etc.)
5. Student opens the app, enters the code on the activation screen, clicks **Activate**

Each code activates exactly **one device**. If a student enters a code that is already used on a different machine, they will see an error.

### Offline Grace Period

Once a device has been activated online, it will continue working without internet for **7 days**. After 7 days offline, the app will require an internet connection to re-validate.

### Revoking a Device

1. Admin Dashboard → **License** tab
2. Find the code in the **Issued Licenses** list
3. Click **Revoke** next to the machine name
4. The device will be blocked on its next online check (within 7 days)

---

## Building for Windows

### Local Build (from Linux)

```bash
npm run dist:win
```
OR Directly from command line
```
sudo apt install build-essential gcc-multilib g++-multilib

npx electron-builder --win portable
```

This produces:
- `dist/JAMB CBT Practice-1.0.0-win.zip` — extract and run on Windows
- `dist/JAMB CBT Practice Setup 1.0.0.exe` — installer (requires wine32 for NSIS signing)

> The script automatically backs up the Linux `better-sqlite3` binary before the build and restores it afterwards, so your local dev environment is not affected.

### Fixing a corrupted better-sqlite3 binary (Linux)

If you ran `electron-builder --win` directly (without `npm run dist:win`) or the binary gets replaced with a Windows DLL, rebuild it for Linux:

```bash
env -u ELECTRON_RUN_AS_NODE npx @electron/rebuild -f -w better-sqlite3
```

> Required packages: `sudo apt install build-essential gcc-multilib g++-multilib`

### GitHub Actions Build

Push to `main` or go to **Actions → Build Electron Windows App → Run workflow**.

The workflow (`.github/workflows/build-win.yml`) runs on a real Windows machine, producing a clean `.exe` installer and `.zip`. Download from the **Artifacts** section of the completed run.

> Make sure your Supabase credentials are baked into `electron/supabase.js` before building — they are embedded in the app bundle.

---

## Exam Rules

These match the official JAMB CBT format:

| Mode | Subjects | Questions | Time |
|---|---|---|---|
| Mock Exam | English (required) + 3 others | 60 (English) + 40 each = 180 total | 120 minutes |
| Practice | 1 subject | 40 questions | 30 minutes |

### Keyboard Shortcuts (during exam)

| Key | Action |
|---|---|
| `N` or `→` | Next question |
| `P` or `←` | Previous question |
| `A` `B` `C` `D` `E` | Select answer option |
| `F` | Flag / unflag question |
| `S` | Open End Exam dialog |
