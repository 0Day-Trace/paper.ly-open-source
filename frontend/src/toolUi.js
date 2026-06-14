export const TOOL_ACCENT_ON_DARK = {
  '#E53E3E': '#FCA5A5',
  '#DB2777': '#F9A8D4',
  '#0D9488': '#5EEAD4',
  '#D97706': '#FCD34D',
  '#059669': '#6EE7B7',
  '#7C3AED': '#C4B5FD',
  '#EA580C': '#FDBA74',
  '#DC2626': '#FCA5A5',
  '#C2410C': '#FDBA74',
  '#1D4ED8': '#93C5FD',
  '#16A34A': '#86EFAC',
  '#6D28D9': '#C4B5FD',
  '#0AACBF': '#67E8F9',
}

export function resolveAccent(accent, theme) {
  if (theme !== 'dark') return accent
  return TOOL_ACCENT_ON_DARK[accent] ?? accent
}

export const infoCalloutStyle = (accent, theme) => {
  const a = resolveAccent(accent, theme)
  return {
    background: theme === 'dark' ? `${a}14` : 'var(--surface-2)',
    border: `1px solid ${a}33`,
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
  }
}

export const tagPillStyle = (accent, theme) => {
  const a = resolveAccent(accent, theme)
  return {
    fontSize: 12,
    color: a,
    background: 'var(--surface)',
    border: `1px solid ${a}33`,
    borderRadius: 20,
    padding: '4px 10px',
    fontWeight: 400,
  }
}

export const primaryActionBg = (enabled) => (enabled ? 'var(--accent)' : 'var(--surface-2)')
export const primaryActionColor = (enabled) => (enabled ? '#fff' : 'var(--text-3)')
