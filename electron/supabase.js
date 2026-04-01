// ── Supabase config ───────────────────────────────────────────────────────────
// Fill these in after creating your free Supabase project at https://supabase.com
const SUPABASE_URL = 'https://ugkaokalkajdxtkggdau.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_altP-RMpAeXvcD0i322Uuw_Yda2M9Mk'

// Offline grace period: if no internet, trust last online validation for this many days
const GRACE_DAYS = 7

// ── Machine fingerprint ───────────────────────────────────────────────────────
const os = require('os')
const crypto = require('crypto')

function getMachineId() {
  // Stable per-machine hash: primary MAC + hostname
  const interfaces = os.networkInterfaces()
  const macs = []
  for (const iface of Object.values(interfaces)) {
    for (const entry of iface) {
      if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
        macs.push(entry.mac)
      }
    }
  }
  macs.sort()
  const raw = `${os.hostname()}::${macs[0] || 'no-mac'}::${os.platform()}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function getMachineName() {
  return os.hostname()
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────
// Uses native fetch (available in Node 18+ / Electron 22+) — no extra packages needed

async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Activate a license code for this machine online.
 * Returns { ok, expiry, daysLeft, machineId } or { error }
 */
async function activateOnline(code) {
  const machineId = getMachineId()
  const machineName = getMachineName()
  const now = new Date().toISOString()

  // 1. Fetch the license row
  const licenses = await sbFetch(`/licenses?code=eq.${encodeURIComponent(code)}&select=*`)
  if (!licenses || licenses.length === 0) return { error: 'Invalid license code — not found in system.' }
  const license = licenses[0]

  // 2. Check expiry
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(license.expiry)
  if (expiry < today) return { error: `License expired on ${expiry.toLocaleDateString()}.` }

  // 3. Check if this machine already has an activation for this code
  const existing = await sbFetch(
    `/activations?license_code=eq.${encodeURIComponent(code)}&machine_id=eq.${machineId}&select=id`
  )
  if (existing && existing.length > 0) {
    // Already registered — just update last_seen and return ok
    await sbFetch(`/activations?license_code=eq.${encodeURIComponent(code)}&machine_id=eq.${machineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_seen: now }),
    })
    const daysLeft = Math.ceil((expiry - today) / 86400000)
    return { ok: true, expiry: license.expiry, daysLeft, machineId }
  }

  // 4. Count current activations for this code
  const allActivations = await sbFetch(
    `/activations?license_code=eq.${encodeURIComponent(code)}&select=id`
  )
  const count = allActivations ? allActivations.length : 0
  if (count >= license.max_devices) {
    return { error: `This code has already been activated on ${count} device(s) (limit: ${license.max_devices}). Contact your administrator.` }
  }

  // 5. Register this machine
  await sbFetch('/activations', {
    method: 'POST',
    body: JSON.stringify({
      license_code: code,
      machine_id: machineId,
      machine_name: machineName,
      activated_at: now,
      last_seen: now,
    }),
  })

  const daysLeft = Math.ceil((expiry - today) / 86400000)
  return { ok: true, expiry: license.expiry, daysLeft, machineId }
}

/**
 * Re-validate an already-activated machine online (refresh last_seen).
 * Returns { valid, expiry, daysLeft } or { valid: false, reason }
 */
async function revalidateOnline(code, machineId) {
  try {
    const licenses = await sbFetch(`/licenses?code=eq.${encodeURIComponent(code)}&select=*`)
    if (!licenses || licenses.length === 0) return { valid: false, reason: 'license_not_found' }
    const license = licenses[0]

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const expiry = new Date(license.expiry)
    if (expiry < today) return { valid: false, reason: 'expired', expiry: license.expiry }

    // Check this machine is still registered
    const act = await sbFetch(
      `/activations?license_code=eq.${encodeURIComponent(code)}&machine_id=eq.${machineId}&select=id`
    )
    if (!act || act.length === 0) return { valid: false, reason: 'machine_not_registered' }

    // Update last_seen
    await sbFetch(`/activations?license_code=eq.${encodeURIComponent(code)}&machine_id=eq.${machineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_seen: new Date().toISOString() }),
    })

    const daysLeft = Math.ceil((expiry - today) / 86400000)
    return { valid: true, expiry: license.expiry, daysLeft }
  } catch {
    return null // null = offline / network error
  }
}

/**
 * Create a license in Supabase (admin only).
 * Returns { ok, code } or { error }
 */
async function createLicenseOnline(code, expiry, maxDevices, note) {
  try {
    await sbFetch('/licenses', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify({ code, expiry, max_devices: maxDevices, note }),
    })
    return { ok: true, code }
  } catch (e) {
    // Already exists with same code — that's fine
    if (e.message.includes('duplicate') || e.message.includes('unique')) return { ok: true, code }
    return { error: e.message }
  }
}

/**
 * List all licenses and their activation counts (admin).
 */
async function listLicensesOnline() {
  const licenses = await sbFetch('/licenses?select=*,activations(id,machine_name,activated_at,last_seen)&order=created_at.desc')
  return licenses || []
}

/**
 * Revoke an activation (admin).
 */
async function revokeActivation(activationId) {
  await sbFetch(`/activations?id=eq.${activationId}`, { method: 'DELETE' })
  return { ok: true }
}

module.exports = {
  getMachineId,
  getMachineName,
  activateOnline,
  revalidateOnline,
  createLicenseOnline,
  listLicensesOnline,
  revokeActivation,
  GRACE_DAYS,
  isConfigured: () => SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co',
}
