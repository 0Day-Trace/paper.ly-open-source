import React from 'react'
import { Clock } from 'lucide-react'
import { useServerConfig } from '../context/ServerConfigContext'
import { getToolActionNotice } from '../config'

export default function ToolActionNotice() {
  const config = useServerConfig()
  const text = getToolActionNotice(config)
  if (!text) return null

  return (
    <p style={{
      margin: '4px 0 0',
      fontSize: 12,
      color: 'var(--text-2)',
      fontWeight: 400,
      lineHeight: 1.45,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
    }}>
      <Clock size={13} style={{ flexShrink: 0, marginTop: 1, opacity: 0.75 }} />
      <span>{text}</span>
    </p>
  )
}
