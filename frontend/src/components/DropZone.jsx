import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File } from 'lucide-react'

const formatSz = (bytes) => {
  if (!bytes) return 'N/A'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

const trunc = (name, max = 38) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 3
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
}

/**
 * DropZone — file upload zone
 * Props:
 *   accent — tool color for borders/icons (not used on primary actions)
 */
export default function DropZone({
  file,
  onFile,
  accept = '.pdf',
  acceptLabel = 'PDF files only',
  accent = '#0066CC',
  id = 'dz-input',
}) {
  const [drag, setDrag] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDrag(false)
    if (onFile && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0])
  }, [onFile])

  const handleChange = (e) => {
    if (onFile && e.target.files[0]) {
      onFile(e.target.files[0])
      e.target.value = ''
    }
  }

  const active = drag || !!file

  return (
    <div
      onClick={() => document.getElementById(id).click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={e => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDrag(false) }}
      onDrop={handleDrop}
      style={{
        border: `1.5px ${active ? 'solid' : 'dashed'} ${active ? accent : 'var(--border-strong)'}`,
        borderRadius: 20,
        padding: file ? '20px 28px' : '44px 28px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'var(--surface-2)' : file ? 'var(--surface-2)' : 'var(--dropzone-empty-bg)',
        transition: 'all 0.18s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {drag && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${accent}0a 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--surface)',
                border: `1px solid ${accent}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <File size={18} color={accent} strokeWidth={1.6} />
              </div>
              <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--text)',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', maxWidth: '100%',
                }}>
                  {trunc(file.name)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '3px 0 0', fontWeight: 300 }}>
                  {formatSz(file.size)} · click to change
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--surface-2)',
              border: `1px solid ${drag ? accent : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.18s',
            }}>
              <Upload size={22} color={accent} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: '0 0 5px' }}>
                Drop files here or click to browse
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, fontWeight: 300 }}>
                {acceptLabel}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
