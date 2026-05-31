import React from 'react'
import { Server, ShieldCheck } from 'lucide-react'
import { useServerConfig } from '../context/ServerConfigContext'
import { getStorageNotice } from '../config'
import OrganizationIcon from './OrganizationIcon'

const ICONS = {
  selfhost: Server,
  official: ShieldCheck,
}

export default function StorageNotice({ compact = false }) {
  const config = useServerConfig()
  const notice = getStorageNotice(config)
  const Icon = ICONS[notice.mode] || ShieldCheck

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: 14,
      border: `1px solid ${notice.accent}44`,
      background: notice.mode === 'official' ? 'var(--accent-light)' : `${notice.accent}1a`,boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        border: `1px solid ${notice.accent}33`,
        color: notice.accent,
      }}>
        {notice.mode === 'organization' ? (
          <OrganizationIcon size={18} color={notice.accent} />
        ) : (
          <Icon size={16} strokeWidth={2} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: notice.accent,
        }}>
          {notice.title}
        </p>
        <p style={{
          margin: '4px 0 0',
          fontSize: 13,
          lineHeight: 1.45,
          color: 'var(--text-2)',
          fontWeight: 400,
        }}>
          {notice.message}
        </p>
      </div>
    </div>
  )
}
