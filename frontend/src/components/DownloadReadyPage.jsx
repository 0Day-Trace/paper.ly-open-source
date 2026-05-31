import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, Download, House } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useServerConfig } from '../context/ServerConfigContext'
import { getRetentionHours, getStorageNotice } from '../config'
import StorageNotice from './StorageNotice'

import { downloadRemoteFile, cleanDownloadFilename, toAbsoluteUrl } from '../download'

const getExpiryMs = (createdAt, retentionHours) => {
  if (retentionHours == null) return null
  const created = createdAt ? new Date(createdAt).getTime() : Date.now()
  return created + retentionHours * 60 * 60 * 1000
}

const formatCountdown = (ms) => {
  if (ms == null) return null
  if (ms <= 0) return 'File has expired'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `Expires in ${h}h ${m}m ${s}s`
}

const triggerDownload = (url, fileName) => downloadRemoteFile(url, fileName)

export default function DownloadReadyPage({ data, onBackHome }) {
  const config = useServerConfig()
  const retentionHours = getRetentionHours(config)
  const storageNotice = getStorageNotice(config)
  const [tick, setTick] = useState(Date.now())
  const [autoDone, setAutoDone] = useState(false)
  const [autoFailed, setAutoFailed] = useState(false)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 560)

  const displayFileName = useMemo(
    () => cleanDownloadFilename(data?.fileName, data?.url),
    [data?.fileName, data?.url]
  )

  const qrUrl = useMemo(() => {
    const absoluteUrl = toAbsoluteUrl(data?.url || '')
    const encoded = encodeURIComponent(absoluteUrl)
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`
  }, [data?.url])

  const expiresAtMs = useMemo(
    () => getExpiryMs(data?.createdAt, retentionHours),
    [data?.createdAt, retentionHours]
  )
  const timeLeftMs = expiresAtMs == null ? null : Math.max(0, expiresAtMs - tick)
  const countdownLabel = formatCountdown(timeLeftMs)

  useEffect(() => {
    if (retentionHours == null) return undefined
    const timer = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [retentionHours])

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 560)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!data?.url || !displayFileName || autoDone) return
    const run = async () => {
      try {
        await triggerDownload(data.url, displayFileName)
        setAutoDone(true)
        setAutoFailed(false)
        toast.success('Download started')
      } catch {
        setAutoDone(false)
        setAutoFailed(true)
      }
    }
    run()
  }, [data, displayFileName, autoDone])

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        minHeight: '100vh',
        paddingTop: 'var(--header-height, 64px)',
        paddingBottom: isNarrow ? 24 : 42,
        paddingLeft: isNarrow ? 16 : 24,
        paddingRight: isNarrow ? 16 : 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 660,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: isNarrow ? 20 : 28,
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}
        >
          <CheckCircle2 size={30} color="var(--accent)" />
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--text)' }}>
              Download ready
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-3)' }}>
              Your file is ready to download.
            </p>
          </div>
        </motion.div>

        {storageNotice.mode !== 'official' && (
          <div style={{ marginBottom: 14 }}>
            <StorageNotice compact />
          </div>
        )}

        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 14px',
          background: 'var(--surface-2)',
          marginBottom: 16,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>Output file</p>
          <p style={{
            margin: '3px 0 0',
            fontSize: 15,
            color: 'var(--text)',
            fontWeight: 500,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            lineHeight: 1.4,
          }}>
            {displayFileName}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            Created via {data?.toolLabel}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            onClick={async () => {
              try {
                await triggerDownload(data?.url, displayFileName)
                setAutoFailed(false)
                toast.success('Download started')
              } catch {
                setAutoFailed(true)
                toast.error('Could not start download')
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 14,
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Download size={15} />
            Download manually
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data?.url || '')
                toast.success('Link copied')
              } catch {
                toast.error('Copy failed')
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Copy size={15} />
            Copy link
          </button>

          <button
            type="button"
            onClick={onBackHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <House size={15} />
            Back to tools
          </button>
        </div>

        {(autoFailed || !autoDone) && (
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-3)' }}>
            Auto-download may be blocked by your browser. Use "Download manually" if needed.
          </p>
        )}

        <div style={{
          display: 'grid',
          gap: 14,
          alignItems: 'center',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1fr) auto',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Scan to download on any device</p>
            {countdownLabel ? (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#0A84FF', fontWeight: 700, whiteSpace: isNarrow ? 'normal' : 'nowrap', lineHeight: 1.35 }}>
                {countdownLabel}
              </p>
            ) : (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: storageNotice.accent, fontWeight: 600, lineHeight: 1.35 }}>
                {storageNotice.message}
              </p>
            )}
          </div>
          <div style={{
            width: 140,
            height: 140,
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img
              src={qrUrl}
              alt="Download QR code"
              style={{ width: 124, height: 124, objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>
    </motion.main>
  )
}
