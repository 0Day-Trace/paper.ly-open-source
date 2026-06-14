import React, { useMemo, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import { primaryActionBg, primaryActionColor } from './toolUi'
import useTheme from './hooks/useTheme'
import useSlowWarning from './hooks/useSlowWarning'
import { resolveAccent } from './toolUi'

const truncateFilename = (name, max = 28) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 3
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
}

/* ─── Page button with lazy-loaded thumbnail tooltip ─── */
function PageButton({ page, active, accent, file, onToggle, firstThumbnail }) {
  const [hovered, setHovered] = useState(false)
  const [thumb, setThumb] = useState(page === 1 ? firstThumbnail : null)
  const [loadingThumb, setLoadingThumb] = useState(false)
  const fetchedRef = useRef(page === 1 ? true : false)
  const btnRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 })

  const fetchThumb = useCallback(async () => {
    if (fetchedRef.current || !file) return
    fetchedRef.current = true
    setLoadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('page', page)
      const res = await axios.post(`${API_BASE}/page-thumbnail`, fd, { timeout: 15000 })
      setThumb(res.data.thumbnail || null)
    } catch {
      /* silently fail */
    } finally {
      setLoadingThumb(false)
    }
  }, [file, page])

  const handleMouseEnter = () => {
    setHovered(true)
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setTooltipPos({ left: rect.left + rect.width / 2, top: rect.top })
    }
    fetchThumb()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={onToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          height: 44,
          borderRadius: 12,
          border: `1.5px solid ${active ? accent : 'var(--border)'}`,
          background: active ? `${accent}18` : 'var(--surface-2)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? accent : 'var(--text-2)',
          transition: 'all 0.15s',
          fontFamily: 'var(--font-ui)',
          outline: 'none',
        }}
      >
        {page}
      </button>

      {/* Thumbnail tooltip — full page, no crop */}
      {hovered && (
        <div style={{
          position: 'fixed',
          left: tooltipPos.left,
          top: tooltipPos.top - 12,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
          }}>
            {thumb ? (
              <img
                src={`data:image/png;base64,${thumb}`}
                alt={`Page ${page}`}
                style={{
                  width: 180,
                  height: 'auto',
                  display: 'block',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              />
            ) : (
              <div style={{
                width: 180,
                height: 234,
                borderRadius: 8,
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loadingThumb
                  ? <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                }
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>Page {page}</span>
          </div>
          <div style={{
            width: 8, height: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
            margin: '-4px auto 0',
          }} />
        </div>
      )}
    </div>
  )
}

export default function RemovePages({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [pagesToRemove, setPagesToRemove] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#EA580C', theme)
  const slowWarning = useSlowWarning(loading)

  const removeCount = useMemo(() => Object.keys(pagesToRemove || {}).length, [pagesToRemove])

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setUploading(true)
    setError('')
    setPagesToRemove({})
    setPageCount(null)
    setThumbnail(null)

    const formData = new FormData()
    formData.append('file', f)
    formData.append('user_id', getUserId())
    try {
      const res = await axios.post(`${API_BASE}/pagecount`, formData, { timeout: 15000 })
      setPageCount(res.data.pages || null)
      setThumbnail(res.data.thumbnail || null)
    } catch {
      setError('Could not read the PDF.')
    } finally {
      setUploading(false)
    }
  }

  const togglePage = (p) => {
    setPagesToRemove((prev) => {
      const next = { ...prev }
      if (next[p]) delete next[p]
      else next[p] = true
      return next
    })
  }

  const reset = () => {
    setFile(null)
    setPageCount(null)
    setThumbnail(null)
    setPagesToRemove({})
    setError('')
  }

  const handleRemove = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    if (!pageCount) { setError('Still reading pages.'); return }
    if (!removeCount) { setError('Select at least one page to remove.'); return }
    setError('')

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', getUserId())
    Object.keys(pagesToRemove).forEach((p) => formData.append('pages', p))

    try {
      const response = await axios.post(`${API_BASE}/remove-pages`, formData)
      const { url, file_name, created_at } = response.data
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const canRemove = !!pageCount && removeCount > 0

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Removing selected pages">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {!file ? (
        <DropZone
          id="remove-pages-input"
          file={file}
          onFile={handleFile}
          accept=".pdf,application/pdf"
          acceptLabel="PDF files only"
          accent={accent}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* File bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '12px 14px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {thumbnail ? (
              <img
                src={`data:image/png;base64,${thumbnail}`}
                alt="Preview"
                style={{ width: 36, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface-2)' }}
              />
            ) : (
              <div style={{ width: 36, height: 48, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {truncateFilename(file.name)}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 300, color: 'var(--text-3)' }}>
                {uploading ? 'Loading…' : pageCount ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` : 'Reading…'}
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 10,
                padding: '6px 12px',
                cursor: 'pointer',
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 400,
                flexShrink: 0,
                fontFamily: 'var(--font-ui)',
                outline: 'none',
              }}
            >
              Change
            </button>
          </div>

          {/* Pages grid */}
          {pageCount ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 14,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                Hover to preview · click to select for removal
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 6 }}>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <PageButton
                    key={p}
                    page={p}
                    active={!!pagesToRemove[p]}
                    accent={accent}
                    file={file}
                    firstThumbnail={p === 1 ? thumbnail : null}
                    onToggle={() => togglePage(p)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Error / slow warning */}
          {error && <p style={{ margin: 0, fontSize: 13, color: '#DC2626' }}>{error}</p>}
          {slowWarning && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>{slowWarning}</p>}

          {/* Action button — identical to all other tools */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRemove}
            disabled={loading || !canRemove}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              borderRadius: 'var(--radius)',
              padding: '13px 18px',
              border: `1px solid ${canRemove ? 'var(--accent)' : 'var(--border)'}`,
              background: primaryActionBg(canRemove),
              color: primaryActionColor(canRemove),
              cursor: loading || !canRemove ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.75 : 1,
              boxShadow: canRemove ? `0 10px 30px ${accent}22` : 'none',
              transition: 'all 0.18s ease',
              outline: 'none',
            }}
          >
            {loading ? 'Removing…' : `Remove page${removeCount !== 1 ? 's' : ''}${removeCount > 0 ? ` · ${removeCount} selected` : ''}`}
          </motion.button>
        </div>
      )}
    </ToolShell>
  )
}
