import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { ShieldOff } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import { infoCalloutStyle, primaryActionBg, primaryActionColor, tagPillStyle, resolveAccent } from './toolUi'
import useTheme from './hooks/useTheme'

export default function CleanMetadata({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#DC2626', theme)

  const handleClean = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    setLoading(true); setError(''); setSuccess(false)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/clean-metadata`, formData)
      const { url, file_name, created_at } = response.data
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const metaFields = ['Author', 'Creator', 'Producer', 'Creation date', 'Modification date', 'Keywords', 'Subject']

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <DropZone
          file={file}
          onFile={f => { setFile(f); setSuccess(false); setError('') }}
          accent={accent}
          id="cleanmeta-input"
        />

        {/* What gets removed */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fields removed
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {metaFields.map(f => (
              <span key={f} style={tagPillStyle(accent, theme)}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ ...infoCalloutStyle(accent, theme), display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <ShieldOff size={16} color={accent} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: accent, fontWeight: 500, margin: 0 }}>Privacy protection</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', fontWeight: 300 }}>
              All identifying metadata is permanently stripped. PDF content is unchanged.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--danger-text)', fontSize: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--success-text)', fontSize: 14, textAlign: 'center' }}>
            Metadata cleaned and file downloaded.
          </motion.div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleClean}
          disabled={loading || !file}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: primaryActionBg(!!file),
            border: 'none', borderRadius: 'var(--radius)',
            color: primaryActionColor(!!file),
            padding: '14px 28px', cursor: !file || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', width: '100%',
          }}
        >
          <ShieldOff size={17} strokeWidth={1.8} />
          {loading ? 'Cleaning…' : 'Clean Metadata'}
        </motion.button>
    </ToolShell>
  )
}
