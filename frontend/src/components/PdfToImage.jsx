import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from '../config'
import { downloadRemoteFile } from '../download'
import { motion } from 'framer-motion'
import { Image } from 'lucide-react'
import ToolShell from './ToolShell'
import DropZone from './DropZone'
import useTheme from '../hooks/useTheme'
import { resolveAccent } from '../toolUi'
import useSlowWarning from '../hooks/useSlowWarning'

export default function PdfToImage({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [isPng, setIsPng] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fmt = isPng ? 'png' : 'jpg'

  const handleConvert = async () => {
    if (!file) { setError('Please select a PDF file.'); return }
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fmt', fmt)
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/pdf-to-image`, formData)
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

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#E53E3E', theme)
  const slowWarning = useSlowWarning(loading)

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <DropZone
          file={file}
          onFile={f => { setFile(f); setError('') }}
          accept=".pdf"
          acceptLabel="PDF files only"
          accent={accent}
          id="pdftoimage-input"
        />

        {/* Format toggle */}
        <div className="format-picker">
          <div className="format-picker-text">
            <p className="format-picker-label">Output format</p>
            <p className="format-picker-hint">
              {isPng ? 'PNG — lossless quality' : 'JPG — smaller file size'}
            </p>
          </div>
          <div className="format-picker-actions">
            {['JPG', 'PNG'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setIsPng(f === 'PNG')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: (f === 'PNG') === isPng ? accent : 'var(--border)',
                  background: (f === 'PNG') === isPng ? 'var(--surface-2)' : 'transparent',
                  color: (f === 'PNG') === isPng ? accent : 'var(--text-2)',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  transition: 'all 0.15s',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {slowWarning && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
            {slowWarning}
          </p>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
            color: 'var(--danger-text)', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Convert button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConvert}
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
          <Image size={17} strokeWidth={1.8} />
          {loading ? 'Converting…' : `Convert to ${fmt.toUpperCase()}`}
        </motion.button>
    </ToolShell>
  )
}
