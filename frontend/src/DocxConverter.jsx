import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
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

const FORMATS = [
  { id: 'pdf', label: 'PDF', desc: 'Best for sharing' },
  { id: 'jpg', label: 'JPG Images', desc: 'Clear quality, smaller files' },
  { id: 'png', label: 'PNG Images', desc: 'Lossless, high quality' },
]

export default function DocxConverter({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [outputFmt, setOutputFmt] = useState('pdf')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#1D4ED8', theme)

  const handleConvert = async () => {
    if (!file) { setError('Please select a file.'); return }
    setLoading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('output_format', outputFmt)
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/convert-docx`, formData)
      const { url, file_name, created_at } = response.data
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Conversion failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <DropZone
          file={file}
          onFile={f => { setFile(f); setError('') }}
          accept=".docx,.doc"
          acceptLabel="DOCX and DOC files"
          accent={accent}
          id="docx-input"
        />

        {/* Output format */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: 0 }}>Output format</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FORMATS.map(fmt => (
              <div
                key={fmt.id}
                onClick={() => setOutputFmt(fmt.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${outputFmt === fmt.id ? accent : 'var(--border)'}`,
                  background: outputFmt === fmt.id ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${outputFmt === fmt.id ? accent : 'var(--border-strong)'}`,
                  background: outputFmt === fmt.id ? accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}>
                  {outputFmt === fmt.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--surface)' }} />}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{fmt.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontWeight: 300 }}>{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {file && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>File size</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{formatSize(file.size)}</span>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--danger-text)', fontSize: 14 }}>
            {error}
          </div>
        )}

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
          <FileText size={17} strokeWidth={1.8} />
          {loading ? 'Converting…' : `Convert to ${FORMATS.find(f => f.id === outputFmt)?.label}`}
        </motion.button>
    </ToolShell>
  )
}
