import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Check, CheckCircle2, XCircle, Shield, SlidersHorizontal } from 'lucide-react'
import ToolShell from './components/ToolShell'
import DropZone from './components/DropZone'
import { infoCalloutStyle, resolveAccent } from './toolUi'
import useTheme from './hooks/useTheme'
import useSlowWarning from './hooks/useSlowWarning'

const PERMISSIONS = [
  { key: 'printing',      label: 'Printing',      desc: 'Allow printing' },
  { key: 'copying',       label: 'Copying',        desc: 'Copy/paste text' },
  { key: 'editing',       label: 'Editing',        desc: 'Modify content' },
  { key: 'signing',       label: 'Signing',        desc: 'Sign & annotate' },
  { key: 'assembly',      label: 'Assembly',       desc: 'Reorder pages' },
  { key: 'accessibility', label: 'Accessibility',  desc: 'Screen readers' },
]

export default function ProtectPdf({ onBack, tool, onComplete }) {
  const [file, setFile] = useState(null)
  const [userPass, setUserPass] = useState('')
  const [ownerPass, setOwnerPass] = useState('')
  const [preset, setPreset] = useState('block_all')
  const [permissions, setPermissions] = useState({
    printing: false, copying: false, editing: false,
    signing: false, assembly: false, accessibility: false,
  })
  const [showUserPass, setShowUserPass] = useState(false)
  const [showOwnerPass, setShowOwnerPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 520)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#7C3AED', theme)
  const slowWarning = useSlowWarning(loading)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 520)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handlePreset = (p) => {
    setPreset(p)
    if (p === 'block_all') setPermissions({ printing: false, copying: false, editing: false, signing: false, assembly: false, accessibility: false })
    if (p === 'allow_all') setPermissions({ printing: true, copying: true, editing: true, signing: true, assembly: true, accessibility: true })
  }

  const togglePermission = (key) => {
    setPreset('custom')
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getPasswords = () => {
    const u = userPass.trim(); const o = ownerPass.trim()
    if (u && !o) return { user: u, owner: u }
    if (!u && o) return { user: o, owner: o }
    return { user: u, owner: o }
  }

  const handleProtect = async () => {
    if (!file) { setError('Please select a PDF.'); return }
    const { user, owner } = getPasswords()
    if (!user) { setError('Enter at least one password.'); return }
    setLoading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_pass', user)
    formData.append('owner_pass', owner)
    formData.append('preset', preset)
    formData.append('user_id', getUserId())
    if (preset === 'custom') Object.entries(permissions).forEach(([k, v]) => formData.append(k, v))
    try {
      const response = await axios.post(`${API_BASE}/protect`, formData)
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

  const allowedCount = Object.values(permissions).filter(Boolean).length

  const inputStyle = {
    width: '100%', background: 'var(--surface-2)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', padding: '11px 44px 11px 14px',
    fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const presetIconBadge = (isActive, tone) => ({
    width: isMobile ? 24 : 30,
    height: isMobile ? 24 : 30,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: isActive ? `${tone}22` : 'var(--surface)',
    border: `1.5px solid ${isActive ? `${tone}88` : 'var(--border-strong)'}`,
    color: isActive ? tone : 'var(--text-2)',
    boxShadow: isActive ? `0 0 0 1px ${tone}33` : 'none',
  })

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <DropZone
          file={file}
          onFile={f => { setFile(f); setError('') }}
          accent={accent}
          id="protect-input"
        />

        {/* Passwords */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: 0 }}>
            Passwords
            <span style={{ fontWeight: 300, color: 'var(--text-3)', marginLeft: 6 }}>· skip one to use same for both</span>
          </p>
          {[
            { label: 'User password', hint: 'required to open', val: userPass, set: setUserPass, show: showUserPass, toggle: () => setShowUserPass(p => !p), id: 'user-pass' },
            { label: 'Owner password', hint: 'required to modify', val: ownerPass, set: setOwnerPass, show: showOwnerPass, toggle: () => setShowOwnerPass(p => !p), id: 'owner-pass' },
          ].map(field => (
            <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor={field.id} style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>
                {field.label} <span style={{ color: 'var(--text-3)' }}>· {field.hint}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={field.id}
                  type={field.show ? 'text' : 'password'}
                  placeholder="Enter password…"
                  value={field.val}
                  onChange={e => field.set(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = accent}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={field.toggle} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', display: 'flex', alignItems: 'center',
                }}>
                  {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Permissions */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: 0 }}>Permissions</p>

          {/* Preset buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 6 : 8 }}>
            {[
              { id: 'block_all', label: 'Block all', activeColor: '#DC2626', activeBg: 'rgba(220, 38, 38, 0.16)' },
              { id: 'allow_all', label: 'Allow all', activeColor: '#16A34A', activeBg: 'rgba(22, 163, 74, 0.16)' },
            ].map(p => {
              const isActive = preset === p.id
              return (
                <button key={p.id} onClick={() => handlePreset(p.id)} style={{
                  flex: 1, minWidth: 0, padding: '14px 12px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isActive ? p.activeColor + '44' : 'var(--border)'}`,
                  background: isActive ? p.activeBg : 'var(--surface-2)',
                  color: isActive ? p.activeColor : 'var(--text-2)',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: isMobile ? 12 : 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s', whiteSpace: isMobile ? 'normal' : 'nowrap',
                }}>
                  <span style={presetIconBadge(isActive, p.activeColor)}>
                    {p.id === 'block_all'
                      ? <XCircle size={isMobile ? 14 : 18} strokeWidth={2.8} />
                      : <CheckCircle2 size={isMobile ? 14 : 18} strokeWidth={2.8} />}
                  </span>
                  {p.label}
                </button>
              )
            })}
            {/* Custom — inline toggle */}
            <button onClick={() => setPreset('custom')} style={{
              flex: 1, minWidth: 0, padding: '14px 12px', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${preset === 'custom' ? accent + '44' : 'var(--border)'}`,
              background: 'var(--surface-2)',
              color: preset === 'custom' ? accent : 'var(--text-2)', whiteSpace: isMobile ? 'normal' : 'nowrap',
              cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: isMobile ? 12 : 15, fontWeight: 700,
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span style={presetIconBadge(preset === 'custom', accent)}>
                <SlidersHorizontal size={isMobile ? 13 : 17} strokeWidth={2.8} />
              </span>
              Custom
            </button>
          </div>

          {/* Custom permission grid */}
          {preset === 'custom' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {PERMISSIONS.map(perm => {
                  const on = permissions[perm.key]
                  return (
                    <div key={perm.key} onClick={() => togglePermission(perm.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${on ? accent + '44' : 'var(--border)'}`,
                      background: 'var(--surface-2)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {/* Checkbox */}
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        border: `2px solid ${on ? accent : 'var(--border-strong)'}`,
                        background: on ? accent : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {on && <Check size={19} color="white" strokeWidth={3.4} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: on ? 700 : 500, color: on ? 'var(--text)' : 'var(--text-2)', margin: 0 }}>{perm.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontWeight: 300 }}>{perm.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Summary line */}
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontWeight: 300 }}>
            {preset === 'block_all' && 'All permissions blocked — maximum security'}
            {preset === 'allow_all' && 'All permissions allowed — minimum restrictions'}
            {preset === 'custom' && `${allowedCount} of 6 permissions allowed`}
          </p>
        </div>

        {/* Encryption badge */}
        <div style={{
          ...infoCalloutStyle(accent, theme),
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Shield size={16} color={accent} strokeWidth={1.8} />
          <div>
            <p style={{ fontSize: 13, color: accent, fontWeight: 500, margin: 0 }}>AES-256 Encryption</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', fontWeight: 300 }}>
              Military-grade encryption — the same standard banks use
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

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleProtect}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)',
            color: 'white', padding: '14px 28px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', width: '100%',
          }}
        >
          <Lock size={17} strokeWidth={1.8} />
          {loading ? 'Protecting…' : 'Protect PDF'}
        </motion.button>
    </ToolShell>
  )
}