/** UUID prefix added server-side to avoid filename clashes on disk. */
const STORAGE_UUID_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i

function basenameFromUrl(url) {
  if (!url) return ''
  try {
    const path = new URL(url, window.location.origin).pathname
    return decodeURIComponent(path.split('/').pop() || '')
  } catch {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] || '')
  }
}

/** Remove storage UUID prefix and return a user-friendly download name. */
export function cleanDownloadFilename(preferredName, url) {
  const strip = (name) => {
    if (!name) return ''
    const base = String(name).split(/[/\\]/).pop().split('?')[0]
    try {
      return decodeURIComponent(base).replace(STORAGE_UUID_PREFIX, '')
    } catch {
      return base.replace(STORAGE_UUID_PREFIX, '')
    }
  }

  const fromPreferred = strip(preferredName)
  if (fromPreferred) return fromPreferred

  const fromUrl = strip(basenameFromUrl(url))
  if (fromUrl) return fromUrl

  return 'download'
}

/** Resolve a potentially-relative URL to an absolute URL. */
export function toAbsoluteUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Append ?download=cleanname to a URL so the server (or Supabase) returns
 * Content-Disposition: attachment; filename="cleanname".
 * Works with Supabase public storage URLs out of the box.
 */
export function withDownloadParam(url, cleanName) {
  if (!url || !cleanName) return url
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined)
    parsed.searchParams.set('download', cleanName)
    return parsed.toString()
  } catch {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}download=${encodeURIComponent(cleanName)}`
  }
}

/**
 * Download a file with the correct clean filename — no fetch, no blob, no RAM.
 *
 * For same-origin backend URLs: the server already sends Content-Disposition
 * via send_file(as_attachment=True), the ?download param is just ignored.
 *
 * For Supabase public URLs: appending ?download=filename tells Supabase to
 * respond with Content-Disposition: attachment; filename="filename", so the
 * file saves with the clean name directly from Supabase — no backend proxy.
 */
export async function downloadRemoteFile(url, preferredName) {
  if (!url) throw new Error('Missing download URL')
  const cleanName = cleanDownloadFilename(preferredName, url)
  const absoluteUrl = toAbsoluteUrl(url)
  const downloadUrl = withDownloadParam(absoluteUrl, cleanName)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = cleanName
  document.body.appendChild(a)
  a.click()
  a.remove()
}
