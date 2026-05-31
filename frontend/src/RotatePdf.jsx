import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { RotateCw, Download } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import useTheme from './hooks/useTheme'
import { resolveAccent } from './toolUi'

const formatSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

const trunc = (name, max = 28) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 2
  return base.slice(0, Math.ceil(keep / 2)) + '..' + base.slice(-Math.floor(keep / 2)) + ext
}

const nextRotation = (r) => (r + 90) % 360

export default function RotatePdf({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([])
  const [loadingThumb, setLoadingThumb] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#7C3AED', theme)

  const loadThumbnails = async (f) => {
    setLoadingThumb(true); setError(''); setDone(false)
    try {
      const countForm = new FormData()
      countForm.append('file', f)
      const countRes = await axios.post(`${API_BASE}/pagecount`, countForm)
      const total = countRes.data.pages
      const firstThumb = countRes.data.thumbnail
      const arr = Array.from({ length: total }, () => ({ thumb: null, rotation: 0 }))
      arr[0].thumb = firstThumb
      const BATCH = 8
      for (let start = 1; start < total; start += BATCH) {
        const batch = []
        for (let i = start; i < Math.min(start + BATCH, total); i++) {
          const pf = new FormData(); pf.append('file', f); pf.append('page', i + 1)
          batch.push(axios.post(`${API_BASE}/page-thumbnail`, pf).then(r => ({ i, thumb: r.data.thumbnail })).catch(() => ({ i, thumb: null })))
        }
        const results = await Promise.all(batch)
        results.forEach(({ i, thumb }) => { arr[i].thumb = thumb })
        setPages([...arr])
      }
      setPages([...arr])
    } catch (err) {
      setError('Could not load PDF preview. ' + (err.response?.data?.error || err.message))
    } finally {
      setLoadingThumb(false)
    }
  }

  const handleFile = async (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Only .pdf files are supported.'); return }
    setFile(f); setPages([])
    await loadThumbnails(f)
  }

  const rotatePage = (idx) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, rotation: nextRotation(p.rotation) } : p))
  }
  const rotateAll = (angle) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + angle) % 360 })))
  }
  const resetAll = () => setPages(prev => prev.map(p => ({ ...p, rotation: 0 })))

  const hasChanges = pages.some(p => p.rotation !== 0)
  const rotatedCount = pages.filter(p => p.rotation !== 0).length
  const totalPages = pages.length

  const handleDownload = async () => {
    if (!file || !hasChanges) return
    setLoading(true); setError(''); setDone(false)
    const rotations = pages.map((p, i) => ({ page: i + 1, angle: p.rotation })).filter(p => p.angle !== 0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('rotations', JSON.stringify(rotations))
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/rotate-pdf`, formData)
      const { url, file_name, created_at } = response.data
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolShell tool={tool} onBack={onBack}>
      <style>{`
        @keyframes pulse-sk { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .sk { animation: pulse-sk 1.4s ease-in-out infinite; background: var(--surface-2); border-radius: 6px; }
        .page-grid-r { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        .page-card-r:hover .rot-hint { opacity: 1 !important; }
        @media(max-width:480px) { .page-grid-r { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; } }
      `}</style>

      {/* File zone / compact bar */}
      {!file ? (
        <DropZone
          file={file}
          onFile={handleFile}
          accent={accent}
          id="rotate-input"
        />
      ) : (
        <div style={{
          background: 'var(--surface)', border: `1px solid ${accent}44`,
          borderRadius: 'var(--radius)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0,
        }}>
          <RotateCw size={16} color={accent} strokeWidth={1.8} />
          <p style={{ color: accent, fontSize: 14, fontWeight: 500, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trunc(file.name)}
          </p>
          <span style={{ color: 'var(--text-3)', fontSize: 12, flexShrink: 0 }}>{formatSize(file.size)}</span>
          <button
            onClick={() => { setFile(null); setPages([]); setDone(false); setError('') }}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-3)', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 12,
            }}
          >
            Change
          </button>
          <input id="rotate-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Bulk action bar */}
      {totalPages > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 400 }}>All pages:</span>
          {[90, 180, 270].map(a => (
            <button key={a} onClick={() => rotateAll(a)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-2)', padding: '5px 11px',
              cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <RotateCw size={11} /> {a}°
            </button>
          ))}
          {hasChanges && (
            <button onClick={resetAll} style={{
              background: 'none', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, color: '#DC2626', padding: '5px 11px',
              cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
              marginLeft: 'auto',
            }}>
              Reset all
            </button>
          )}
          {rotatedCount > 0 && (
            <span style={{ fontSize: 12, color: accent, fontWeight: 500 }}>
              {rotatedCount} page{rotatedCount > 1 ? 's' : ''} rotated
            </span>
          )}
        </div>
      )}

      {/* Skeleton */}
      {loadingThumb && (
        <div className="page-grid-r" style={{ marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="sk" style={{ width: '100%', aspectRatio: '3/4' }} />
              <div className="sk" style={{ width: '60%', height: 12, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      )}

      {/* Page thumbnail grid */}
      {!loadingThumb && pages.length > 0 && (
        <div className="page-grid-r" style={{ marginTop: 16 }}>
          {pages.map((page, idx) => (
            <div
              key={idx}
              className="page-card-r"
              onClick={() => rotatePage(idx)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              title={`Click to rotate page ${idx + 1}`}
            >
              <div style={{
                position: 'relative', width: '100%', background: 'var(--surface)',
                borderRadius: 10, overflow: 'hidden',
                border: `1.5px solid ${page.rotation !== 0 ? accent + '88' : 'var(--border)'}`,
                transition: 'border-color 0.2s', aspectRatio: '3/4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: page.rotation !== 0 ? `0 2px 8px ${accent}22` : 'var(--shadow-sm)',
              }}>
                {page.thumb ? (
                  <img
                    src={`data:image/png;base64,${page.thumb}`}
                    alt={`Page ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.25s ease' }}
                  />
                ) : (
                  <div className="sk" style={{ width: '100%', height: '100%' }} />
                )}
                {/* Rotation hint overlay */}
                <div className="rot-hint" style={{
                  position: 'absolute', bottom: 5, right: 5, width: 24, height: 24,
                  borderRadius: '50%', background: accent + 'dd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: page.rotation !== 0 ? 1 : 0, transition: 'opacity 0.15s',
                }}>
                  <RotateCw size={11} color="white" />
                </div>
                {/* Rotation badge */}
                {page.rotation !== 0 && (
                  <div style={{
                    position: 'absolute', top: 4, left: 4, background: accent,
                    borderRadius: 5, padding: '1px 6px', fontSize: 10,
                    color: 'white', fontWeight: 600, fontFamily: 'var(--font-ui)',
                  }}>
                    {page.rotation}°
                  </div>
                )}
              </div>
              <span style={{ color: page.rotation !== 0 ? accent : 'var(--text-3)', fontSize: 11, transition: 'color 0.2s' }}>
                pg {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--danger-text)', fontSize: 14, marginTop: 12 }}>
          {error}
        </div>
      )}
      {done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--success-text)', fontSize: 14, textAlign: 'center', marginTop: 12 }}>
          PDF rotated and downloaded.
        </motion.div>
      )}

      {/* Download button */}
      {totalPages > 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDownload}
          disabled={loading || !hasChanges}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: !hasChanges ? 'var(--surface-2)' : 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius)',
            color: !hasChanges ? 'var(--text-3)' : 'white',
            padding: '14px 28px', cursor: !hasChanges || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', width: '100%', marginTop: 16,
          }}
        >
          <Download size={17} strokeWidth={1.8} />
          {loading ? 'Processing…' : hasChanges ? `Download Rotated PDF${rotatedCount > 0 ? ` · ${rotatedCount} page${rotatedCount > 1 ? 's' : ''}` : ''}` : 'Rotate pages above to continue'}
        </motion.button>
      )}
    </ToolShell>
  )
}
