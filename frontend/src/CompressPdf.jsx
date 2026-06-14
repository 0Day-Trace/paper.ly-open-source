import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { Minimize2 } from 'lucide-react'
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
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
      setResult({ originalSize: file.size, compressedSize: compressedSize || 0 })
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const savings = result?.compressedSize
    ? Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100))
    : null

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#059669', theme)
  const slowWarning = useSlowWarning(loading)

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Compressing your PDF">
        <DropZone
          file={file}
          onFile={handleFile}
          accent={accent}
          id="compress-input"
        />

        {/* Result card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${accent}33`,
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original</p>
              <p style={{ fontSize: 18, color: 'var(--text)', fontWeight: 500, margin: 0 }}>{formatSize(result.originalSize)}</p>
            </div>
            <div style={{ fontSize: 18, color: 'var(--text-3)' }}>→</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compressed</p>
              <p style={{ fontSize: 18, color: accent, fontWeight: 500, margin: 0 }}>{formatSize(result.compressedSize)}</p>
            </div>
            {savings !== null && (
              <div style={{
                background: 'var(--surface-2)',
                border: `1px solid ${accent}44`,
                borderRadius: 12,
                padding: '8px 16px',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                <p style={{ color: accent, fontSize: 16, fontWeight: 600, margin: 0 }}>-{savings}%</p>
                <p style={{ fontSize: 11, color: accent, margin: '2px 0 0', opacity: 0.7 }}>saved</p>
              </div>
            )}
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
    </ToolShell>
  )
}
