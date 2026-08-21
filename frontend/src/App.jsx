/**
 * paperly — Apple-inspired PDF tools
 *
 * Google Fonts (add to public/index.html <head>):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
 */

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { flushSync, createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Toaster, toast } from 'react-hot-toast'
import axios from 'axios'

import {
  FileImage, GitMerge, Scissors, Minimize2, Lock, Unlock,
  Trash2, ShieldOff, Presentation, FileText, Table2, RotateCw,
  Clock, Download, X, ArrowRight, ExternalLink, QrCode, Copy,
  Sparkles, Sun, Moon, Server, Wifi, ShieldCheck, CircleArrowRight
} from 'lucide-react'

/* ─── Tool imports (your existing components, unchanged) ─── */
import PdfToImage from './components/PdfToImage'
import MergePdf      from './MergePdf'
import ProtectPdf    from './ProtectPdf'
import UnlockPdf     from './UnlockPdf'
import SplitPdf      from './SplitPdf'
import RemovePages   from './RemovePages'
import CompressPdf   from './CompressPdf'
import CleanMetadata from './CleanMetadata'
import PptxConverter from './PptxConverter'
import DocxConverter from './DocxConverter'
import ExcelConverter from './ExcelConverter'
import RotatePdf     from './RotatePdf'
import ImageToPdf    from './ImageToPdfTool'
import WatermarkPdf  from './WatermarkPdf'
import DownloadReadyPage from './components/DownloadReadyPage'
import Aurora from './components/Aurora'
import Grainient from './components/Grainient'
import { ServerConfigProvider, useServerConfig } from './context/ServerConfigContext'
import {
  API_BASE,
  GITHUB_URL,
  getUserId,
  formatTimeLeft,
  getRecentFilesSubtitle,
  getRetentionHours,
} from './config'
import { downloadRemoteFile, cleanDownloadFilename, toAbsoluteUrl, withDownloadParam } from './download'

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

// icons8 visa-stamp — used on the Watermark PDF tool card
const StampSvgIcon = ({ size = 18, color = 'currentColor', strokeWidth }) => (
  <svg viewBox="0 0 50 50" width={size} height={size} fill={color} xmlns="http://www.w3.org/2000/svg">
    <rect x="1"  y="30" width="2" height="2"/>
    <rect x="1"  y="34" width="2" height="2"/>
    <rect x="1"  y="38" width="2" height="2"/>
    <rect x="1"  y="42" width="2" height="2"/>
    <rect x="5"  y="42" width="2" height="2"/>
    <rect x="9"  y="42" width="2" height="2"/>
    <rect x="13" y="42" width="2" height="2"/>
    <rect x="17" y="42" width="2" height="2"/>
    <rect x="21" y="42" width="2" height="2"/>
    <rect x="25" y="42" width="2" height="2"/>
    <rect x="29" y="42" width="2" height="2"/>
    <rect x="33" y="42" width="2" height="2"/>
    <rect x="37" y="42" width="2" height="2"/>
    <rect x="5"  y="30" width="2" height="2"/>
    <rect x="9"  y="30" width="2" height="2"/>
    <path d="M5.748,22.323l0.402,3.65c0.042,0.377,0.292,0.697,0.647,0.829L41.453,39.61c0.113,0.041,0.23,0.062,0.347,0.062c0.25,0,0.495-0.094,0.684-0.271l2.679-2.511L5.748,22.323z"/>
    <path d="M27.26,9.911c0.286,1.736,0.557,3.376,0.119,4.56l-2.058,5.58c-0.063,0.15-0.078,0.25-0.013,0.404c0.245,0.568,1.295,1.277,2.612,1.764c0.016,0.006,0.026,0.019,0.042,0.026c1.913,0.742,3.995,0.726,4.223,0.167l2.189-5.937c0.465-1.183,1.612-2.153,2.722-3.091c0.507-0.429,1.02-0.865,1.429-1.288c0.396-0.551,0.738-1.104,0.94-1.651c0.697-1.886,0.702-3.655,0.014-5.115c-0.677-1.434-2.01-2.552-3.856-3.234c-1.849-0.683-3.587-0.701-5.035-0.051c-1.472,0.661-2.619,2.008-3.315,3.895c-0.192,0.518-0.278,1.131-0.312,1.785C27.013,8.399,27.139,9.18,27.26,9.911z"/>
    <path d="M49.404,20.898l-12.515-4.625c-0.297,0.317-0.531,0.625-0.645,0.913l-2.194,5.949c-0.509,1.248-1.808,1.685-3.248,1.685c-1.232,0-2.568-0.32-3.6-0.725c-0.017-0.007-0.027-0.021-0.043-0.028c-1.133-0.426-3.048-1.339-3.687-2.822c-0.273-0.637-0.276-1.305-0.009-1.933l2.039-5.534c0.138-0.374,0.126-0.993,0.052-1.694L12.925,7.417c-0.494-0.181-1.044,0.049-1.259,0.529L6.117,20.327l40.064,14.805l3.836-13.014C50.166,21.614,49.897,21.081,49.404,20.898z"/>
  </svg>
)

const getPageScrollY = () => (
  window.scrollY
  || window.pageYOffset
  || document.documentElement.scrollTop
  || document.body.scrollTop
  || 0
)

const getHeaderScrollOffset = () => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
  const px = parseFloat(raw)
  return (Number.isFinite(px) ? px : 64) + 16
}

const scrollWindowToTop = (behavior = 'smooth') => {
  window.scrollTo({ top: 0, left: 0, behavior })
  if (behavior === 'auto' || behavior === 'instant') {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }
}

const measureToolsScrollTop = (targetRef) => {
  const el = targetRef.current
  if (!el) return null
  const top = el.getBoundingClientRect().top + getPageScrollY() - getHeaderScrollOffset()
  return Math.max(0, Math.round(top))
}

const scrollToToolsPosition = (targetRef, cachedYRef, behavior = 'smooth') => {
  const measured = measureToolsScrollTop(targetRef)
  const target = measured ?? cachedYRef.current
  if (target == null) return false
  if (measured != null) cachedYRef.current = measured
  window.scrollTo({ top: target, left: 0, behavior })
  return true
}

const scrollToToolsWhenReady = (targetRef, cachedYRef) => {
  if (scrollToToolsPosition(targetRef, cachedYRef)) return
  let attempts = 0
  const retry = () => {
    if (scrollToToolsPosition(targetRef, cachedYRef) || attempts++ > 48) return
    requestAnimationFrame(retry)
  }
  requestAnimationFrame(retry)
}

const PaperlyLogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="paperly-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
      <linearGradient id="paperly-logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#007AFF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#paperly-logo-bg)" />
    <path d="M21 18h17a9 9 0 0 1 0 18H28v10h-7V18zm7 6v6h10a3 3 0 0 0 0-6H28z" fill="#F8FAFC" />
    <circle cx="46" cy="46" r="5" fill="url(#paperly-logo-accent)" />
  </svg>
)
/* ─── Constants ─── */
const formatSize = (bytes) => {
  if (!bytes) return "N/A"
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}


const truncateMiddle = (name, threshold = 10) => {
  if (!name) return name
  const dotIdx = name.lastIndexOf('.')
  const ext = dotIdx !== -1 ? name.slice(dotIdx) : ''
  const base = dotIdx !== -1 ? name.slice(0, dotIdx) : name
  if (base.length <= threshold) return name
  return base.slice(0, 4) + '...' + base.slice(-4) + ext
}

/* ─── Tool definitions ─── */
const TOOLS = [
  {
    id: "PDF to Image",
    label: "PDF to Image",
    desc: "Convert each page to JPG or PNG",
    icon: FileImage,
    accent: "#E53E3E",
    accentLight: "#FFF5F5",
    category: "Convert",
  },
  {
    id: "Image to PDF",
    label: "Image to PDF",
    desc: "Convert JPG, PNG into a single PDF",
    icon: FileImage,
    accent: "#DB2777",
    accentLight: "#FDF2F8",
    category: "Convert",
  },
  {
    id: "Merge PDF",
    label: "Merge PDF",
    desc: "Combine multiple PDFs into one",
    icon: GitMerge,
    accent: "#0D9488",
    accentLight: "#F0FDFB",
    category: "Organize",
  },
  {
    id: "Split PDF",
    label: "Split PDF",
    desc: "Extract pages into separate files",
    icon: Scissors,
    accent: "#D97706",
    accentLight: "#FFFBEB",
    category: "Organize",
  },
  {
    id: "Compress PDF",
    label: "Compress PDF",
    desc: "Shrink file size without quality loss",
    icon: Minimize2,
    accent: "#059669",
    accentLight: "#F0FDF4",
    category: "Optimize",
  },
  {
    id: "Protect PDF",
    label: "Protect PDF",
    desc: "AES-256 encryption & permissions",
    icon: Lock,
    accent: "#7C3AED",
    accentLight: "#F5F3FF",
    category: "Security",
  },
  {
    id: "Unlock PDF",
    label: "Unlock PDF",
    desc: "Remove password protection",
    icon: Unlock,
    accent: "#DB2777",
    accentLight: "#FDF2F8",
    category: "Security",
  },
  {
    id: "Watermark PDF",
    label: "Watermark PDF",
    desc: "Add text, image, or PDF watermarks",
    icon: StampSvgIcon,
    accent: "#7C5CFC",
    accentLight: "#F5F3FF",
    category: "Organize",
  },
  {
    id: "Clean Metadata",
    label: "Clean Metadata",
    desc: "Strip hidden author & creation info",
    icon: ShieldOff,
    accent: "#DC2626",
    accentLight: "#FEF2F2",
    category: "Security",
  },
  {
    id: "PPTX Converter",
    label: "Slides Converter",
    desc: "Convert PPTX, PPT to PDF or images",
    icon: Presentation,
    accent: "#C2410C",
    accentLight: "#FFF7ED",
    category: "Convert",
  },
  {
    id: "Word Converter",
    label: "Word Converter",
    desc: "Convert DOCX, DOC to PDF or images",
    icon: FileText,
    accent: "#1D4ED8",
    accentLight: "#EFF6FF",
    category: "Convert",
  },
  {
    id: "Excel Converter",
    label: "Excel Converter",
    desc: "Convert XLSX, CSV to PDF or images",
    icon: Table2,
    accent: "#16A34A",
    accentLight: "#F0FDF4",
    category: "Convert",
  },
  {
    id: "Rotate PDF",
    label: "Rotate PDF",
    desc: "Rotate pages 90°, 180° or 270°",
    icon: RotateCw,
    accent: "#6D28D9",
    accentLight: "#F5F3FF",
    category: "Organize",
  },
  {
    id: "Remove Pages",
    label: "Remove Pages",
    desc: "Delete selected pages from PDF",
    icon: Trash2,
    accent: "#EA580C",
    accentLight: "#FFF7ED",
    category: "Organize",
  },
]

const CATEGORIES = ["All", "Convert", "Organize", "Security", "Optimize"]

/** Brighter accent tints for labels/icons on dark card backgrounds */
const TOOL_ACCENT_ON_DARK = {
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
  '#7C5CFC': '#A78BFA',
}

function toolAccentColor(tool, theme) {
  if (theme !== 'dark') return tool.accent
  return TOOL_ACCENT_ON_DARK[tool.accent] ?? tool.accent
}

/* ─── Global styles (injected once) ─── */
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --header-height: 64px;
      --bg: #FAFAF8;
      --surface: #FFFFFF;
      --surface-2: #F5F4F0;
      --border: rgba(0,0,0,0.08);
      --border-strong: rgba(0,0,0,0.14);
      --text: #1A1A18;
      --text-2: #52524E;
      --text-3: #8C8C87;
      --accent: #0066CC;
      --accent-light: #EBF4FF;
      --success-soft: rgba(22,163,74,0.12);
      --success-border: rgba(22,163,74,0.35);
      --success-text: #15803D;
      --danger-soft: rgba(220,38,38,0.12);
      --danger-border: rgba(220,38,38,0.35);
      --danger-text: #DC2626;
      --radius-sm: 10px;
      --radius: 16px;
      --radius-lg: 22px;
      --radius-xl: 32px;
      --font-display: 'Instrument Serif', Georgia, serif;
      --font-ui: "DM Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif;
      --glass-info: rgba(255,255,255,0.62);
      --glass-info-border: rgba(0,0,0,0.08);
      --visual-sheen: rgba(255,255,255,0.7);
      --visual-shadow: rgba(0,0,0,0.04);
      --tool-visual-mid: rgba(255,255,255,0.65);
      --dropzone-empty-bg: rgba(0,0,0,0.02);
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05);
      --shadow-lg: 0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
    }

    /* Dark mode (user toggle) */
    html[data-theme='dark'] {
      --bg: #111110;
      --surface: #1C1C1A;
      --surface-2: #242422;
      --border: rgba(255,255,255,0.08);
      --border-strong: rgba(255,255,255,0.14);
      --text: #F0EFE9;
      --text-2: #C2C2BB;
      --text-3: #9A9A93;
      --accent: #4D9EFF;
      --accent-light: rgba(77,158,255,0.14);
      --success-soft: rgba(22,163,74,0.18);
      --success-border: rgba(22,163,74,0.42);
      --success-text: #4ADE80;
      --danger-soft: rgba(220,38,38,0.2);
      --danger-border: rgba(220,38,38,0.48);
      --danger-text: #F87171;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.35);
      --shadow: 0 6px 18px rgba(0,0,0,0.45);
      --shadow-lg: 0 18px 54px rgba(0,0,0,0.65);
      --glass-info: rgba(30,30,29,0.66);
      --glass-info-border: rgba(255,255,255,0.1);
      --visual-sheen: rgba(255,255,255,0.16);
      --visual-shadow: rgba(0,0,0,0.35);
      --tool-visual-mid: rgba(255,255,255,0.12);
      --dropzone-empty-bg: #191918;
    }

    html, body, #root {
      min-height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ui);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      max-width: 100%;
    }

    html {
      scrollbar-gutter: stable;
    }

    ::selection { background: var(--accent-light); color: var(--text); }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

    /* Radix dialog overlay */
    .paperly-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100;
    }

    /* Radix dialog content (recent files sheet) */
    .recent-sheet {
      position: fixed;
      top: 0; right: 0;
      width: min(480px, 95vw);
      height: 100%;
      background: var(--surface);
      border-left: 1px solid var(--border);
      z-index: 101;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
    }
    @media (max-width: 700px) {
      .recent-sheet {
        top: auto;
        right: 0;
        bottom: 0;
        width: 100%;
        height: min(82vh, 700px);
        border-left: none;
        border-top: 1px solid var(--border);
        border-radius: 18px 18px 0 0;
      }
    }

    /* Tool card hover */
    .tool-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 24px 52px;
      min-height: 292px;
      height: 100%;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.2s ease,
                  border-color 0.2s ease;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .tool-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-lg);
    }
    .tool-card::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.2s;
      border-radius: inherit;
    }
    .tool-card:hover::before { opacity: 1; }

    .tool-card-visual {
      height: 96px;
      border-radius: 14px;
      border: 1px solid var(--glass-info-border);
      background: linear-gradient(135deg, var(--visual-shadow), var(--visual-sheen));
      overflow: hidden;
      margin-bottom: 16px;
      position: relative;
    }

    .tool-card-glow {
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease;
      background: radial-gradient(
        160px 120px at var(--gx, 30%) var(--gy, 30%),
        var(--ga, rgba(0,102,204,0.12)) 0%,
        transparent 70%
      );
    }
    .tool-card:hover .tool-card-glow { opacity: 1; }

    /* Nav link style */
    .nav-link {
      display: flex; align-items: center; gap: 6px;
      font-size: 15px; font-weight: 500;
      color: var(--text-2);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 20px;
      border: none; background: none;
      transition: color 0.15s, background 0.15s;
      font-family: var(--font-ui);
      text-decoration: none;
    }
    .nav-link:hover { color: var(--text); background: var(--border); }
    .nav-link.active { color: var(--text); background: var(--surface); box-shadow: var(--shadow-sm); }

    /* Category pill */
    .cat-pill {
      font-size: 14px; font-weight: 500;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-2);
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--font-ui);
    }
    .cat-pill:hover { border-color: var(--border-strong); color: var(--text); }
    .cat-pill.active { background: var(--text); color: var(--bg); border-color: var(--text); }

    /* Recent file row */
    .recent-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      border-radius: var(--radius);
      transition: background 0.15s;
      cursor: default;
      min-width: 0;
      box-sizing: border-box;
    }
    .recent-row:hover { background: var(--surface-2); }

    /* Download icon button */
    .dl-btn {
      width: 32px; height: 32px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-3);
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .dl-btn:hover { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }

    .qr-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.2);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      z-index: 120;
    }

    .qr-modal-content {
      position: fixed;
      right: calc(min(480px, 95vw) + 12px);
      bottom: 24px;
      width: 300px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.24);
      z-index: 121;
      padding: 16px;
    }

    @media (max-width: 700px) {
      .qr-modal-content {
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        width: 100%;
        max-width: 100%;
        border-radius: 20px 20px 0 0;
        padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -4px 40px rgba(0,0,0,0.22);
      }
      .qr-sheet-handle {
        display: block;
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--border);
        margin: -8px auto 16px;
      }
    }
    .qr-sheet-handle { display: none; }

    @media (max-width: 560px) {
      :root { --header-height: 58px; }
    }

    /* Glass header */
    .glass-header {
      position: fixed; top: 0; left: 0; right: 0;
      height: var(--header-height);
      z-index: 50;
      background: rgba(250, 250, 248, 0.72);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid var(--border);
    }
    html[data-theme='dark'] .glass-header {
      background: rgba(17, 17, 16, 0.75);
      border-bottom: 1px solid var(--border);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
    }

    .icon-btn {
      width: 34px; height: 34px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: var(--shadow-sm);
    }
    .icon-btn:hover {
      border-color: var(--border-strong);
      color: var(--text);
      transform: translateY(-1px);
    }

    .header-inner {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
    }

    /* phones — smaller, lighter blobs; no animation */
    @media (max-width: 640px) {
      .aura-blob { filter: blur(56px); animation: none !important; }
    }

    .tool-category-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .tools-grid-subtitle {
      font-size: 14px;
      color: var(--text-2);
      font-weight: 500;
    }

    .brand-btn {
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0;
      min-width: 0;
      flex-shrink: 0;
    }

    .brand-wordmark {
      font-family: var(--font-ui);
      font-weight: 600;
      font-size: 19px;
      color: var(--text);
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .top-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      flex-wrap: nowrap;
      flex-shrink: 1;
      justify-content: flex-end;
    }

    .nav-link-text {
      white-space: nowrap;
    }

    /* Tool grid columns: 2 (mobile/tablet) -> 3 (desktop) */
    .tool-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: stretch;
    }
    @media (min-width: 1024px) {
      .tool-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    .tool-desc {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }

    .hero-section {
      text-align: center;
      padding: 72px 24px 56px;
      position: relative;
    }

    .tools-section {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 6px 24px 80px;
      scroll-margin-top: 100px;
    }

    .tools-section-header {
      scroll-margin-top: 100px;
    }

    .footer-tagline {
      color: var(--text-2);
      font-size: 15px;
      font-weight: 400;
    }

    @media (max-width: 900px) {
      .header-inner {
        padding: 0 14px !important;
      }
      .nav-link {
        padding: 5px 10px;
      }
      .tool-card {
        height: 274px;
        padding: 18px 16px 46px;
      }
      .tool-card-visual {
        height: 88px;
        margin-bottom: 12px;
      }
    }

    @media (max-width: 560px) {
      .hero-section {
        padding: 48px 16px 36px;
      }
      .tools-section {
        padding: 6px 16px 64px;
        scroll-margin-top: 72px;
      }
      .tools-section-header {
        scroll-margin-top: 72px;
      }
      .brand-wordmark {
        font-size: 17px;
      }
      .nav-link {
        font-size: 13px;
        gap: 5px;
        padding: 4px 7px;
      }
      .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 11px;
      }
      .top-nav .icon-btn svg {
        width: 18px;
        height: 18px;
      }
      .tool-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .tool-card {
        min-height: 220px;
        height: 100%;
        border-radius: 18px;
        padding: 14px 12px 40px;
      }
      .tool-card-visual {
        height: 74px;
        border-radius: 12px;
        margin-bottom: 10px;
      }
      .tool-card-visual-meta {
        display: none;
      }
      .footer-tagline {
        display: none;
      }
      .hero-info-grid {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 0;
      }
      .recent-row {
        padding: 12px 14px;
        gap: 10px;
      }
    }

    @media (max-width: 520px) {
      .nav-link--compact .nav-link-text {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .nav-link--compact {
        padding: 8px;
        min-width: 38px;
        min-height: 38px;
        justify-content: center;
      }
      .nav-link--compact svg {
        width: 18px;
        height: 18px;
      }
      .top-nav .icon-btn {
        width: 38px;
        height: 38px;
      }
      .brand-btn svg {
        width: 30px;
        height: 30px;
      }
    }

    @media (max-width: 430px) {
      .header-inner {
        padding: 0 10px !important;
        gap: 8px;
      }
      .top-nav {
        gap: 2px;
      }
      .nav-link {
        font-size: 12px;
        padding: 4px 6px;
      }
      .nav-link--compact {
        padding: 8px;
      }
      .nav-link--compact svg {
        width: 17px;
        height: 17px;
      }
      .brand-wordmark {
        font-size: 16px;
      }
    }

    @media (max-width: 360px) {
      .brand-wordmark {
        font-size: 15px;
      }
      .nav-link:not(.nav-link--compact) {
        padding: 4px 5px;
      }
    }

    .footer-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    @media (max-width: 760px) {
      .footer-inner {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
      }
      .footer-right {
        width: 100%;
        gap: 10px 16px;
      }
    }

    @media (max-width: 560px) {
      .app-footer {
        padding: 24px 16px !important;
      }
    }
  `}</style>
)

/* ─── Homepage aurora gradient ─── */
const PageAura = ({ theme }) => {
  const isDark = theme === 'dark'
  const [vw, setVw] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Breakpoints
  const isMobile = vw < 480
  const isTablet = vw >= 480 && vw < 768

  // ── Aurora (dark mode) ──
  // Lower amplitude on mobile so waves don't escape the canvas vertically.
  // Higher blend on mobile widens the glow band so there's no empty gap at top.
  const auroraAmplitude = isMobile ? 0.6  : isTablet ? 0.9  : 1.3
  const auroraBlend     = isMobile ? 0.65 : isTablet ? 0.58 : 0.55
  // Aurora mask: keep opacity strong all the way down on mobile — the shader
  // already fades naturally at the bottom, so we only need a gentle top cap.
  const auroraMask = isMobile
    ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, transparent 100%)'
    : isTablet
    ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 45%, transparent 95%)'
    : 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 35%, transparent 90%)'

  // ── Grainient (light mode) ──
  const grainZoom         = isMobile ? 1.1  : isTablet ? 0.95 : 0.85
  const grainWarpStrength = isMobile ? 0.7  : isTablet ? 0.95 : 1.2
  const grainWarpSpeed    = isMobile ? 1.2  : isTablet ? 1.6  : 2.0
  const grainContrast     = isMobile ? 1.15 : isTablet ? 1.22 : 1.3
  const grainMask = isMobile
    ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 50%, transparent 95%)'
    : isTablet
    ? 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 40%, transparent 92%)'
    : 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 35%, transparent 90%)'

  const maskImage = isDark ? auroraMask : grainMask

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        WebkitMaskImage: maskImage,
        maskImage: maskImage,
        opacity: isDark ? 0.85 : 0.70,
      }}
    >
      {isDark ? (
        <Aurora
          colorStops={['#3B82F6', '#8B5CF6', '#06B6D4']}
          amplitude={auroraAmplitude}
          blend={auroraBlend}
          speed={0.6}
          frequency={0.8}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Grainient
          color1="#60A5FA"
          color2="#A78BFA"
          color3="#F472B6"
          timeSpeed={0.35}
          warpStrength={grainWarpStrength}
          warpSpeed={grainWarpSpeed}
          grainAmount={0.08}
          contrast={grainContrast}
          saturation={1.1}
          zoom={grainZoom}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}

/* ─── Header component ─── */
const Header = ({ onRecentOpen, activeTool, onLogoClick, onToolsClick, theme, onToggleTheme }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className="glass-header" style={{ transition: 'box-shadow 0.3s', boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.08)' : 'none' }}>
      <div className="header-inner">

        {/* Logo */}
        <button className="brand-btn" onClick={onLogoClick}>
          <PaperlyLogoMark size={28} />
          <span className="brand-wordmark">
            paper<span style={{ color: 'var(--accent)' }}>.ly</span>
          </span>
        </button>

        {/* Nav */}
        <nav className="top-nav">
          <button className="nav-link nav-link--compact" onClick={onRecentOpen} aria-label="Recent files">
            <Clock size={16} />
            <span className="nav-link-text">Recent</span>
          </button>
          <a className="nav-link nav-link--compact" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
            <GithubIcon size={16} />
            <span className="nav-link-text">GitHub</span>
          </a>
          <button className="icon-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </div>
    </header>
  )
}

/* ─── Hero component ─── */
const Hero = ({ onExplore }) => (
  <section className="hero-section">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-light)', border: '1px solid rgba(0,102,204,0.15)', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
        <Sparkles size={12} color="var(--accent)" />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', letterSpacing: '0.02em' }}>No sign-up · No watermarks · 100% free</span>
      </div>
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'relative',
        zIndex: 1,
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(42px, 6vw, 72px)',
        fontWeight: 400,
        color: 'var(--text)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        marginBottom: 20,
        maxWidth: 700,
        margin: '0 auto 20px',
      }}
    >
      PDF tools that{' '}
      <em style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>just work.</em>
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ position: 'relative', zIndex: 1, fontSize: 18, color: 'var(--text-2)', fontWeight: 300, maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.6 }}
    >
      Compress, merge, split, protect, convert. All in one clean place.
    </motion.p>

    {/* Responsive Info Cards */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 760,
        margin: '0 auto 34px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'clamp(10px, 2.5vw, 12px)',
        padding: '0 clamp(6px, 2vw, 12px)',
      }}
      className="hero-info-grid"
    >
      {[
        { title: 'Zero friction access', desc: 'Jump straight in — ready to use.', icon: Wifi },
        { title: 'Files stay private', desc: 'Nothing is retained on our servers.', icon: ShieldCheck },
        { title: 'Deploy anywhere', desc: 'Self-host for complete control.', icon: Server },
        { title: 'Fully open source', desc: 'Audit or fork it on GitHub.', icon: ExternalLink },
      ].map((i) => {
        const InfoIcon = i.icon
        return (
          <div
            key={i.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(10px, 3vw, 12px)',
              background: 'var(--glass-info)',
              border: '1px solid var(--glass-info-border)',
              borderRadius: 'clamp(16px, 4vw, 20px)',
              padding: 'clamp(12px, 3vw, 16px)',
              boxShadow: 'var(--shadow-sm)',
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              minWidth: 0,
              width: '100%',
            }}
          >
            <div style={{ 
              width: 'clamp(32px, 8vw, 40px)', 
              height: 'clamp(32px, 8vw, 40px)', 
              borderRadius: 'clamp(8px, 2vw, 12px)', 
              background: 'var(--accent-light)', 
              border: '1px solid rgba(0,102,204,0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              <InfoIcon size={18} color="var(--accent)" />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
              <p style={{ 
                fontSize: 'clamp(14px, 3.5vw, 16px)', 
                fontWeight: 600, 
                color: 'var(--text)', 
                margin: 0, 
                letterSpacing: '-0.01em', 
                lineHeight: 1.3,
                marginBottom: 2
              }}>{i.title}</p>
              <p style={{ 
                fontSize: 'clamp(12px, 3vw, 13px)', 
                color: 'var(--text-3)', 
                margin: 0, 
                fontWeight: 300, 
                lineHeight: 1.4 
              }}>{i.desc}</p>
            </div>
          </div>
        )
      })}
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.28 }}
      style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}
    >
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'var(--text)', color: 'var(--bg)',
          padding: '11px 22px', borderRadius: 24,
          fontSize: 14, fontWeight: 500, textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <GithubIcon size={15} />
        View on GitHub
      </a>
      <button
        type="button"
        onClick={onExplore}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          color: 'var(--accent)',
          background: 'var(--accent-light)',
          padding: '11px 24px', borderRadius: 24,
          fontSize: 14, fontWeight: 600,
          border: '1px solid rgba(0,102,204,0.28)',
          transition: 'all 0.15s',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        Explore tools
        <ArrowRight size={14} />
      </button>
    </motion.div>
  </section>
)

/* ─── Tool card ─── */
const ToolCard = ({ tool, index, onClick, theme }) => {
  const Icon = tool.icon
  const [glow, setGlow] = useState({ x: 30, y: 30 })
  const labelAccent = toolAccentColor(tool, theme)
  const isDark = theme === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ height: '100%' }}
    >
      <div
        className="tool-card"
        onClick={() => onClick(tool.id)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * 100
          const y = ((e.clientY - r.top) / r.height) * 100
          setGlow({ x, y })
        }}
        style={{
          '--ga': `${tool.accent}22`,
          '--gx': `${glow.x}%`,
          '--gy': `${glow.y}%`,
        }}
      >
        <div className="tool-card-glow" />

        {/* Visual preview — single tool accent (no multi-color mesh) */}
        <div className="tool-card-visual" style={{
          background:
            `linear-gradient(135deg, ${tool.accent}14 0%, var(--tool-visual-mid) 48%, ${tool.accent}10 100%)`,
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background:
              `radial-gradient(140px 90px at 20% 30%, ${tool.accent}18, transparent 60%),` +
              `radial-gradient(180px 120px at 80% 70%, ${isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)'}, transparent 62%)`,
          }} />
          <div className="tool-card-visual-meta" style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: isDark ? `${labelAccent}20` : tool.accentLight,
              border: `1px solid ${isDark ? `${labelAccent}44` : `${tool.accent}22`}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 10px 24px ${tool.accent}10`,
            }}>
              <Icon size={18} color={labelAccent} strokeWidth={1.6} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
              <div className="tool-category-label" style={{ color: labelAccent }}>{tool.category}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.label}</div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
          {tool.label}
        </h3>

        {/* Desc */}
        <p className="tool-desc" style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, fontWeight: 300, paddingRight: 26 }}>
          {tool.desc}
        </p>

        <div style={{ position: 'absolute', bottom: 18, right: 18, opacity: 0.8 }}>
          <CircleArrowRight size={19} color="var(--text-2)" strokeWidth={1.7} />
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Tool grid ─── */
const ToolGrid = ({ onSelect, toolsRef, toolsScrollTargetRef, theme }) => {
  const [category, setCategory] = useState("All")

  const filtered = category === "All" ? TOOLS : TOOLS.filter(t => t.category === category)

  return (
    <section
      ref={toolsRef}
      id="tools"
      className="tools-section"
    >

      {/* Section header — scroll target for Explore tools / header Tools */}
      <div
        ref={toolsScrollTargetRef}
        className="tools-section-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4 }}>
            {category === 'All' ? 'All tools' : `${category} tools`}
          </h2>
          <p className="tools-grid-subtitle">
            {filtered.length} {filtered.length === 1 ? 'tool' : 'tools'}
          </p>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="tool-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} onClick={onSelect} theme={theme} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ─── Recent files sheet ─── */
const RecentSheet = ({ open, onClose, theme }) => {
  const config = useServerConfig()
  const retentionHours = getRetentionHours(config)
  const recentSubtitle = getRecentFilesSubtitle(config)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [qrFile, setQrFile] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    axios.get(`${API_BASE}/files`, { params: { user_id: getUserId() }, timeout: 15000 })
      .then(r => setFiles(r.data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) setQrFile(null)
  }, [open])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const downloadFile = async (file) => {
    try {
      await downloadRemoteFile(file.url, file.file_name)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const toolMeta = (toolName) => TOOLS.find(t => t.id === toolName)

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="paperly-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="recent-sheet"
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                {/* Header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Dialog.Title style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
                      Recent files
                    </Dialog.Title>
                    <Dialog.Description style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, fontFamily: 'var(--font-ui)', fontWeight: 400 }}>
                      {recentSubtitle}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button style={{ width: 30, height: 30, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}>
                      <X size={14} />
                    </button>
                  </Dialog.Close>
                </div>
                {/* Content */}
                <ScrollArea.Root style={{ flex: 1, overflow: 'hidden' }}>
                  <ScrollArea.Viewport style={{ height: '100%', padding: '12px 8px' }}>
                    {loading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{ height: 60, borderRadius: 12, background: 'var(--surface-2)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        ))}
                      </div>
                    ) : files.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-3)' }}>
                        <Clock size={32} strokeWidth={1} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ fontSize: 14, fontWeight: 400 }}>No recent files</p>
                        <p style={{ fontSize: 13, marginTop: 4, fontWeight: 300 }}>{recentSubtitle}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {files.map(f => {
                          const meta = toolMeta(f.tool)
                          const Icon = meta?.icon
                          const isDark = theme === 'dark'
                          const iconAccent = meta ? toolAccentColor(meta, theme) : null
                          const iconBg = meta
                            ? (isDark ? `${iconAccent}28` : meta.accentLight)
                            : 'var(--surface-2)'
                          return (
                            <div key={f.id} className="recent-row">
                              {/* Icon */}
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: iconBg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {Icon ? <Icon size={16} color={iconAccent ?? 'var(--text-3)'} strokeWidth={1.6} /> : <Clock size={16} color="var(--text-3)" strokeWidth={1.6} />}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {truncateMiddle(cleanDownloadFilename(f.file_name, f.url))}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 300 }}>
                                  {formatSize(f.file_size_bytes)}
                                  {(() => {
                                    const left = formatTimeLeft(f.created_at, retentionHours)
                                    if (left == null) return ' · no expiry set by host'
                                    return ` · ${left} left`
                                  })()}
                                </p>
                              </div>

                              {/* Download */}
                              <button className="dl-btn" onClick={() => downloadFile(f)} title="Download">
                                <Download size={13} />
                              </button>
                              <button className="dl-btn" onClick={() => setQrFile(f)} title="Show QR code">
                                <QrCode size={13} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar orientation="vertical" style={{ width: 4, padding: '2px 0' }}>
                    <ScrollArea.Thumb style={{ background: 'var(--border-strong)', borderRadius: 2 }} />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>

                <AnimatePresence>
                  {qrFile && (
                    <>
                      <motion.div
                        className="qr-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setQrFile(null)}
                      />
                      <motion.div
                        className="qr-modal-content"
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                              {truncateMiddle(cleanDownloadFilename(qrFile.file_name, qrFile.url), 26)}
                            </p>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.3 }}>
                              Scan to download
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setQrFile(null)}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0, transition: 'all 0.15s' }}
                            title="Close"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'white', padding: 8, boxShadow: 'var(--shadow-sm)' }}>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(withDownloadParam(toAbsoluteUrl(qrFile.url), cleanDownloadFilename(qrFile.file_name, qrFile.url)))}`}
                              alt="QR code"
                              style={{ display: 'block', width: 160, height: 160 }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => downloadFile(qrFile)}
                            style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px 14px', background: 'var(--accent)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.15)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)' }}
                          >
                            <Download size={14} />
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(qrFile.url)
                                toast.success('Link copied')
                              } catch {
                                toast.error('Copy failed')
                              }
                            }}
                            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
                          >
                            <Copy size={14} />
                            Copy link
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>

      {/* QR popup rendered into document.body so position:fixed is relative to viewport */}
      {createPortal(
        <AnimatePresence>
          {qrFile && (
            <>
              <motion.div
                className="qr-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQrFile(null)}
              />
              <motion.div
                className="qr-modal-content"
                initial={{ opacity: 0, y: window.innerWidth <= 700 ? 80 : 0, x: window.innerWidth <= 700 ? 0 : 20, scale: window.innerWidth <= 700 ? 1 : 0.95 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{ opacity: 0, y: window.innerWidth <= 700 ? 80 : 0, x: window.innerWidth <= 700 ? 0 : 20, scale: window.innerWidth <= 700 ? 1 : 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="qr-sheet-handle" />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                      {truncateMiddle(cleanDownloadFilename(qrFile.file_name, qrFile.url), 26)}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.3 }}>
                      Scan to download
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrFile(null)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0, transition: 'all 0.15s' }}
                    title="Close"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'white', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(withDownloadParam(toAbsoluteUrl(qrFile.url), cleanDownloadFilename(qrFile.file_name, qrFile.url)))}`}
                      alt="QR code"
                      style={{ display: 'block', width: 220, height: 220 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => downloadFile(qrFile)}
                    style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px 14px', background: 'var(--accent)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)' }}
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(qrFile.url)
                        toast.success('Link copied')
                      } catch {
                        toast.error('Copy failed')
                      }
                    }}
                    style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
                  >
                    <Copy size={14} />
                    Copy link
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Dialog.Root>
  )
}

/* ─── Footer ─── */
const Footer = () => {
  return (
    <footer className="app-footer" style={{ borderTop: '1px solid var(--border)', padding: '32px 24px', marginTop: 'auto' }}>
    <div className="footer-inner">
      <div className="footer-left">
        <PaperlyLogoMark size={20} />
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>
          paper<span style={{ color: 'var(--accent)' }}>.ly</span>
        </span>
        <span className="footer-tagline">PDF made easy. It&apos;s free.</span>
      </div>

      <div className="footer-right">
        <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>
          v4.0
        </span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
        >
          <GithubIcon size={14} />
          Source code
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  </footer>
  )
}

const TOOL_VIEW_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
}

/* ─── Tool view wrapper ─── */
const ToolView = ({ toolId, onBack, onComplete }) => {
  useLayoutEffect(() => {
    scrollWindowToTop('auto')
  }, [toolId])

  const components = {
    "PDF to Image":   PdfToImage,
    "Image to PDF":   ImageToPdf,
    "Merge PDF":      MergePdf,
    "Protect PDF":    ProtectPdf,
    "Unlock PDF":     UnlockPdf,
    "Split PDF":      SplitPdf,
    "Remove Pages":   RemovePages,
    "Compress PDF":   CompressPdf,
    "Clean Metadata": CleanMetadata,
    "PPTX Converter": PptxConverter,
    "Word Converter": DocxConverter,
    "Excel Converter":ExcelConverter,
    "Rotate PDF":     RotatePdf,
    "Watermark PDF":  WatermarkPdf,
  }
  const Component = components[toolId]
  const toolMeta = TOOLS.find(t => t.id === toolId)
  if (!Component) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={TOOL_VIEW_TRANSITION}
      style={{ paddingTop: 'var(--header-height)', scrollMarginTop: 'var(--header-height)', position: 'relative', zIndex: 2, background: 'var(--bg)' }}
    >
      <Component onBack={onBack} tool={toolMeta} onComplete={onComplete} />
    </motion.div>
  )
}

/* ─── Root app ─── */
export default function App() {
  const [activeTool, setActiveTool] = useState(null)
  const [downloadReady, setDownloadReady] = useState(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const toolsRef = useRef(null)
  const toolsScrollTargetRef = useRef(null)
  const cachedToolsScrollTopRef = useRef(0)
  const [theme, setTheme] = useState(() => {
    // If user manually picked a theme before, honour it.
    // Otherwise default to the OS preference.
    const saved = localStorage.getItem('paperly_theme')
    const manual = localStorage.getItem('paperly_theme_manual')
    if (saved && manual) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 520)
  const suppressNextHistoryPushRef = useRef(false)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 520)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('paperly_theme', theme)
  }, [theme])

  // Follow OS theme changes — only when the user hasn't manually overridden
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      // If the stored value was set by the OS detection (not a manual toggle),
      // keep following the OS. We detect this by checking if stored value
      // matches what the OS currently reports before the change.
      const stored = localStorage.getItem('paperly_theme_manual')
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('paperly_theme_manual', '1')
      return next
    })
  }

  const currentView = downloadReady ? 'download' : activeTool ? 'tool' : 'home'

  useEffect(() => {
    window.history.replaceState(
      { view: currentView, toolId: activeTool, downloadReady },
      '',
      window.location.href
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (suppressNextHistoryPushRef.current) {
      suppressNextHistoryPushRef.current = false
      return
    }
    window.history.pushState(
      { view: currentView, toolId: activeTool, downloadReady },
      '',
      window.location.href
    )
  }, [currentView, activeTool, downloadReady])

  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state || { view: 'home' }
      suppressNextHistoryPushRef.current = true
      if (state.view === 'tool' && state.toolId) {
        setDownloadReady(null)
        setActiveTool(state.toolId)
        return
      }
      if (state.view === 'download' && state.downloadReady) {
        setActiveTool(null)
        setDownloadReady({
          ...state.downloadReady,
          fileName: cleanDownloadFilename(
            state.downloadReady.fileName,
            state.downloadReady.url
          ),
        })
        return
      }
      setDownloadReady(null)
      setActiveTool(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (activeTool || downloadReady) return
    const updateCache = () => {
      const measured = measureToolsScrollTop(toolsScrollTargetRef)
      if (measured != null) cachedToolsScrollTopRef.current = measured
    }
    updateCache()
    window.addEventListener('resize', updateCache)
    return () => window.removeEventListener('resize', updateCache)
  }, [activeTool, downloadReady])

  const scrollToTools = () => {
    scrollToToolsWhenReady(toolsScrollTargetRef, cachedToolsScrollTopRef)
  }

  const goHome = () => {
    setDownloadReady(null)
    setActiveTool(null)
  }

  const handleBack = () => {
    goHome()
    scrollWindowToTop('smooth')
  }

  const handleLogoClick = () => {
    if (downloadReady || activeTool) {
      goHome()
      scrollWindowToTop('smooth')
      return
    }
    scrollWindowToTop('smooth')
  }

  const handleToolsNav = () => {
    if (downloadReady || activeTool) {
      flushSync(() => goHome())
      scrollToToolsWhenReady(toolsScrollTargetRef, cachedToolsScrollTopRef)
      return
    }
    scrollToTools()
  }

  const handleConversionComplete = (payload) => {
    if (!payload?.url || !payload?.file_name) return
    setDownloadReady({
      url: payload.url,
      fileName: cleanDownloadFilename(payload.file_name, payload.url),
      createdAt: payload.created_at || new Date().toISOString(),
      toolLabel: TOOLS.find((t) => t.id === activeTool)?.label || activeTool || 'Tool',
    })
    setActiveTool(null)
    scrollWindowToTop('smooth')
  }

  return (
    <ServerConfigProvider>
    <Tooltip.Provider>
      <GlobalStyles />
      <Toaster
        position={isMobile ? 'top-center' : 'top-right'}
        toastOptions={{
          style: {
            background: 'var(--text)', color: 'var(--bg)',
            fontFamily: 'var(--font-ui)', fontSize: 14,
            borderRadius: 12, padding: '10px 16px',
            boxShadow: 'var(--shadow-lg)',
          },
          duration: 4000,
        }}
      />

      {/* Header always visible */}
      <Header
        onRecentOpen={() => setRecentOpen(true)}
        activeTool={activeTool}
        onLogoClick={handleLogoClick}
        onToolsClick={handleToolsNav}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {currentView === 'home' && <PageAura theme={theme} />}

      {/* Recent files slide-in sheet */}
      <RecentSheet open={recentOpen} onClose={() => setRecentOpen(false)} theme={theme} />

      {/* Main content */}
      <motion.main
        key="home"
        aria-hidden={!!(activeTool || downloadReady)}
        initial={false}
        animate={{ opacity: activeTool || downloadReady ? 0 : 1 }}
        transition={{ duration: 0.18, ease: 'easeIn' }}
        style={{
          minHeight: '100vh',
          display: activeTool || downloadReady ? 'none' : 'flex',
          flexDirection: 'column',
          paddingTop: 'var(--header-height)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Hero onExplore={scrollToTools} />
        <ToolGrid
          theme={theme}
          toolsRef={toolsRef}
          toolsScrollTargetRef={toolsScrollTargetRef}
          onSelect={(toolId) => setActiveTool(toolId)}
        />
        <Footer />
      </motion.main>

      <AnimatePresence>
        {downloadReady ? (
          <DownloadReadyPage
            key="download-ready"
            data={downloadReady}
            onBackHome={handleBack}
          />
        ) : activeTool ? (
          <ToolView
            key={activeTool}
            toolId={activeTool}
            onBack={handleBack}
            onComplete={handleConversionComplete}
          />
        ) : null}
      </AnimatePresence>
    </Tooltip.Provider>
    </ServerConfigProvider>
  )
}
