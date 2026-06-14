import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import StorageNotice from './StorageNotice'
import ToolActionNotice from './ToolActionNotice'
import useTheme from '../hooks/useTheme'
import { resolveAccent } from '../toolUi'

/** Shared max width for every tool's form column */
export const TOOL_CONTENT_WIDTH = 560

/**
 * Full-screen processing overlay.
 * Matches the site's editorial feel: Instrument Serif headline, clean
 * glass-info card from the hero, no heavy chrome.
 */
function ProcessingOverlay({ visible, label, accent }) {
  const theme = useTheme()
  const isDark = theme === 'dark'
  const a = accent || 'var(--accent)'

  /* Mirror the hero info-card glass */
  const scrim   = isDark ? 'rgba(17,17,16,0.72)' : 'rgba(250,250,248,0.72)'
  const cardBg  = isDark ? 'rgba(28,28,26,0.90)' : 'rgba(255,255,255,0.80)'
  const border  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'

  /* Strip the verb suffix so we can show "Merging" + italic "your PDF…" */
  const base = (label || 'Processing…').replace(/…$/, '').replace(/\.$/, '')

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="proc-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          aria-label={label || 'Processing…'}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            background: scrim,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {/* Card — same glass recipe as hero info tiles */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 6,   scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              width: '100%',
              maxWidth: 360,
              boxSizing: 'border-box',
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 'clamp(20px,4vw,28px)',
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)'
                : '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '36px 32px 40px',
            }}
          >

            {/* ── Three-dot wave ── */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', height: 36 }}>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.18,
                  }}
                  style={{
                    display: 'block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: a,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* ── Spacer ── */}
            <div style={{ height: 32 }} />

            {/* ── Headline — Instrument Serif, italic accent word ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <p style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px,5vw,28px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3em',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--text)' }}>
                  {base.split(' ')[0]}
                </span>
                <span style={{ fontStyle: 'italic', color: a }}>
                  {base.split(' ').slice(1).join(' ') || 'your file'}
                </span>
              </p>
              <p style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: 'var(--text-3)',
                fontWeight: 400,
                lineHeight: 1.55,
              }}>
                Large files may take a moment.
              </p>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * ToolShell — shared wrapper for all tool pages
 * Props:
 *   tool          — tool metadata object from TOOLS array in App.jsx
 *   onBack        — function to navigate back to homepage
 *   loading       — boolean; when true shows the full-screen processing overlay
 *   loadingLabel  — optional string label shown in the overlay (default: "Processing…")
 *   children      — tool-specific content
 */
export default function ToolShell({ tool, onBack, children, loading = false, loadingLabel }) {
  const Icon = tool?.icon
  const theme = useTheme()
  const isDark = theme === 'dark'
  const accent = tool ? resolveAccent(tool.accent, theme) : null

  return (
    <div className="tool-shell" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-ui)',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>
      <ProcessingOverlay visible={loading} label={loadingLabel} accent={accent} />
      <div className="tool-shell-inner">

        {/* ── Breadcrumb nav ── */}
        <div className="tool-shell-breadcrumb">
          <motion.button
            onClick={onBack}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              color: 'var(--text-2)',
              padding: '7px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 400,
              transition: 'all 0.15s',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text)'
              e.currentTarget.style.background = 'var(--surface-2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-2)'
              e.currentTarget.style.background = 'var(--surface)'
            }}
          >
            <ArrowLeft size={13} strokeWidth={2} />
            All tools
          </motion.button>

          {tool && (
            <>
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-2)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0,
                }}
              >
                <ChevronRight size={18} strokeWidth={2.2} />
              </span>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: isDark ? `${accent}1a` : 'var(--surface-2)',
                border: `1px solid ${accent}33`,
                borderRadius: 20,
              }}>
                {Icon && <Icon size={12} color={accent} strokeWidth={1.8} />}
                <span style={{ fontSize: 13, color: accent, fontWeight: 500 }}>
                  {tool.label}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Tool hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ marginBottom: 36 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {tool && (
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: isDark ? `${accent}20` : 'var(--surface-2)',
                border: `1px solid ${accent}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${accent}28`,
              }}>
                {Icon && <Icon size={26} color={accent} strokeWidth={1.5} />}
              </div>
            )}
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 4vw, 40px)',
                fontWeight: 400,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: '0 0 6px',
              }}>
                {tool?.label}
              </h1>
              <p style={{
                fontSize: 15,
                color: 'var(--text-2)',
                fontWeight: 300,
                margin: 0,
                lineHeight: 1.5,
              }}>
                {tool?.desc}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Tool content ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.25, 0.1, 0.25, 1] }}
          className="tool-shell-content"
        >
          <StorageNotice />
          {children}
          <ToolActionNotice />
        </motion.div>
      </div>
    </div>
  )
}
