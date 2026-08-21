import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { Minimize2, Download } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import useTheme from './hooks/useTheme'
import { resolveAccent } from './toolUi'
import useSlowWarning from './hooks/useSlowWarning'

const formatSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export default function CompressPdf({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#059669', theme)
  const slowWarning = useSlowWarning(loading)

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleCompress = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    setLoading(true)
    setError('')
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('preset', 'ebook')
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/compress`, formData)
      const compressedSize = parseInt(response.headers['x-compressed-size'] || 0)
      const { url, file_name, created_at } = response.data
      // Show result metrics first, then let user trigger the next step
      setResult({
        originalSize: file.size,
        compressedSize: compressedSize || 0,
        url,
        file_name,
        created_at,
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!result) return
    if (onComplete) {
      onComplete({ url: result.url, file_name: result.file_name, created_at: result.created_at })
    } else {
      await downloadRemoteFile(result.url, result.file_name)
    }
  }

  const savings = result?.compressedSize && result?.originalSize
    ? Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100))
    : null

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Compressing your PDF">
      <DropZone
        file={file}
        onFile={handleFile}
        accent={accent}
        id="compress-input"
      />

      {/* Compression result card */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface)',
            border: `1px solid ${accent}33`,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {/* Metrics row */}
          <div style={{
            padding: 'clamp(14px, 4vw, 20px) clamp(14px, 4vw, 20px) clamp(10px, 3vw, 16px)',
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(8px, 2.5vw, 16px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <div style={{ 
              flex: '1 1 clamp(75px, 20vw, 90px)', 
              textAlign: 'center', 
              minWidth: 'clamp(70px, 18vw, 80px)',
              maxWidth: '120px'
            }}>
              <p style={{ 
                fontSize: 'clamp(9px, 2.2vw, 11px)', 
                color: 'var(--text-3)', 
                margin: '0 0 clamp(2px, 1vw, 4px)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em' 
              }}>Original</p>
              <p style={{ 
                fontSize: 'clamp(14px, 3.5vw, 18px)', 
                color: 'var(--text)', 
                fontWeight: 500, 
                margin: 0,
                lineHeight: 1.2
              }}>{formatSize(result.originalSize)}</p>
            </div>

            <div style={{ 
              fontSize: 'clamp(14px, 3.5vw, 20px)', 
              color: 'var(--text-3)', 
              flexShrink: 0,
              lineHeight: 1
            }}>→</div>

            <div style={{ 
              flex: '1 1 clamp(75px, 20vw, 90px)', 
              textAlign: 'center', 
              minWidth: 'clamp(70px, 18vw, 80px)',
              maxWidth: '120px'
            }}>
              <p style={{ 
                fontSize: 'clamp(9px, 2.2vw, 11px)', 
                color: 'var(--text-3)', 
                margin: '0 0 clamp(2px, 1vw, 4px)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em' 
              }}>Compressed</p>
              <p style={{ 
                fontSize: 'clamp(14px, 3.5vw, 18px)', 
                color: accent, 
                fontWeight: 500, 
                margin: 0,
                lineHeight: 1.2
              }}>{formatSize(result.compressedSize)}</p>
            </div>

            {savings !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 320, damping: 22 }}
                style={{
                  background: `${accent}18`,
                  border: `1px solid ${accent}44`,
                  borderRadius: 'clamp(10px, 3vw, 14px)',
                  padding: 'clamp(8px, 2.5vw, 12px) clamp(12px, 4vw, 18px)',
                  textAlign: 'center',
                  flexShrink: 0,
                  minWidth: 'clamp(80px, 22vw, 100px)',
                  maxWidth: '140px'
                }}
              >
                <p style={{ 
                  color: accent, 
                  fontSize: 'clamp(16px, 4.5vw, 22px)', 
                  fontWeight: 700, 
                  margin: 0, 
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1
                }}>−{savings}%</p>
                <p style={{ 
                  fontSize: 'clamp(9px, 2.2vw, 11px)', 
                  color: accent, 
                  margin: 'clamp(1px, 0.5vw, 2px) 0 0', 
                  opacity: 0.75, 
                  fontWeight: 400,
                  lineHeight: 1.2
                }}>file size reduced</p>
              </motion.div>
            )}
          </div>

          {/* Action row */}
          <div style={{
            borderTop: `1px solid ${accent}22`,
            padding: 'clamp(10px, 2.5vw, 14px) clamp(14px, 4vw, 20px)',
            background: `${accent}08`,
          }}>
            <button
              onClick={handleDownload}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                gap: 'clamp(6px, 2vw, 8px)',
                background: accent,
                border: 'none', borderRadius: 'var(--radius-sm)',
                color: 'white',
                padding: 'clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)', 
                fontSize: 'clamp(14px, 3.5vw, 15px)', 
                fontWeight: 500,
                transition: 'opacity 0.15s',
                lineHeight: 1.2,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Download size={15} strokeWidth={2} />
              <span>Download compressed PDF</span>
            </button>
          </div>
        </motion.div>
      )}

      {error && (
        <div style={{
          background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--danger-text)', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {slowWarning && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
          {slowWarning}
        </p>
      )}

      {/* Compress button — only shown before a result exists */}
      {!result && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCompress}
          disabled={loading || !file}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: !file ? 'var(--surface-2)' : 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius)',
            color: !file ? 'var(--text-3)' : 'white',
            padding: '14px 28px', cursor: !file || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', width: '100%',
          }}
        >
          <Minimize2 size={17} strokeWidth={1.8} />
          {loading ? 'Compressing…' : 'Compress PDF'}
        </motion.button>
      )}
    </ToolShell>
  )
}
