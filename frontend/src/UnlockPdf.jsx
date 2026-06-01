import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Unlock } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import { infoCalloutStyle, resolveAccent } from './toolUi'
import useTheme from './hooks/useTheme'
import useSlowWarning from './hooks/useSlowWarning'

export default function UnlockPdf({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#DB2777', theme)
  const slowWarning = useSlowWarning(loading, 'Unlocking — please wait…', 5000)

  const handleUnlock = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    if (!password) { setError('Enter the password.'); return }
    setLoading(true); setError(''); setSuccess(false)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('password', password)
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/unlock`, formData)
      const { url, file_name, created_at } = response.data
      if (onComplete) {
        onComplete({ url, file_name, created_at })
      } else {
        await downloadRemoteFile(url, file_name)
      }
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Wrong password or file is not encrypted.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <DropZone
          file={file}
          onFile={f => { setFile(f); setSuccess(false); setError('') }}
          acceptLabel="Password-protected PDF only"
          accent={accent}
          id="unlock-input"
        />

        {/* Password input */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
            PDF Password
            <span style={{ fontWeight: 300, color: 'var(--text-3)', marginLeft: 6 }}>· user or owner password</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Enter password…"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              style={{
                width: '100%', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text)', padding: '11px 44px 11px 14px',
                fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => setShowPass(p => !p)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', display: 'flex', alignItems: 'center',
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Info badge */}
        <div style={{ ...infoCalloutStyle(accent, theme), display: 'flex', alignItems: 'center', gap: 10 }}>
          <Unlock size={16} color={accent} strokeWidth={1.8} />
          <div>
            <p style={{ fontSize: 13, color: accent, fontWeight: 500, margin: 0 }}>Removes all encryption</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', fontWeight: 300 }}>
              Output PDF will have no password or restrictions
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--danger-text)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {slowWarning && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
            {slowWarning}
          </p>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--success-text)', fontSize: 14, textAlign: 'center' }}
          >
            PDF unlocked and downloaded successfully.
          </motion.div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleUnlock}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)',
            color: 'white', padding: '14px 28px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', width: '100%',
          }}
        >
          <Unlock size={17} strokeWidth={1.8} />
          {loading ? 'Unlocking…' : 'Unlock PDF'}
        </motion.button>
    </ToolShell>
  )
}