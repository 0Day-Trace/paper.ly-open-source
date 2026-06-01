import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import StorageNotice from './StorageNotice'
import ToolActionNotice from './ToolActionNotice'
import useTheme from '../hooks/useTheme'
import { resolveAccent } from '../toolUi'

/** Shared max width for every tool's form column */
export const TOOL_CONTENT_WIDTH = 560

/**
 * ToolShell — shared wrapper for all tool pages
 * Props:
 *   tool     — tool metadata object from TOOLS array in App.jsx
 *   onBack   — function to navigate back to homepage
 *   children — tool-specific content
 */
export default function ToolShell({ tool, onBack, children }) {
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
