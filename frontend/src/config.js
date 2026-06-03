import deploymentFile from './deployment.config.json'

const trimSlash = (url) => (url || '').replace(/\/$/, '')

/** Edit deployment.config.json to change how this instance behaves. */
export const DEPLOYMENT_SETTINGS = deploymentFile

export const OFFICIAL_API_URL = trimSlash(
  DEPLOYMENT_SETTINGS.officialApiUrl
  || 'https://paper-ly.onrender.com'
)

/** Backend URL — deployment.config.json apiBaseUrl, then REACT_APP_API_URL */
export const API_BASE = trimSlash(
  process.env.REACT_APP_API_URL
  || DEPLOYMENT_SETTINGS.apiBaseUrl
  || 'http://localhost:5000'
)

export const GITHUB_URL = process.env.REACT_APP_GITHUB_URL
  || DEPLOYMENT_SETTINGS.githubUrl
  || 'https://github.com/0Day-Trace/paper.ly-open-source'

export const ORG_DISPLAY_NAME = process.env.REACT_APP_ORG_NAME
  || DEPLOYMENT_SETTINGS.organizationName
  || 'your organization'

const UI = DEPLOYMENT_SETTINGS.ui || {}

export function getUserId() {
  let id = localStorage.getItem('pdf_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pdf_user_id', id)
  }
  return id
}

/** True when the app or API URL points at this machine (used for auto mode only). */
export function isLocalDevContext() {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const api = API_BASE.toLowerCase()
  return (
    host === 'localhost' || host === '127.0.0.1'
    || api.includes('localhost') || api.includes('127.0.0.1')
  )
}

function resolveDeploymentFromFile() {
  const mode = (DEPLOYMENT_SETTINGS.deployment || 'auto').toLowerCase()
  if (mode === 'official' || mode === 'selfhost' || mode === 'organization') {
    return mode
  }
  return null
}

/** Client-side deployment before /config loads */
export function detectClientDeployment() {
  const fromFile = resolveDeploymentFromFile()
  if (fromFile) return fromFile

  const forced = (process.env.REACT_APP_DEPLOYMENT || '').toLowerCase()
  if (forced === 'official' || forced === 'selfhost' || forced === 'organization') {
    return forced
  }

  if (isLocalDevContext()) return 'selfhost'

  const api = API_BASE.toLowerCase()

  if (api.includes('paper-ly.onrender') || trimSlash(API_BASE) === OFFICIAL_API_URL) {
    return 'official'
  }

  return 'organization'
}

/** UI mode — explicit official/organization in config is never overridden by localhost. */
export function resolveDeployment(config) {
  const fromFile = resolveDeploymentFromFile()
  if (fromFile === 'official' || fromFile === 'organization' || fromFile === 'selfhost') {
    return fromFile
  }
  if (isLocalDevContext()) return 'selfhost'
  return config?.deployment || detectClientDeployment()
}

function buildDefaultConfig() {
  const deployment = detectClientDeployment()
  const limits = DEPLOYMENT_SETTINGS.limits || {}
  const hasLimitsKey = Object.prototype.hasOwnProperty.call(DEPLOYMENT_SETTINGS, 'limits')

  // If limits block exists in config, use its enabled flag exactly.
  // If limits block is absent entirely, default to true for official, false otherwise.
  const limitsEnabled = hasLimitsKey
    ? Boolean(limits.enabled)
    : deployment === 'official'

  // If limits are disabled, all 3 sub-values are irrelevant — force null.
  // If limits are enabled, read from config (preserving explicit null) before
  // falling back to the official-deployment defaults.
  const has = (key) => Object.prototype.hasOwnProperty.call(limits, key)

  const retention_hours  = !limitsEnabled ? null : has('retentionHours') ? limits.retentionHours  : (deployment === 'official' ? 6   : null)
  const max_file_size_mb = !limitsEnabled ? null : has('maxFileSizeMb')  ? limits.maxFileSizeMb   : (deployment === 'official' ? 200 : null)
  const daily_file_limit = !limitsEnabled ? null : has('dailyFileLimit') ? limits.dailyFileLimit  : (deployment === 'official' ? 10  : null)

  return {
    deployment,
    organization_name: ORG_DISPLAY_NAME,
    storage_mode: 'local',
    limits_enabled: limitsEnabled,
    retention_hours,
    max_file_size_mb,
    daily_file_limit,
    ui: UI,
  }
}

export const DEFAULT_SERVER_CONFIG = buildDefaultConfig()

export function mergeServerConfig(remote) {
  if (!remote || typeof remote !== 'object') return { ...DEFAULT_SERVER_CONFIG }

  const fromFile = resolveDeploymentFromFile()
  const orgName = remote.organization_name || ORG_DISPLAY_NAME

  const merged = {
    ...DEFAULT_SERVER_CONFIG,
    ...remote,
    organization_name: orgName,
    deployment: fromFile || remote.deployment || DEFAULT_SERVER_CONFIG.deployment,
    ui: { ...UI, ...(remote.ui || {}) },
  }

  return {
    ...merged,
    deployment: resolveDeployment(merged),
  }
}

export function getOrgDisplayName(config) {
  return config?.organization_name || ORG_DISPLAY_NAME
}

export function getRetentionHours(config) {
  const h = config?.retention_hours
  return h == null ? null : Number(h)
}

export function formatTimeLeft(createdAt, retentionHours) {
  if (retentionHours == null) return null
  const expires = new Date(new Date(createdAt).getTime() + retentionHours * 60 * 60 * 1000)
  const diff = expires - new Date()
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function getStorageNotice(config) {
  const mode = resolveDeployment(config)
  const orgName = getOrgDisplayName(config)
  const ui = config?.ui || UI

  if (mode === 'selfhost') {
    return {
      mode,
      title: 'Self-hosted',
      message: 'Downloads and file storage are managed by your server.',
      accent: ui.selfhostAccent || '#0D9488',
    }
  }

  if (mode === 'organization') {
    return {
      mode,
      title: 'Organization managed',
      message: `Privacy and downloads are managed by ${orgName}.`,
      accent: ui.organizationAccent || '#D97706',
    }
  }

  const retentionHours = getRetentionHours(config)
  if (!config?.limits_enabled || retentionHours == null) {
    return {
      mode: 'official',
      title: 'Temporary storage',
      message: 'Files are stored temporarily and will be deleted.',
      accent: 'var(--accent)',
    }
  }
  return {
    mode: 'official',
    title: 'Temporary storage',
    message: `Files are available for ${retentionHours} hours, then automatically deleted.`,
    accent: 'var(--accent)',
  }
}

export function getRecentFilesSubtitle(config) {
  const mode = resolveDeployment(config)
  const orgName = getOrgDisplayName(config)
  if (mode === 'official') {
    if (!config?.limits_enabled) return 'Stored temporarily'
    const hours = getRetentionHours(config)
    return hours != null ? `Available for ${hours} hours` : 'Temporarily stored'
  }
  if (mode === 'selfhost') {
    return 'Managed by your self-hosted server'
  }
  return `Managed by ${orgName}`
}

export function getToolActionNotice(config) {
  if (!config?.limits_enabled) return null
  const hours = getRetentionHours(config)
  if (hours == null) return null
  return `Files are automatically deleted after ${hours} hours.`
}
