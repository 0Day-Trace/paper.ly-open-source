import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bold, ChevronDown, FileImage, FileText,
  Image as ImageIcon, Italic, Underline, Upload,
} from 'lucide-react'
import { ColorWheel, ColorThumb, ColorWheelTrack, parseColor } from 'react-aria-components'
import ToolShell from './components/ToolShell'
import useTheme from './hooks/useTheme'
import { primaryActionBg, primaryActionColor, resolveAccent } from './toolUi'

const ACCENT = '#A78BFA'

/* ─── Icons ──────────────────────────────────────────────────── */
const StampIcon = ({ size = 20, color = 'currentColor', style }) => (
  <svg viewBox="0 0 50 50" width={size} height={size} style={style} fill={color} xmlns="http://www.w3.org/2000/svg">
    <rect x="1"  y="30" width="2" height="2"/><rect x="1"  y="34" width="2" height="2"/>
    <rect x="1"  y="38" width="2" height="2"/><rect x="1"  y="42" width="2" height="2"/>
    <rect x="5"  y="42" width="2" height="2"/><rect x="9"  y="42" width="2" height="2"/>
    <rect x="13" y="42" width="2" height="2"/><rect x="17" y="42" width="2" height="2"/>
    <rect x="21" y="42" width="2" height="2"/><rect x="25" y="42" width="2" height="2"/>
    <rect x="29" y="42" width="2" height="2"/><rect x="33" y="42" width="2" height="2"/>
    <rect x="37" y="42" width="2" height="2"/><rect x="5"  y="30" width="2" height="2"/>
    <rect x="9"  y="30" width="2" height="2"/>
    <path d="M5.748,22.323l0.402,3.65c0.042,0.377,0.292,0.697,0.647,0.829L41.453,39.61c0.113,0.041,0.23,0.062,0.347,0.062c0.25,0,0.495-0.094,0.684-0.271l2.679-2.511L5.748,22.323z"/>
    <path d="M27.26,9.911c0.286,1.736,0.557,3.376,0.119,4.56l-2.058,5.58c-0.063,0.15-0.078,0.25-0.013,0.404c0.245,0.568,1.295,1.277,2.612,1.764c0.016,0.006,0.026,0.019,0.042,0.026c1.913,0.742,3.995,0.726,4.223,0.167l2.189-5.937c0.465-1.183,1.612-2.153,2.722-3.091c0.507-0.429,1.02-0.865,1.429-1.288c0.396-0.551,0.738-1.104,0.94-1.651c0.697-1.886,0.702-3.655,0.014-5.115c-0.677-1.434-2.01-2.552-3.856-3.234c-1.849-0.683-3.587-0.701-5.035-0.051c-1.472,0.661-2.619,2.008-3.315,3.895c-0.192,0.518-0.278,1.131-0.312,1.785C27.013,8.399,27.139,9.18,27.26,9.911z"/>
    <path d="M49.404,20.898l-12.515-4.625c-0.297,0.317-0.531,0.625-0.645,0.913l-2.194,5.949c-0.509,1.248-1.808,1.685-3.248,1.685c-1.232,0-2.568-0.32-3.6-0.725c-0.017-0.007-0.027-0.021-0.043-0.028c-1.133-0.426-3.048-1.339-3.687-2.822c-0.273-0.637-0.276-1.305-0.009-1.933l2.039-5.534c0.138-0.374,0.126-0.993,0.052-1.694L12.925,7.417c-0.494-0.181-1.044,0.049-1.259,0.529L6.117,20.327l40.064,14.805l3.836-13.014C50.166,21.614,49.897,21.081,49.404,20.898z"/>
  </svg>
)

const LayersIcon = ({ size = 20, baseColor = 'currentColor', accentColor = ACCENT, mode }) => (
  <svg viewBox="0 0 72 72" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path fill={mode === 'under' ? accentColor : baseColor} d="M61.35,42.72c0.87,0.55,1.4,1.5,1.4,2.53c0,1.03-0.53,1.99-1.4,2.54L40.04,61.24c-0.81,0.51-1.73,0.77-2.66,0.77c-0.93,0-1.86-0.26-2.67-0.77L13.4,47.79c-0.87-0.55-1.4-1.51-1.4-2.54c0-1.03,0.53-1.98,1.4-2.53l0.25-0.16l18.93,11.93c1.44,0.91,3.1,1.39,4.8,1.39c1.7,0,3.35-0.48,4.79-1.39l18.92-11.93L61.35,42.72z"/>
    <path fill={baseColor} opacity="0.55" d="M62.75,35.13c0,1.03-0.53,1.99-1.4,2.54L40.04,51.11c-0.81,0.51-1.73,0.77-2.66,0.77c-0.93,0-1.86-0.26-2.67-0.77L13.4,37.67c-0.87-0.55-1.4-1.51-1.4-2.54c0-1.03,0.53-1.99,1.4-2.54l0.25-0.16l19.46,12.28c1.27,0.81,2.75,1.23,4.27,1.23s2.99-0.42,4.26-1.23c0.001-0.001,19.46-12.28,19.46-12.28l0.25,0.16C62.22,33.14,62.75,34.1,62.75,35.13z"/>
    <path fill={mode === 'over' ? accentColor : baseColor} d="M62.75,25.01c0,1.03-0.53,1.99-1.4,2.54L39.51,41.33c-0.65,0.41-1.39,0.61-2.13,0.61c-0.75,0-1.49-0.2-2.14-0.61L13.4,27.55C12.53,27,12,26.04,12,25.01c0-1.03,0.53-1.99,1.4-2.54L35.78,8.35c0.49-0.31,1.04-0.47,1.6-0.47c0.55,0,1.11,0.16,1.6,0.47l22.37,14.12C62.22,23.02,62.75,23.98,62.75,25.01z"/>
  </svg>
)

const FontIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width={size} height={size} fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
    <polyline points="14.5,22.5 9,7 3.5,22.5" />
    <line x1="5.5" y1="18" x2="12.5" y2="18" />
    <line x1="13" y1="23" x2="16" y2="23" />
    <line x1="2" y1="23" x2="5" y2="23" />
    <path d="M20,14c0,0,1.343-1,3-1h0c1.657,0,3,1.343,3,3v5c0,1.105,0.895,2,2,2h0" />
    <path d="M26,16c0,1.916-7,0.384-7,4.5c0,1.381,1.366,2.5,3.5,2.5c3.184,0,3.5-2,3.5-2" />
  </svg>
)

/* ─── Data ──────────────────────────────────────────────────── */
const POSITIONS = [
  { id: 'top-left',      label: 'Top left',      x: 18, y: 14 },
  { id: 'top-center',    label: 'Top center',    x: 50, y: 14 },
  { id: 'top-right',     label: 'Top right',     x: 82, y: 14 },
  { id: 'middle-left',   label: 'Middle left',   x: 18, y: 50 },
  { id: 'center',        label: 'Center',        x: 50, y: 50 },
  { id: 'middle-right',  label: 'Middle right',  x: 82, y: 50 },
  { id: 'bottom-left',   label: 'Bottom left',   x: 18, y: 86 },
  { id: 'bottom-center', label: 'Bottom center', x: 50, y: 86 },
  { id: 'bottom-right',  label: 'Bottom right',  x: 82, y: 86 },
]
const FONT_OPTIONS = ['Helvetica', 'Times Roman', 'Courier', 'Inter', 'DM Sans', 'Georgia']
const TRANSPARENCY_OPTIONS = [
  { label: 'None',   value: 100 },
  { label: 'Light',  value: 75 },
  { label: 'Medium', value: 45 },
  { label: 'Heavy',  value: 25 },
]
const ROTATION_OPTIONS = [
  { label: 'Horizontal ↔', value: 0 },
  { label: 'Diagonal ↗',   value: 45 },
  { label: 'Diagonal ↘',   value: -45 },
  { label: 'Vertical ↕',   value: 90 },
]
const COLOR_SWATCHES = [
  { hex: 'rgba(0,0,0,0.25)', display: '#888888', label: 'Grey (default)' },
  { hex: '#111111',          display: '#333333', label: 'Black' },
  { hex: '#FFFFFF',          display: '#FFFFFF', label: 'White' },
  { hex: '#DC2626',          display: '#DC2626', label: 'Red' },
  { hex: '#2563EB',          display: '#2563EB', label: 'Blue' },
  { hex: '#A78BFA',          display: '#A78BFA', label: 'Violet' },
  { hex: '#16A34A',          display: '#16A34A', label: 'Green' },
  { hex: '#D97706',          display: '#D97706', label: 'Amber' },
]
const MOSAIC_GRID = [
  { x: 18, y: 12 }, { x: 50, y: 12 }, { x: 82, y: 12 },
  { x: 18, y: 37 }, { x: 50, y: 37 }, { x: 82, y: 37 },
  { x: 18, y: 62 }, { x: 50, y: 62 }, { x: 82, y: 62 },
  { x: 18, y: 87 }, { x: 50, y: 87 }, { x: 82, y: 87 },
]
const FONT_MAP = {
  'Helvetica':   'Helvetica, Arial, sans-serif',
  'Times Roman': '"Times New Roman", Times, serif',
  'Courier':     '"Courier New", Courier, monospace',
  'Inter':       '"Inter", sans-serif',
  'DM Sans':     '"DM Sans", sans-serif',
  'Georgia':     'Georgia, serif',
}

const formatSize = b => {
  if (!b) return 'N/A'
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`
  if (b >= 1024)    return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}
const trunc = (name, max = 36) => {
  if (!name || name.length <= max) return name
  const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 3
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
}

/* ─── Style tokens ──────────────────────────────────────────── */
const LBL = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'var(--text-3)',
  display: 'block', marginBottom: 7,
}
const INPUT_BASE = {
  width: '100%', height: 38,
  border: '1px solid var(--border-strong)',
  borderRadius: 10, background: 'var(--surface)',
  color: 'var(--text)', padding: '0 12px',
  fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none',
  boxSizing: 'border-box',
}

/* ─── SelectField ───────────────────────────────────────────── */
function SelectField({ id, label, value, onChange, options, leftIcon }) {
  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      {label && <span style={LBL}>{label}</span>}
      <span style={{ position: 'relative', display: 'block' }}>
        <select
          id={id} value={value} onChange={e => onChange(e.target.value)}
          style={{
            ...INPUT_BASE,
            appearance: 'none', paddingRight: 28,
            paddingLeft: leftIcon ? 34 : 12, cursor: 'pointer',
          }}
        >
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        {leftIcon && (
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex',
          }}>
            {leftIcon}
          </span>
        )}
        <ChevronDown size={13} style={{
          position: 'absolute', right: 9, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none',
        }} />
      </span>
    </label>
  )
}

/* ─── 3×3 position grid ─────────────────────────────────────── */
function PositionGrid({ value, onChange, accent = ACCENT }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gap: 5 }}>
      {POSITIONS.map(p => {
        const on = p.id === value
        return (
          <button
            key={p.id} type="button" title={p.label}
            onClick={() => onChange(p.id)}
            style={{
              width: 30, height: 30,
              border: `1.5px solid ${on ? accent : 'var(--border-strong)'}`,
              borderRadius: 8, background: on ? `${accent}18` : 'var(--surface-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s', padding: 0,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: on ? accent : 'var(--border-strong)',
            }} />
          </button>
        )
      })}
    </div>
  )
}

/* ─── Color conversion helpers ──────────────────────────────── */
const hexToHsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
      default: h = 0
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToHex = (h, s, l) => {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

/* ─── Color wheel popup — compact tooltip-style, fixed to anchor ── */
function ColorWheelPopup({ value, onChange, onClose, anchorRef }) {
  const initHex = (!value || value.startsWith('rgba')) ? '#6366F1' : value
  const [hexDraft, setHexDraft] = useState(() => initHex.replace(/^#/, '').toUpperCase())
  // Keep a react-aria Color object for the wheel — only hue channel matters
  const [wheelColor, setWheelColor] = useState(() => {
    try { return parseColor(initHex) } catch { return parseColor('#6366F1') }
  })
  const [pos, setPos] = useState(null)
  const popRef = useRef(null)
  const POP_W = 210

  // ── Positioning ──────────────────────────────────────────────
  const reposition = useCallback(() => {
    if (!anchorRef?.current) return
    const r = anchorRef.current.getBoundingClientRect()
    let left = r.left + r.width / 2 - POP_W / 2
    left = Math.max(8, Math.min(left, window.innerWidth - POP_W - 8))
    const POP_H = 300
    const below = r.bottom + 8
    const top = below + POP_H < window.innerHeight ? below : r.top - POP_H - 8
    setPos({ top, left })
  }, [anchorRef])

  useEffect(() => {
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [reposition])

  // ── Close on outside click ───────────────────────────────────
  useEffect(() => {
    const h = e => { if (popRef.current && !popRef.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const commit = raw => {
    let s = raw.trim().replace(/^#+/, '')
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
    if (/^[0-9a-fA-F]{6}$/.test(s)) {
      const upper = s.toUpperCase()
      onChange(`#${upper}`)
      setHexDraft(upper)
      try { setWheelColor(parseColor(`#${upper}`)) } catch { /* ignore */ }
    }
  }

  const currentColor = /^[0-9a-fA-F]{6}$/.test(hexDraft) ? `#${hexDraft}` : '#6366F1'

  if (!pos) return null

  return ReactDOM.createPortal(
    <div
      ref={popRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        zIndex: 99999, width: POP_W,
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 14, padding: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column', gap: 10,
        userSelect: 'none',
      }}
    >
      {/* React Aria ColorWheel */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <ColorWheel
          value={wheelColor}
          onChange={(newColor) => {
            // newColor is a Color object — extract as hex
            try {
              const hex = newColor.toString('hex')
              // hex may include alpha (#RRGGBBAA) — take only first 6 chars after #
              const hex6 = hex.replace(/^#/, '').slice(0, 6).toUpperCase()
              onChange(`#${hex6}`)
              setHexDraft(hex6)
              setWheelColor(newColor)
            } catch { /* ignore */ }
          }}
          outerRadius={84}
          innerRadius={70}
        >
          <ColorWheelTrack />
          <ColorThumb
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </ColorWheel>
      </div>

      {/* Hex input row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: currentColor,
          border: '1.5px solid var(--border-strong)',
        }} />
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'var(--text-3)', fontWeight: 700,
            pointerEvents: 'none', fontFamily: 'monospace',
          }}>#</span>
          <input
            type="text" maxLength={6} spellCheck={false}
            value={hexDraft}
            onChange={e => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/gi, '').slice(0, 6)
              setHexDraft(raw.toUpperCase())
              if (raw.length === 6) {
                onChange(`#${raw.toUpperCase()}`)
                try { setWheelColor(parseColor(`#${raw.toUpperCase()}`)) } catch { /* ignore */ }
              }
            }}
            onBlur={() => commit(hexDraft)}
            onKeyDown={e => e.key === 'Enter' && commit(hexDraft)}
            onPaste={e => {
              e.preventDefault()
              const p = (e.clipboardData.getData('text') || '')
                .replace(/[^0-9a-fA-F#]/gi, '').replace(/^#+/, '').slice(0, 6)
              setHexDraft(p.toUpperCase())
              if (p.length === 6) {
                onChange(`#${p.toUpperCase()}`)
                try { setWheelColor(parseColor(`#${p.toUpperCase()}`)) } catch { /* ignore */ }
              }
            }}
            placeholder="RRGGBB"
            style={{
              ...INPUT_BASE, height: 34, paddingLeft: 24, paddingRight: 8,
              fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em',
              background: 'var(--surface-2)', borderRadius: 8,
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Color palette ─────────────────────────────────────────── */
function ColorPalette({ value, onChange, accent = ACCENT }) {
  const [showWheel, setShowWheel] = useState(false)
  const wrapRef     = useRef(null)   // anchor for popup positioning
  const isCustom    = !COLOR_SWATCHES.find(c => c.hex === value)
  const customColor = isCustom && value && !value.startsWith('rgba') ? value : '#6366F1'

  const swatchBtn = (key, display, isHex, on, title, onClick) => (
    <button
      key={key} type="button" title={title}
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `2px solid ${on ? accent : 'transparent'}`,
        padding: 2, cursor: 'pointer', background: 'transparent',
        outline: 'none', flexShrink: 0,
        boxShadow: on ? `0 0 0 1px ${accent}` : '0 0 0 1px var(--border-strong)',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
    >
      <span style={{
        display: 'block', width: '100%', height: '100%', borderRadius: '50%',
        background: display,
        boxShadow: isHex && display === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.18)' : undefined,
      }} />
    </button>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '6px 10px', gap: 4,
      flexWrap: 'nowrap', overflowX: 'auto',
    }}>
      {COLOR_SWATCHES.map(c =>
        swatchBtn(
          c.hex, c.display, true, c.hex === value, c.label,
          () => { onChange(c.hex); setShowWheel(false) }
        )
      )}
      {/* divider */}
      <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
      {/* custom / rainbow — anchor for popup */}
      <div ref={wrapRef} style={{ flexShrink: 0 }}>
        {swatchBtn(
          'custom',
          isCustom
            ? customColor
            : 'conic-gradient(hsl(0,90%,55%),hsl(60,90%,55%),hsl(120,90%,45%),hsl(180,90%,45%),hsl(240,90%,60%),hsl(300,90%,55%),hsl(360,90%,55%))',
          false, isCustom, 'Custom color',
          () => setShowWheel(true)
        )}
        {showWheel && (
          <ColorWheelPopup
            anchorRef={wrapRef}
            value={isCustom ? value : '#6366F1'}
            onChange={v => onChange(v)}
            onClose={() => setShowWheel(false)}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Canvas preview ────────────────────────────────────────── */
function CanvasPreview({
  watermarkKind, watermarkText, wmFile, color,
  position, rotation, opacity, mosaic, fontFamily, fontSize,
  fmtStyle, customFont, imgScale, layer = 'over', width = 220, height = 311,
}) {
  const canvasRef = useRef(null)
  const [customFontFamily, setCustomFontFamily] = useState(null)
  const [wmImg, setWmImg] = useState(null)

  // Decode custom font
  useEffect(() => {
    if (!customFont) { setCustomFontFamily(null); return }
    const name = `WMPreview_${customFont.name.replace(/\W/g, '_')}`
    const url  = URL.createObjectURL(customFont)
    const face = new FontFace(name, `url(${url})`)
    face.load()
      .then(f => { document.fonts.add(f); setCustomFontFamily(name) })
      .catch(() => setCustomFontFamily(null))
    return () => URL.revokeObjectURL(url)
  }, [customFont])

  // Decode watermark image — clear when switching to text kind
  useEffect(() => {
    if (!wmFile || watermarkKind !== 'image') { setWmImg(null); return }
    const url = URL.createObjectURL(wmFile)
    const img = new Image()
    img.onload  = () => setWmImg(img)
    img.onerror = () => setWmImg(null)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [wmFile, watermarkKind])

  // Repaint whenever any visual param changes
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    const PW  = width  * dpr
    const PH  = height * dpr
    if (c.width !== PW || c.height !== PH) { c.width = PW; c.height = PH }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const W = width
    const H = height

    const doDraw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── Draw a clean generalized mock page ────────────────────
      // This is intentionally generic — we can't replicate exact PDF
      // rendering in canvas, so we show a representative sample layout.
      const drawMockPage = (alpha = 1) => {
        ctx.globalAlpha = alpha

        // White page background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, W, H)

        // ── Mock page content ──────────────────────────────────
        const pad  = W * 0.12   // left/right padding
        const top  = H * 0.06   // top padding
        const contentW = W * 0.76

        // Document header with logo placeholder
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(pad, top, W * 0.08, W * 0.08)
        
        // Company name placeholder
        ctx.fillStyle = '#111827'
        ctx.fillRect(pad + W * 0.1, top + W * 0.015, W * 0.28, W * 0.024)
        
        // Document title placeholder
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(pad, top + H * 0.115, W * 0.5, W * 0.032)
        
        // Subtitle placeholder
        ctx.fillStyle = '#9ca3af'
        ctx.fillRect(pad, top + H * 0.16, W * 0.62, W * 0.018)

        // Divider line
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(pad, top + H * 0.19, contentW, 2)

        // Section 1 heading placeholder
        ctx.fillStyle = '#374151'
        ctx.fillRect(pad, top + H * 0.22, W * 0.35, W * 0.022)

        // Paragraph text blobs
        const lineH = H * 0.0065
        const lineGap = H * 0.016
        const paraStart = top + H * 0.26
        ctx.fillStyle = '#d1d5db'
        const paraWidths = [0.98, 0.95, 0.97, 0.92, 0.85]
        paraWidths.forEach((w, i) => {
          ctx.fillRect(pad, paraStart + i * lineGap, contentW * w, lineH)
        })

        // Section 2 heading placeholder
        ctx.fillStyle = '#374151'
        ctx.fillRect(pad, top + H * 0.36, W * 0.38, W * 0.022)

        // Key metrics cards
        const cardTop = top + H * 0.4
        const cardW = contentW * 0.3
        const cardH = H * 0.08
        const cardGap = contentW * 0.05
        
        ;[
          { color: '#10b981' },
          { color: '#3b82f6' },
          { color: '#8b5cf6' }
        ].forEach((card, i) => {
          const x = pad + i * (cardW + cardGap)
          // Card background
          ctx.fillStyle = '#f9fafb'
          ctx.fillRect(x, cardTop, cardW, cardH)
          ctx.strokeStyle = '#e5e7eb'
          ctx.lineWidth = 1
          ctx.strokeRect(x, cardTop, cardW, cardH)
          
          // Label placeholder
          ctx.fillStyle = '#d1d5db'
          ctx.fillRect(x + cardW * 0.12, cardTop + cardH * 0.25, cardW * 0.3, cardH * 0.12)
          
          // Value placeholder
          ctx.fillStyle = card.color
          ctx.fillRect(x + cardW * 0.12, cardTop + cardH * 0.55, cardW * 0.4, cardH * 0.18)
        })

        // Table section heading placeholder
        const tableTop = top + H * 0.52
        ctx.fillStyle = '#374151'
        ctx.fillRect(pad, tableTop, W * 0.4, W * 0.022)

        // Table
        const tTop = tableTop + H * 0.03
        const tRowH = H * 0.038
        const colWidths = [0.25, 0.25, 0.25, 0.25]
        
        // Table header
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(pad, tTop, contentW, tRowH)
        
        // Header cell placeholders
        ctx.fillStyle = '#ffffff'
        colWidths.forEach((cw, i) => {
          const x = pad + colWidths.slice(0, i).reduce((a, b) => a + b, 0) * contentW
          const cellX = x + (cw * contentW) / 2 - (cw * contentW * 0.35) / 2
          ctx.fillRect(cellX, tTop + tRowH * 0.3, cw * contentW * 0.35, tRowH * 0.4)
        })

        // Table rows
        const rows = 4
        
        for (let i = 0; i < rows; i++) {
          const y = tTop + (i + 1) * tRowH
          // Alternating row colors
          ctx.fillStyle = i % 2 === 0 ? '#f9fafb' : '#ffffff'
          ctx.fillRect(pad, y, contentW, tRowH)
          
          // Cell borders
          ctx.strokeStyle = '#e5e7eb'
          ctx.lineWidth = 0.5
          ctx.strokeRect(pad, y, contentW, tRowH)
          
          // Cell content placeholders
          ctx.fillStyle = '#d1d5db'
          colWidths.forEach((cw, j) => {
            const x = pad + colWidths.slice(0, j).reduce((a, b) => a + b, 0) * contentW
            const cellX = x + (cw * contentW) / 2 - (cw * contentW * 0.4) / 2
            ctx.fillRect(cellX, y + tRowH * 0.32, cw * contentW * 0.4, tRowH * 0.36)
          })
        }

        // Footer placeholders
        const footerTop = H * 0.92
        ctx.fillStyle = '#d1d5db'
        ctx.fillRect(pad, footerTop, contentW * 0.15, lineH)
        ctx.fillRect(pad + contentW * 0.82, footerTop, contentW * 0.18, lineH)

        ctx.globalAlpha = 1
      }

      // ── Helper: draw watermark ─────────────────────────────────
      const drawWatermark = (forceOpacity) => {
        const alpha  = forceOpacity !== undefined ? forceOpacity : opacity / 100
        const sel    = POSITIONS.find(p => p.id === position) || POSITIONS[4]
        const points = mosaic
          ? MOSAIC_GRID.map(m => ({ x: m.x / 100 * W, y: m.y / 100 * H }))
          : [{ x: sel.x / 100 * W, y: sel.y / 100 * H }]

        points.forEach(({ x, y }) => {
          ctx.save()
          ctx.translate(x, y)
          // Negate rotation so canvas matches PDF coordinate output direction
          ctx.rotate((-rotation * Math.PI) / 180)
          const a = mosaic ? Math.min(alpha * 0.7, 0.55) : Math.max(alpha, 0.1)
          ctx.globalAlpha = a

          if (watermarkKind === 'image' && wmImg) {
            const maxW   = W * (imgScale / 100)
            const aspect = wmImg.naturalHeight / wmImg.naturalWidth
            ctx.drawImage(wmImg, -maxW / 2, -(maxW * aspect) / 2, maxW, maxW * aspect)
          } else {
            // Text watermark
            const previewFont = customFont
              ? (customFontFamily ? `"${customFontFamily}", sans-serif` : 'sans-serif')
              : (FONT_MAP[fontFamily] || 'Helvetica, Arial, sans-serif')
            
            // Scale font size: PDF points to canvas pixels
            // Formula converts PDF coordinate space (595pt width) to canvas pixels
            const ptSize = Math.max(10, Math.round((fontSize || 60) * (W / 595) * 1.35))
            
            const weight = fmtStyle?.bold   ? '700' : '400'
            const fStyle = fmtStyle?.italic ? 'italic' : 'normal'
            ctx.font = `${fStyle} ${weight} ${ptSize}px ${previewFont}`
            ctx.textRendering = 'optimizeLegibility'
            let col = color
            if (color.startsWith('rgba')) {
              col = color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0.8)')
            }
            ctx.fillStyle = col
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const label = (watermarkText || 'WATERMARK').toUpperCase()
            ctx.fillText(label, 0, 0)
            if (fmtStyle?.underline) {
              const tw = ctx.measureText(label).width
              ctx.strokeStyle = col
              ctx.lineWidth   = Math.max(0.5, ptSize * 0.05)
              ctx.globalAlpha *= 0.9
              ctx.beginPath()
              ctx.moveTo(-tw / 2, ptSize * 0.55)
              ctx.lineTo( tw / 2, ptSize * 0.55)
              ctx.stroke()
            }
          }
          ctx.restore()
        })
      }

      if (layer === 'under') {
        // Watermark first, then page on top at reduced opacity
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, W, H)
        drawWatermark(Math.max(opacity / 100, 0.6))
        drawMockPage(0.82)
      } else {
        // Page first, watermark on top
        drawMockPage()
        drawWatermark()
      }
    }

    // Wait for fonts before drawing. Re-draw once Inter/DM Sans load
    // (Google Fonts arrive after initial fonts.ready resolves)
    document.fonts.ready.then(doDraw)

    let cancelled = false
    const fontFacesToWatch = ['Inter', 'DM Sans']
    fontFacesToWatch.forEach(name => {
      document.fonts.load(`700 16px "${name}"`).then(() => {
        if (!cancelled) doDraw()
      }).catch(() => {})
    })
    return () => { cancelled = true }
  }, [watermarkKind, watermarkText, wmImg, color, position, rotation,
      opacity, mosaic, fontFamily, fontSize, fmtStyle, customFontFamily, imgScale,
      customFont, layer, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width * (window.devicePixelRatio || 1)}
      height={height * (window.devicePixelRatio || 1)}
      style={{
        borderRadius: 8,
        border: '1px solid var(--border)',
        display: 'block',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width,
        height,
        background: '#fff',
      }}
    />
  )
}

/* ─── Rotation icon ─────────────────────────────────────────── */
const RotationIcon = ({ value, size = 13 }) => {
  if (value === 0) return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="var(--text-3)" xmlns="http://www.w3.org/2000/svg">
      <path d="M52,34H13c-1.104,0-2-0.896-2-2s0.896-2,2-2h39c1.104,0,2,0.896,2,2S53.104,34,52,34z"/>
      <path d="M26.485,48.96c-0.522,0-1.045-0.204-1.437-0.609l-14.485-14.96c-0.751-0.775-0.751-2.007,0-2.782l14.485-14.96c0.767-0.794,2.034-0.814,2.828-0.046c0.793,0.769,0.813,2.035,0.045,2.828L14.784,32l13.138,13.569c0.769,0.793,0.748,2.06-0.045,2.828C27.488,48.773,26.986,48.96,26.485,48.96z"/>
      <path d="M37.515,48.96c-0.501,0-1.003-0.187-1.392-0.563c-0.793-0.768-0.814-2.035-0.045-2.828L49.216,32L36.078,18.431c-0.768-0.793-0.748-2.059,0.045-2.828c0.794-0.768,2.061-0.748,2.828,0.046l14.485,14.96c0.751,0.775,0.751,2.007,0,2.782l-14.485,14.96C38.56,48.756,38.037,48.96,37.515,48.96z"/>
    </svg>
  )
  if (value === 45) return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,15 4,20 4,15"/><polyline points="4,20 9,20"/>
      <polyline points="15,9 20,4 20,9"/><polyline points="20,4 15,4"/>
      <line x1="4" y1="20" x2="20" y2="4"/>
    </svg>
  )
  if (value === -45) return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,15 20,20 15,20"/><polyline points="20,20 20,15"/>
      <polyline points="9,9 4,4 9,4"/><polyline points="4,4 4,9"/>
      <line x1="4" y1="4" x2="20" y2="20"/>
    </svg>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width={size} height={size} fill="none" stroke="var(--text-3)" strokeWidth="4" strokeLinecap="round" strokeMiterlimit="10">
      <polyline points="7,4 7,13 16,13"/>
      <path d="M8,12.669C11.817,7.416,18.009,4,25,4c11.598,0,21,9.402,21,21s-9.402,21-21,21S4,36.598,4,25"/>
    </svg>
  )
}

/* ─── Section wrapper ───────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-3)',
          }}>{title}</span>
        </div>
      )}
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  )
}

/* ─── Toggle switch ─────────────────────────────────────────── */
function Toggle({ checked, onChange, label, hint, accent }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '12px 14px',
        background: checked ? `${accent}08` : 'var(--surface-2)',
        border: `1px solid ${checked ? `${accent}33` : 'var(--border)'}`,
        borderRadius: 12, cursor: 'pointer', userSelect: 'none',
        transition: 'all 0.15s',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{hint}</div>}
      </div>
      <div style={{
        width: 36, height: 20, borderRadius: 999, flexShrink: 0,
        background: checked ? accent : 'var(--border-strong)',
        position: 'relative', transition: 'background 0.18s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'transform 0.18s',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }} />
      </div>
    </div>
  )
}

/* ─── Pill button group ─────────────────────────────────────── */
function PillGroup({ options, value, onChange, accent }) {
  return (
    <div style={{
      display: 'inline-flex', background: 'var(--surface-2)',
      borderRadius: 10, border: '1px solid var(--border)', padding: 3, gap: 2,
    }}>
      {options.map(o => {
        const on = (o.value ?? o) === value
        return (
          <button
            key={o.value ?? o} type="button"
            onClick={() => onChange(o.value ?? o)}
            style={{
              height: 28, minWidth: 44, padding: '0 10px',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: on ? 'var(--surface)' : 'transparent',
              color: on ? accent : 'var(--text-3)',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: on ? 700 : 500,
              boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {o.label ?? o}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Slider with track fill ────────────────────────────────── */
function SliderField({ label, value, min, max, step = 1, onChange, accent, displayValue, unit = '' }) {
  // Clamp value to current min/max so the thumb is never outside the track
  const clamped = Math.max(min, Math.min(max, value))
  const pct = Math.max(0, Math.min(100, ((clamped - min) / (max - min)) * 100))
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
      }}>
        <span style={LBL}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          {displayValue ?? clamped}{unit && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', marginLeft: 1 }}>{unit}</span>}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4,
          borderRadius: 99, background: 'var(--border-strong)',
        }} />
        <div style={{
          position: 'absolute', left: 0, height: 4,
          borderRadius: 99, background: accent, width: `${pct}%`,
          transition: 'width 0.08s',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={clamped}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          style={{
            position: 'relative', zIndex: 1, width: '100%',
            appearance: 'none', WebkitAppearance: 'none',
            background: 'transparent', cursor: 'pointer', height: 20, margin: 0,
          }}
          className="wmx2-slider"
        />
      </div>
    </div>
  )
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function WatermarkPdf({ onBack, tool, onComplete }) {
  const srcRef  = useRef(null)
  const wmRef   = useRef(null)
  const fontRef = useRef(null)

  // Load Google Fonts once
  useEffect(() => {
    const id = 'wm-gfonts'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id; link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  const [file, setFile]                     = useState(null)
  const [kind, setKind]                     = useState('text')
  const [text, setText]                     = useState('CONFIDENTIAL')
  const [wmFile, setWmFile]                 = useState(null)
  const [fontFamily, setFontFamily]         = useState('Helvetica')
  const [fontSize, setFontSize]             = useState(60)
  const [fontSizeStr, setFontSizeStr]       = useState('60')
  const [fmtStyle, setFmtStyle]             = useState({ bold: true, italic: false, underline: false })
  const [customFont, setCustomFont]         = useState(null)
  const [customFontName, setCustomFontName] = useState('')
  const [color, setColor]                   = useState('rgba(0,0,0,0.25)')
  const [opacity, setOpacity]               = useState(45)
  const [rotation, setRotation]             = useState(45)
  const [position, setPosition]             = useState('center')
  const [mosaic, setMosaic]                 = useState(false)
  const [layer, setLayer]                   = useState('over')
  const [pageFrom, setPageFrom]             = useState(1)
  const [pageTo, setPageTo]                 = useState(0)
  const [pageToStr, setPageToStr]           = useState('')
  const [pageFromStr, setPageFromStr]       = useState('1')
  const [error, setError]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [dragging, setDragging]             = useState(false)
  const [imgScale, setImgScale]             = useState(65)
  const [pageFilter, setPageFilter]         = useState('all')
  const [pageCount, setPageCount]           = useState(null)
  const [thumbnail, setThumbnail]           = useState(null)

  const theme    = useTheme()
  const accent   = resolveAccent(tool?.accent || ACCENT, theme)
  const A        = accent
  const canApply = !loading && !!file && (kind === 'text' ? !!text.trim() : !!wmFile)

  const pickFile = useCallback(async f => {
    if (!f) return
    if (!f.name?.toLowerCase().endsWith('.pdf')) { setError('Please choose a PDF file.'); return }
    setFile(f); setPageTo(0); setPageToStr(''); setPageFrom(1); setPageFromStr('1'); setPageFilter('all')
    setThumbnail(null); setPageCount(null); setError('')
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('user_id', getUserId())
      const res = await axios.post(`${API_BASE}/thumbnail`, fd)
      if (res.data?.thumbnail) setThumbnail(res.data.thumbnail)
      if (res.data?.pages)     setPageCount(res.data.pages)
    } catch { /* non-fatal */ }
  }, [])

  const pickWm = f => {
    if (!f) return
    if (!f.type?.startsWith('image/') && !f.name?.toLowerCase().endsWith('.pdf')) {
      setError('Watermark must be an image or PDF.'); return
    }
    setWmFile(f); setError('')
  }

  const toggleFmt = k => setFmtStyle(p => ({ ...p, [k]: !p[k] }))

  const apply = async () => {
    if (!file)                  { setError('Upload a PDF first.'); return }
    if (kind === 'text' && !text.trim())  { setError('Enter watermark text.'); return }
    if (kind === 'image' && !wmFile)      { setError('Choose an image or PDF watermark.'); return }
    if (Number(pageTo) > 0 && Number(pageTo) < Number(pageFrom)) {
      setError('End page must be ≥ start page.'); return
    }
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file',        file);         fd.append('user_id',  getUserId())
      fd.append('kind',        kind);         fd.append('position', position)
      fd.append('layer',       layer);        fd.append('opacity',  String(opacity))
      fd.append('rotation',    String(rotation))
      fd.append('mosaic',      mosaic ? 'true' : 'false')
      // For custom mode, send the range; for all/odd/even, send filter only
      if (pageFilter === 'custom') {
        fd.append('page_from',   String(pageFrom))
        fd.append('page_to',     String(pageTo))
        fd.append('page_filter', 'all')  // backend applies range to 'all'
      } else {
        fd.append('page_from',   '1')
        fd.append('page_to',     '0')
        fd.append('page_filter', pageFilter)
      }
      if (kind === 'text') {
        fd.append('text',        text.trim())
        fd.append('font_family', customFont ? 'Custom' : fontFamily)
        fd.append('font_size',   String(fontSize))
        fd.append('bold',        fmtStyle.bold      ? 'true' : 'false')
        fd.append('italic',      fmtStyle.italic    ? 'true' : 'false')
        fd.append('underline',   fmtStyle.underline ? 'true' : 'false')
        fd.append('color',       color)
        if (customFont) fd.append('custom_font', customFont)
      } else {
        fd.append('scale',   String(imgScale))
        fd.append('wm_file', wmFile)
      }
      const response = await axios.post(`${API_BASE}/watermark`, fd)
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

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Applying your watermark">
      {/* Scoped slider styles */}
      <style>{`
        .wmx2-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: white; border: 2.5px solid ${A};
          box-shadow: 0 1px 4px rgba(0,0,0,0.18); cursor: pointer;
          transition: transform .12s, box-shadow .12s;
        }
        .wmx2-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15); box-shadow: 0 2px 8px ${A}55;
        }
        .wmx2-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: white; border: 2.5px solid ${A};
          box-shadow: 0 1px 4px rgba(0,0,0,0.18); cursor: pointer;
        }
        .wmx2-slider:focus { outline: none; }
        @keyframes wmx2-spin { to { transform: rotate(360deg); } }
        .wmx2-tab-btn {
          flex: 1; border: none; cursor: pointer; padding: 10px 12px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          font-family: var(--font-ui); font-size: 13px; font-weight: 600;
          color: var(--text-3); background: transparent; transition: all .15s;
        }
        .wmx2-tab-btn:hover { color: var(--text-2); }
        .wmx2-tab-btn.active {
          background: var(--surface); color: ${A};
          box-shadow: 0 1px 4px rgba(0,0,0,0.1), inset 0 0 0 1px ${A}33;
        }
        .wmx2-fmt-btn {
          width: 32px; height: 32px; border-radius: 8px;
          border: none; background: transparent; cursor: pointer;
          color: var(--text-3); display: inline-flex; align-items: center; justify-content: center;
          transition: all .12s;
        }
        .wmx2-fmt-btn:hover { color: var(--text-2); background: var(--surface); }
        .wmx2-fmt-btn.active { color: ${A}; background: var(--surface); box-shadow: inset 0 0 0 1.5px ${A}44; }
        .wmx2-layer-btn {
          flex: 1; padding: 10px 12px; border-radius: 11px; cursor: pointer;
          border: 1.5px solid var(--border); background: var(--surface-2);
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: var(--font-ui); font-size: 13px; font-weight: 600;
          color: var(--text-2); transition: all .15s; min-width: 0;
        }
        .wmx2-layer-btn:hover { border-color: ${A}66; background: ${A}07; }
        .wmx2-layer-btn.active { border-color: ${A}; background: ${A}14; color: ${A}; }
        .wmx2-change-btn {
          border: none; background: none; cursor: pointer;
          font-family: var(--font-ui); font-size: 12px; color: ${A};
          font-weight: 600; padding: 4px 10px; border-radius: 8px; flex-shrink: 0;
          transition: background .12s;
        }
        .wmx2-change-btn:hover { background: ${A}14; }
      `}</style>

      {/* Hidden file inputs */}
      <input
        ref={srcRef} type="file" accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <input
        ref={wmRef} type="file" accept=".pdf,.svg,image/*"
        style={{ display: 'none' }}
        onChange={e => { pickWm(e.target.files?.[0]); e.target.value = '' }}
      />
      <input
        ref={fontRef} type="file" accept=".ttf,.otf"
        style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0] || null; e.target.value = ''
          setCustomFont(f); setCustomFontName('')
          if (!f) return
          try {
            const fd = new FormData(); fd.append('font_file', f)
            const res = await axios.post(`${API_BASE}/font-info`, fd)
            if (res.data?.name) setCustomFontName(res.data.name)
          } catch { /* use filename as fallback */ }
        }}
      />

      {/* ── Drop zone ── */}
      <div
        data-testid="watermark-drop"
        onClick={file ? undefined : () => srcRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
        style={{
          border: `1.5px ${file ? 'solid' : 'dashed'} ${(file || dragging) ? `${A}55` : 'var(--border-strong)'}`,
          borderRadius: 16,
          background: dragging ? `${A}07` : file ? 'var(--surface-2)' : 'var(--surface)',
          padding: file ? '14px 18px' : '36px 22px',
          textAlign: file ? 'left' : 'center',
          cursor: file ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {!file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: `${A}14`, border: `1px solid ${A}2a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StampIcon size={26} color={A} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                Drop your PDF here
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
                or click to browse
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${A}14`, border: `1px solid ${A}2a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={17} color={A} />
            </div>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {trunc(file.name, 50)}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {formatSize(file.size)}{pageCount ? ` · ${pageCount} page${pageCount > 1 ? 's' : ''}` : ''}
              </span>
            </span>
            <button
              type="button" className="wmx2-change-btn"
              onClick={e => { e.stopPropagation(); srcRef.current?.click() }}
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* ── Workbench — shown once file is picked ── */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >

            {/* ── Preview card ── */}
            <Section title="Preview">
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 20,
                flexWrap: 'wrap',
              }}>
                {/* canvas */}
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  <CanvasPreview
                    watermarkKind={kind} watermarkText={text} wmFile={wmFile} color={color}
                    position={position} rotation={Number(rotation)}
                    opacity={Number(opacity)} mosaic={mosaic}
                    fontFamily={fontFamily} fontSize={fontSize} fmtStyle={fmtStyle}
                    customFont={customFont} imgScale={imgScale}
                    layer={layer}
                    width={220} height={311}
                  />
                  {/* Layer badge */}
                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: layer === 'over' ? `${A}dd` : 'rgba(80,80,100,0.82)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    padding: '3px 7px', borderRadius: 6,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'none',
                  }}>
                    {layer === 'over' ? '▲ Above' : '▼ Below'}
                  </div>
                </div>
                {/* meta */}
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Position</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {POSITIONS.find(p => p.id === position)?.label}
                      {mosaic && <span style={{ fontSize: 12, color: A, fontWeight: 500, marginLeft: 6 }}>· Repeating</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Opacity</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {TRANSPARENCY_OPTIONS.find(t => t.value === opacity)?.label ?? `${opacity}%`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Rotation</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {ROTATION_OPTIONS.find(r => r.value === Number(rotation))?.label ?? `${rotation}°`}
                    </span>
                  </div>
                  {pageCount && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Pages</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{pageCount} total</span>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Watermark type tabs + content ── */}
            <Section title="Watermark">
              {/* Tabs */}
              <div style={{
                display: 'flex', gap: 6, padding: 4,
                background: 'var(--surface-2)', borderRadius: 12,
                border: '1px solid var(--border)', marginBottom: 16,
              }}>
                <button
                  type="button" className={`wmx2-tab-btn${kind === 'text' ? ' active' : ''}`}
                  onClick={() => setKind('text')}
                >
                  <FileText size={14} /> Text
                </button>
                <button
                  type="button" className={`wmx2-tab-btn${kind === 'image' ? ' active' : ''}`}
                  onClick={() => setKind('image')}
                >
                  <FileImage size={14} /> Image / PDF
                </button>
              </div>

              {kind === 'text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Text input */}
                  <div>
                    <span style={LBL}>Watermark text</span>
                    <input
                      data-testid="wm-text-input"
                      value={text} onChange={e => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      style={INPUT_BASE}
                    />
                  </div>

                  {/* Font + size */}
                  <div>
                    <span style={LBL}>Font &amp; size</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px', gap: 8 }}>
                      {customFont ? (
                        <div style={{ position: 'relative' }}>
                          <div
                            style={{
                              ...INPUT_BASE, display: 'flex', alignItems: 'center', gap: 6,
                              border: `1px solid ${A}`, background: `${A}08`,
                              cursor: 'pointer', paddingRight: 30,
                            }}
                            onClick={() => fontRef.current?.click()}
                            title="Click to change font"
                          >
                            <FontIcon size={13} color={A} />
                            <span style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: A, fontWeight: 600, fontSize: 13,
                            }}>
                              {trunc(customFontName || customFont.name.replace(/\.[^.]+$/, ''), 18)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setCustomFont(null); setCustomFontName('') }}
                            title="Remove custom font"
                            style={{
                              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: 0,
                            }}
                          >×</button>
                        </div>
                      ) : (
                        <SelectField id="wm-ff" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
                      )}
                      <button
                        type="button"
                        onClick={() => fontRef.current?.click()}
                        title="Upload custom font (.ttf / .otf)"
                        style={{
                          width: 38, height: 38, border: '1px solid var(--border-strong)',
                          borderRadius: 10, background: 'var(--surface-2)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-3)', flexShrink: 0,
                        }}
                      >
                        <FontIcon size={14} color="currentColor" />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={fontSizeStr}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            setFontSizeStr(raw)
                            const n = parseInt(raw, 10)
                            if (!isNaN(n) && n > 0) setFontSize(Math.min(300, n))
                          }}
                          onBlur={() => {
                            const n = parseInt(fontSizeStr, 10)
                            const v = isNaN(n) || n < 6 ? 60 : Math.min(300, n)
                            setFontSize(v); setFontSizeStr(String(v))
                          }}
                          style={{ ...INPUT_BASE, paddingRight: 26 }}
                          aria-label="Font size"
                        />
                        <span style={{
                          position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, color: 'var(--text-3)', pointerEvents: 'none', fontWeight: 700,
                        }}>pt</span>
                      </div>
                    </div>
                  </div>

                  {/* Format + color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Bold / Italic / Underline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...LBL, marginBottom: 0 }}>Style</span>
                      <div style={{
                        display: 'inline-flex', gap: 2,
                        background: 'var(--surface-2)', borderRadius: 10, padding: 3,
                        border: '1px solid var(--border)',
                      }}>
                        {([['bold', Bold, 'Bold'], ['italic', Italic, 'Italic'], ['underline', Underline, 'Underline']]).map(([k, Icon, title]) => (
                          <button
                            key={k} type="button"
                            className={`wmx2-fmt-btn${fmtStyle[k] ? ' active' : ''}`}
                            onClick={() => toggleFmt(k)}
                            title={title}
                          >
                            <Icon size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Color row — full width so swatches don't wrap/clip */}
                    <div>
                      <span style={LBL}>Color</span>
                      <ColorPalette value={color} accent={A} onChange={setColor} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Image picker */}
                  <div>
                    <span style={LBL}>Image or PDF watermark</span>
                    <button
                      type="button"
                      onClick={() => wmRef.current?.click()}
                      style={{
                        width: '100%', minHeight: 58, borderRadius: 12,
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        border: `1.5px dashed ${wmFile ? A : 'var(--border-strong)'}`,
                        background: wmFile ? `${A}08` : 'var(--surface-2)',
                        transition: 'all 0.15s', boxSizing: 'border-box',
                      }}
                    >
                      <ImageIcon size={22} color={A} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0, textAlign: 'left' }}>
                        <strong style={{
                          display: 'block', fontSize: 13.5, fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--text)',
                        }}>
                          {wmFile ? trunc(wmFile.name) : 'Choose image or PDF'}
                        </strong>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {wmFile ? formatSize(wmFile.size) : 'PNG, JPG, WebP, SVG, PDF'}
                        </span>
                      </span>
                    </button>
                  </div>
                  {/* Size slider — always visible, range changes with mosaic */}
                  <SliderField
                    label={mosaic ? 'Tile size' : 'Size'}
                    value={imgScale}
                    min={mosaic ? 5 : 15}
                    max={mosaic ? 50 : 120}
                    step={1}
                    onChange={v => {
                      // Clamp to current mode's range
                      const min = mosaic ? 5 : 15
                      const max = mosaic ? 50 : 120
                      setImgScale(Math.max(min, Math.min(max, v)))
                    }}
                    accent={A}
                    unit="%"
                  />
                </div>
              )}
            </Section>

            {/* ── Placement ── */}
            <Section title="Placement">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Position grid + pages side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
                  {/* Position grid */}
                  <div style={{ opacity: mosaic ? 0.35 : 1, pointerEvents: mosaic ? 'none' : 'auto', transition: 'opacity .15s' }}>
                    <span style={LBL}>Position</span>
                    <PositionGrid value={position} accent={A} onChange={setPosition} />
                  </div>

                  {/* Pages */}
                  <div>
                    <span style={LBL}>Pages</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Filter: All / Odd / Even / Custom */}
                      <PillGroup
                        options={[
                          {value:'all',label:'All'},
                          {value:'odd',label:'Odd'},
                          {value:'even',label:'Even'},
                          {value:'custom',label:'Custom'}
                        ]}
                        value={pageFilter} 
                        onChange={v => {
                          setPageFilter(v)
                          // Reset range when switching modes
                          if (v !== 'custom') {
                            setPageFrom(1)
                            setPageFromStr('1')
                            setPageTo(0)
                            setPageToStr('')
                          }
                        }} 
                        accent={A}
                      />

                      {/* Page range — only show for custom */}
                      {pageFilter === 'custom' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 16px 1fr', gap: 6, alignItems: 'center' }}>
                          <input
                            type="text" inputMode="numeric" pattern="[0-9]*"
                            value={pageFromStr} placeholder="From"
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              setPageFromStr(raw)
                              const n = parseInt(raw, 10)
                              if (!isNaN(n) && n > 0) setPageFrom(n)
                            }}
                            onBlur={() => {
                              const n = parseInt(pageFromStr, 10)
                              const v = isNaN(n) || n < 1 ? 1 : n
                              setPageFrom(v)
                              setPageFromStr(String(v))
                            }}
                            style={{ ...INPUT_BASE, height: 36 }}
                            aria-label="From page"
                          />
                          <span style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>–</span>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text" inputMode="numeric" pattern="[0-9]*"
                              value={pageToStr} placeholder="Last"
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^0-9]/g, '')
                                setPageToStr(raw)
                                const n = parseInt(raw, 10)
                                if (!isNaN(n) && n > 0) setPageTo(n)
                              }}
                              onBlur={() => {
                                const n = parseInt(pageToStr, 10)
                                if (isNaN(n) || n === 0) { 
                                  setPageTo(0)
                                  setPageToStr('') 
                                } else { 
                                  setPageTo(n)
                                  setPageToStr(String(n)) 
                                }
                              }}
                              style={{ ...INPUT_BASE, height: 36, paddingRight: pageCount && pageToStr && parseInt(pageToStr, 10) !== pageCount ? 48 : 12 }}
                              aria-label="To page"
                            />
                            {/* Show "Last" button only when user has typed a custom value and it's not already last */}
                            {pageCount && pageToStr && parseInt(pageToStr, 10) !== pageCount && (
                              <button
                                type="button"
                                onClick={() => { 
                                  setPageTo(pageCount)
                                  setPageToStr(String(pageCount)) 
                                }}
                                style={{
                                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                  height: 24, padding: '0 7px', borderRadius: 6, cursor: 'pointer',
                                  border: `1px solid ${A}44`, background: `${A}12`,
                                  color: A, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
                                }}
                              >
                                Last
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Helper text explaining the selection */}
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
                        {pageFilter === 'all' && 'Watermark applied to all pages.'}
                        {pageFilter === 'odd' && 'Watermark on odd pages only (1, 3, 5…)'}
                        {pageFilter === 'even' && 'Watermark on even pages only (2, 4, 6…)'}
                        {pageFilter === 'custom' && !pageToStr && `Pages ${pageFrom} to end.`}
                        {pageFilter === 'custom' && pageToStr && `Pages ${pageFrom} to ${pageToStr}.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mosaic toggle */}
                <Toggle
                  checked={mosaic}
                  onChange={on => {
                    setMosaic(on)
                    // Reset font size for text mode to 20pt for mosaic, 60pt for single
                    if (kind === 'text') {
                      setFontSize(on ? 20 : 60)
                      setFontSizeStr(on ? '20' : '60')
                    }
                    // imgScale: intelligently adjust to fit new range
                    if (on && kind === 'image') {
                      // Switching to mosaic mode (5-50%): if current is too large, scale down proportionally
                      if (imgScale > 50) setImgScale(Math.round((imgScale / 120) * 50))
                    } else if (!on && kind === 'image') {
                      // Switching to single mode (15-120%): if current is too small, scale up proportionally
                      if (imgScale < 15) setImgScale(Math.round((imgScale / 50) * 120))
                    }
                  }}
                  label="Repeat across page"
                  hint="Tile the watermark over the entire page"
                  accent={A}
                />
              </div>
            </Section>

            {/* ── Appearance ── */}
            <Section title="Appearance">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Transparency + Rotation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <SelectField
                    id="wm-opacity" label="Transparency"
                    value={opacity} onChange={v => setOpacity(Number(v))}
                    options={TRANSPARENCY_OPTIONS}
                  />
                  <SelectField
                    id="wm-rotation" label="Rotation"
                    value={rotation} onChange={v => setRotation(Number(v))}
                    options={ROTATION_OPTIONS}
                    leftIcon={<RotationIcon value={Number(rotation)} />}
                  />
                </div>

                {/* Layer */}
                <div>
                  <span style={LBL}>Layer</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'over',  title: 'Above content' },
                      { id: 'under', title: 'Behind content' },
                    ].map(l => {
                      const on = layer === l.id
                      return (
                        <button
                          key={l.id} type="button"
                          onClick={() => setLayer(l.id)}
                          className={`wmx2-layer-btn${on ? ' active' : ''}`}
                        >
                          <LayersIcon
                            size={18}
                            baseColor={on ? `${A}55` : 'var(--border-strong)'}
                            accentColor={A}
                            mode={l.id}
                          />
                          {l.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Error ── */}
            {error && (
              <div style={{
                background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
                borderRadius: 12, padding: '12px 16px',
                color: 'var(--danger-text)', fontSize: 13.5,
              }}>
                {error}
              </div>
            )}

            {/* ── Apply button ── */}
            <motion.button
              data-testid="apply-watermark-btn"
              whileTap={{ scale: 0.985 }}
              onClick={apply}
              disabled={!canApply}
              style={{
                width: '100%', minHeight: 50, borderRadius: 14, border: 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                cursor: canApply ? 'pointer' : 'not-allowed',
                background: canApply ? A : primaryActionBg(false),
                color: canApply ? 'white' : primaryActionColor(false),
                boxShadow: canApply ? `0 8px 24px ${A}40` : 'none',
                transition: 'all 0.15s',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
                    animation: 'wmx2-spin 0.7s linear infinite',
                  }} />
                  Applying watermark…
                </>
              ) : (
                <>
                  <StampIcon size={17} color="currentColor" />
                  Apply watermark
                </>
              )}
            </motion.button>

          </motion.div>
        )}
      </AnimatePresence>
    </ToolShell>
  )
}
