import React, { useMemo, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
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

  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 })
  const handleMouseMove = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setTooltipPos({ left: rect.left + rect.width / 2, top: rect.top })
    }
  }

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
        onMouseMove={handleMouseMove}
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

      {/* Thumbnail tooltip — full page preview, no crop */}
      {hovered && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            top: tooltipPos.top - 12,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {loadingThumb
                  ? <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                }
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
              Page {page}
            </span>
          </div>
          {/* Arrow */}
          <div style={{
            width: 8,
            height: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(45deg)',
            margin: '-4px auto 0',
          }} />
        </div>
      )}
    </div>
  )
}

export default function SplitPdf({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [ranges, setRanges] = useState([{ id: 1, value: '', error: '' }])
  const [selectedPages, setSelectedPages] = useState({})
  const [mode, setMode] = useState('range')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent, theme) || 'var(--accent)'
  const slowWarning = useSlowWarning(loading)

  const selectedCount = useMemo(() => Object.keys(selectedPages || {}).length, [selectedPages])

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setUploading(true)
    setError('')
    setSelectedPages({})
    setRanges([{ id: 1, value: '', error: '' }])
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

  const validateRange = (value) => {
    if (!pageCount) return ''
    if (!value.trim()) return 'Range is required.'
    const parts = value.split('-').map((p) => p.trim())
    if (parts.length === 1) {
      const n = parseInt(parts[0], 10)
      if (Number.isNaN(n)) return 'Invalid page.'
      if (n < 1 || n > pageCount) return `Pages must be 1-${pageCount}.`
    } else if (parts.length === 2) {
      const a = parseInt(parts[0], 10)
      const b = parseInt(parts[1], 10)
      if (Number.isNaN(a) || Number.isNaN(b)) return 'Invalid format.'
      if (a < 1 || b > pageCount) return `Pages must be 1-${pageCount}.`
      if (a > b) return 'Start must be ≤ end.'
    } else {
      return 'Use format 1-3 or 5.'
    }
    return ''
  }

  const addRange = () => setRanges((prev) => [...prev, { id: Date.now(), value: '', error: '' }])
  const removeRange = (id) => setRanges((prev) => prev.filter((r) => r.id !== id))
  const updateRange = (id, value) => setRanges((prev) => prev.map((r) => (r.id === id ? { ...r, value, error: '' } : r)))

  const togglePage = (p) => {
    setSelectedPages((prev) => {
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
    setRanges([{ id: 1, value: '', error: '' }])
    setSelectedPages({})
    setMode('range')
    setError('')
  }

  const handleSplit = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    if (!pageCount) { setError('Still reading pages.'); return }
    setError('')

    let finalRanges = []
    if (mode === 'range') {
      let hasError = false
      const validated = ranges.map((r) => {
        const err = validateRange(r.value)
        if (err) hasError = true
        return { ...r, error: err }
      })
      setRanges(validated)
      if (hasError) return
      finalRanges = validated.map((r) => r.value.trim())
    } else {
      const pages = Object.keys(selectedPages).map(Number).sort((a, b) => a - b)
      if (!pages.length) { setError('Select at least one page.'); return }
      finalRanges = pages.map((p) => `${p}`)
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', getUserId())
    finalRanges.forEach((r) => formData.append('ranges', r))

    try {
      const response = await axios.post(`${API_BASE}/split`, formData)
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

  const canSplit = !!pageCount && (mode === 'range' || selectedCount > 0)

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Splitting your PDF">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {!file ? (
        <DropZone
          id="split-pdf-input"
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

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ key: 'range', label: 'Ranges' }, { key: 'pages', label: 'Pages' }].map((m) => {
              const active = mode === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  style={{
                    border: `1.5px solid ${active ? accent : 'var(--border)'}`,
                    background: active ? `${accent}12` : 'var(--surface)',
                    borderRadius: 999,
                    padding: '7px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? accent : 'var(--text-2)',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-ui)',
                    outline: 'none',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Ranges panel */}
          {pageCount && mode === 'range' && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 14,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                Use formats like <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>1-3</span> or <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>5</span>.
              </p>
              {ranges.map((r) => (
                <div key={r.id}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={r.value}
                      onChange={(e) => updateRange(r.id, e.target.value)}
                      placeholder="e.g. 1-3"
                      style={{
                        flex: 1,
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '9px 12px',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        outline: 'none',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 13,
                      }}
                    />
                    {ranges.length > 1 && (
                      <button
                        onClick={() => removeRange(r.id)}
                        style={{
                          width: 36, height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--text-2)',
                          flexShrink: 0,
                          outline: 'none',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {r.error && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#DC2626' }}>{r.error}</p>}
                </div>
              ))}
              <button
                onClick={addRange}
                style={{
                  alignSelf: 'flex-start',
                  border: `1.5px dashed ${accent}88`,
                  background: 'transparent',
                  borderRadius: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--text-2)',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              >
                + Add range
              </button>
            </div>
          )}

          {/* Pages picker */}
          {pageCount && mode === 'pages' && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 14,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                Hover to preview · click to select
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 6 }}>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <PageButton
                    key={p}
                    page={p}
                    active={!!selectedPages[p]}
                    accent={accent}
                    file={file}
                    firstThumbnail={p === 1 ? thumbnail : null}
                    onToggle={() => togglePage(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error / slow warning */}
          {error && <p style={{ margin: 0, fontSize: 13, color: '#DC2626' }}>{error}</p>}
          {slowWarning && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>{slowWarning}</p>}

          {/* Action button — same as all other tools */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSplit}
            disabled={loading || !canSplit}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              borderRadius: 'var(--radius)',
              padding: '13px 18px',
              border: `1px solid ${canSplit ? 'var(--accent)' : 'var(--border)'}`,
              background: primaryActionBg(canSplit),
              color: primaryActionColor(canSplit),
              cursor: loading || !canSplit ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.75 : 1,
              boxShadow: canSplit ? `0 10px 30px ${accent}22` : 'none',
              transition: 'all 0.18s ease',
              outline: 'none',
            }}
          >
            {loading ? 'Splitting…' : 'Split PDF'}
          </motion.button>
        </div>
      )}
    </ToolShell>
  )
}
