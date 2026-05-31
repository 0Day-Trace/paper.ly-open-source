import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import { primaryActionBg, primaryActionColor } from './toolUi'
import useTheme from './hooks/useTheme'
import { resolveAccent } from './toolUi'

const truncateFilename = (name, max = 28) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 3
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
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
      const res = await axios.post(`${API_BASE}/pagecount`, formData)
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

  return (
    <ToolShell tool={tool} onBack={onBack}>
      <style>{`
        .split-layout {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .split-layout {
            grid-template-columns: 1fr;
          }
        }
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
        <div className="split-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              {thumbnail ? (
                <img
                  src={`data:image/png;base64,${thumbnail}`}
                  alt="Preview"
                  style={{ width: 46, height: 60, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: 46, height: 60, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {truncateFilename(file.name)}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                  {uploading ? 'Loading…' : pageCount ? `${pageCount} pages` : 'Reading pages…'}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  borderRadius: 14,
                  padding: '9px 12px',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: 400,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Change
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'range', label: 'Ranges' },
                { key: 'pages', label: 'Pages' },
              ].map((m) => {
                const active = mode === m.key
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    style={{
                      border: `1px solid ${active ? accent : 'var(--border)'}`,
                      background: active ? 'var(--surface-2)' : 'var(--surface)',
                      borderRadius: 999,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 400,
                      color: active ? 'var(--text)' : 'var(--text-2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>

            {pageCount && mode === 'range' && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: 16,
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
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        value={r.value}
                        onChange={(e) => updateRange(r.id, e.target.value)}
                        placeholder="e.g. 1-3"
                        style={{
                          flex: 1,
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          padding: '10px 12px',
                          background: 'var(--surface-2)',
                          color: 'var(--text)',
                          outline: 'none',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 14,
                        }}
                      />
                      {ranges.length > 1 && (
                        <button
                          onClick={() => removeRange(r.id)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-2)',
                          }}
                          title="Remove range"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    {r.error ? (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#DC2626' }}>{r.error}</p>
                    ) : null}
                  </div>
                ))}
                <button
                  onClick={addRange}
                  style={{
                    alignSelf: 'flex-start',
                    border: `1px dashed ${accent}`,
                    background: 'var(--surface-2)',
                    borderRadius: 14,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--text-2)',
                  }}
                >
                  Add range
                </button>
              </div>
            )}

            {pageCount && mode === 'pages' && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: 16,
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>Click pages to select.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 8, marginTop: 12 }}>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                    const active = !!selectedPages[p]
                    return (
                      <button
                        key={p}
                        onClick={() => togglePage(p)}
                        style={{
                          height: 44,
                          borderRadius: 14,
                          border: `1px solid ${active ? accent : 'var(--border)'}`,
                          background: active ? 'var(--surface)' : 'var(--surface-2)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: active ? 500 : 400,
                          color: active ? 'var(--text)' : 'var(--text-2)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                Export
                {mode === 'pages' ? ` · ${selectedCount} selected` : ''}
              </p>
              {error ? <p style={{ margin: '10px 0 0', fontSize: 13, color: '#DC2626' }}>{error}</p> : null}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSplit}
                disabled={loading || !pageCount}
                style={{
                  marginTop: 12,
                  width: '100%',
                  borderRadius: 18,
                  padding: '13px 16px',
                  border: `1px solid ${!pageCount ? 'var(--border)' : 'var(--accent)'}`,
                  background: primaryActionBg(!!pageCount),
                  color: primaryActionColor(!!pageCount),
                  cursor: loading || !pageCount ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: loading ? 0.75 : 1,
                  boxShadow: !pageCount ? 'none' : `0 10px 30px ${accent}22`,
                  transition: 'all 0.18s ease',
                }}
              >
                {loading ? 'Splitting…' : 'Split PDF'}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}

