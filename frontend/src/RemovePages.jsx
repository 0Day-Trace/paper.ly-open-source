import React, { useMemo, useState } from 'react'
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

  return (
    <ToolShell tool={tool} onBack={onBack}>
      <style>{`
        .remove-pages-layout {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .remove-pages-layout {
            grid-template-columns: 1fr;
          }
        }
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
        <div className="remove-pages-layout">
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

            {pageCount ? (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: 16,
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: 'var(--text-3)' }}>
                  Select pages to remove.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 8, marginTop: 12 }}>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                    const active = !!pagesToRemove[p]
                    return (
                      <button
                        key={p}
                        onClick={() => togglePage(p)}
                        style={{
                          height: 44,
                          borderRadius: 14,
                          border: `1px solid ${active ? accent : 'var(--border)'}`,
                          background: active ? 'rgba(234, 88, 12, 0.12)' : 'var(--surface-2)',
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
            ) : null}
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
                Export · {removeCount} selected
              </p>
              {error ? <p style={{ margin: '10px 0 0', fontSize: 13, color: '#DC2626' }}>{error}</p> : null}
              {slowWarning && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
                  {slowWarning}
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRemove}
                disabled={loading || !pageCount || removeCount === 0}
                style={{
                  marginTop: 12,
                  width: '100%',
                  borderRadius: 18,
                  padding: '13px 16px',
                  border: `1px solid ${!pageCount || removeCount === 0 ? 'var(--border)' : 'var(--accent)'}`,
                  background: primaryActionBg(!!pageCount && removeCount > 0),
                  color: primaryActionColor(!!pageCount && removeCount > 0),
                  cursor: loading || !pageCount || removeCount === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: loading ? 0.75 : 1,
                  boxShadow: !pageCount || removeCount === 0 ? 'none' : `0 10px 30px ${accent}22`,
                  transition: 'all 0.18s ease',
                }}
              >
                {loading ? 'Removing…' : 'Remove pages'}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}

