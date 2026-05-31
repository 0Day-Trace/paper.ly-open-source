/**
 * paperly — Apple-inspired PDF tools
 * 
 * Dependencies to install:
 *   npm install framer-motion @radix-ui/react-dialog @radix-ui/react-tabs
 *              @radix-ui/react-tooltip @radix-ui/react-scroll-area
 *              lucide-react react-hot-toast axios
 * 
 * Google Fonts (add to public/index.html <head>):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
 */

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
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
import DownloadReadyPage from './components/DownloadReadyPage'
import { ServerConfigProvider, useServerConfig } from './context/ServerConfigContext'
import {
  API_BASE,
  GITHUB_URL,
  getUserId,
  formatTimeLeft,
  getRecentFilesSubtitle,
  getRetentionHours,
  getStorageNotice,
} from './config'
import { downloadRemoteFile, cleanDownloadFilename, toAbsoluteUrl, withDownloadParam } from './download'

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
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


const truncateFilename = (name, max = 32) => {
  if (!name || name.length <= max) return name
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ""
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 2
  return base.slice(0, Math.ceil(keep / 2)) + "…" + base.slice(-Math.floor(keep / 2)) + ext
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
    id: "Remove Pages",
    label: "Remove Pages",
    desc: "Delete selected pages from PDF",
    icon: Trash2,
    accent: "#EA580C",
    accentLight: "#FFF7ED",
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
      --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "DM Sans", sans-serif;
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
      background: rgba(0,0,0,0.36);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 120;
    }

    .qr-modal-content {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(420px, calc(100vw - 24px));
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: var(--shadow-lg);
      z-index: 121;
      padding: 18px;
    }

    @media (max-width: 700px) {
      .qr-modal-content {
        top: auto;
        left: 0;
        right: 0;
        bottom: 0;
        transform: none;
        width: 100%;
        border-radius: 18px 18px 0 0;
      }
    }

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

    /* Homepage gradient — static base + one slow layer (desktop); static on phone */
    .page-aura {
      position: fixed;
      top: var(--header-height);
      left: 0;
      right: 0;
      height: min(520px, 64vh);
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      background: var(--bg);
      -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 96%);
      mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 96%);
    }

    html:not([data-theme='dark']) .page-aura {
      height: min(560px, 68vh);
      -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 58%, transparent 98%);
      mask-image: linear-gradient(to bottom, #000 0%, #000 58%, transparent 98%);
    }

    .page-aura-base,
    .page-aura-shift {
      position: absolute;
      inset: -30% -10%;
      pointer-events: none;
      background:
        radial-gradient(ellipse 62% 52% at 18% 36%, rgba(0, 122, 255, 0.26), transparent 72%),
        radial-gradient(ellipse 56% 48% at 82% 28%, rgba(175, 82, 222, 0.22), transparent 70%),
        radial-gradient(ellipse 52% 46% at 56% 76%, rgba(255, 45, 85, 0.18), transparent 68%),
        radial-gradient(ellipse 50% 44% at 34% 60%, rgba(90, 200, 250, 0.2), transparent 70%),
        radial-gradient(ellipse 44% 40% at 70% 56%, rgba(255, 149, 0, 0.14), transparent 66%),
        radial-gradient(ellipse 42% 38% at 50% 40%, rgba(88, 86, 214, 0.14), transparent 64%);
    }

    .page-aura-shift {
      display: none;
      opacity: 0.65;
      background:
        radial-gradient(ellipse 62% 52% at 28% 42%, rgba(0, 122, 255, 0.22), transparent 72%),
        radial-gradient(ellipse 56% 48% at 72% 34%, rgba(175, 82, 222, 0.18), transparent 70%),
        radial-gradient(ellipse 52% 46% at 48% 68%, rgba(255, 45, 85, 0.15), transparent 68%),
        radial-gradient(ellipse 50% 44% at 44% 52%, rgba(90, 200, 250, 0.16), transparent 70%),
        radial-gradient(ellipse 44% 40% at 60% 62%, rgba(255, 149, 0, 0.12), transparent 66%),
        radial-gradient(ellipse 42% 38% at 58% 48%, rgba(88, 86, 214, 0.12), transparent 64%);
    }

    html[data-theme='dark'] .page-aura-base {
      background:
        radial-gradient(ellipse 62% 52% at 18% 36%, rgba(96, 165, 250, 0.22), transparent 72%),
        radial-gradient(ellipse 56% 48% at 82% 28%, rgba(192, 132, 252, 0.18), transparent 70%),
        radial-gradient(ellipse 52% 46% at 56% 76%, rgba(244, 114, 182, 0.15), transparent 68%),
        radial-gradient(ellipse 50% 44% at 34% 60%, rgba(56, 189, 248, 0.16), transparent 70%),
        radial-gradient(ellipse 44% 40% at 70% 56%, rgba(251, 191, 36, 0.12), transparent 66%),
        radial-gradient(ellipse 42% 38% at 50% 40%, rgba(129, 140, 248, 0.12), transparent 64%);
    }

    html[data-theme='dark'] .page-aura-shift {
      background:
        radial-gradient(ellipse 62% 52% at 28% 42%, rgba(96, 165, 250, 0.18), transparent 72%),
        radial-gradient(ellipse 56% 48% at 72% 34%, rgba(192, 132, 252, 0.15), transparent 70%),
        radial-gradient(ellipse 52% 46% at 48% 68%, rgba(244, 114, 182, 0.12), transparent 68%),
        radial-gradient(ellipse 50% 44% at 44% 52%, rgba(56, 189, 248, 0.13), transparent 70%),
        radial-gradient(ellipse 44% 40% at 60% 62%, rgba(251, 191, 36, 0.1), transparent 66%),
        radial-gradient(ellipse 42% 38% at 58% 48%, rgba(129, 140, 248, 0.1), transparent 64%);
    }

    @media (min-width: 768px) and (prefers-reduced-motion: no-preference) {
      .page-aura-shift {
        display: block;
        will-change: transform;
        transform: translate3d(0, 0, 0);
        animation: page-aura-glide 40s ease-in-out infinite alternate;
      }
    }

    @keyframes page-aura-glide {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(-2.5%, 1.5%, 0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .page-aura-shift { display: none !important; }
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

/* ─── Homepage ambient gradient (sits flush under fixed header) ─── */
const PageAura = () => (
  <div className="page-aura" aria-hidden="true">
    <div className="page-aura-base" />
    <div className="page-aura-shift" />
  </div>
)

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
          <button className={`nav-link ${!activeTool ? 'active' : ''}`} onClick={onToolsClick}>
            Tools
          </button>
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
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', letterSpacing: '0.02em' }}>Free · Private · Open source</span>
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
      Compress, merge, split, protect, convert. All in one clean place with no sign-up and no watermarks.
    </motion.p>

    {/* Info block */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 720,
        margin: '0 auto 34px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        padding: '0 6px',
      }}
      className="hero-info-grid"
    >
      {[
        { title: 'Self-hostable', desc: 'Run it on your own server.', icon: Server },
        { title: 'Offline compatible', desc: 'Works without an account.', icon: Wifi },
        { title: 'Privacy-first', desc: 'No data stored on our servers.', icon: ShieldCheck },
        { title: 'Open source', desc: 'Available on GitHub.', icon: ExternalLink },
      ].map((i) => {
        const InfoIcon = i.icon
        return (
          <div
            key={i.title}
            style={{
              textAlign: 'left',
              background: 'var(--glass-info)',
              border: '1px solid var(--glass-info-border)',
              borderRadius: 16,
              padding: '12px 14px',
              boxShadow: 'var(--shadow-sm)',
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InfoIcon size={13} color="var(--text-2)" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>{i.title}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', fontWeight: 300, lineHeight: 1.4 }}>{i.desc}</p>
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
            {filtered.length} {filtered.length === 1 ? 'tool' : 'tools'} · no account needed
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
  const { accent, title, message } = getStorageNotice(config)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [qrFile, setQrFile] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    axios.get(`${API_BASE}/files`, { params: { user_id: getUserId() } })
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
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, minWidth: 0 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {truncateMiddle(cleanDownloadFilename(qrFile.file_name, qrFile.url))}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                              Scan to download on any device
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setQrFile(null)}
                            style={{ width: 30, height: 30, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}
                            title="Close QR modal"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0 14px' }}>
                          <div style={{ borderRadius: 14, border: '1px solid var(--border)', background: '#fff', padding: 10 }}>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(withDownloadParam(toAbsoluteUrl(qrFile.url), cleanDownloadFilename(qrFile.file_name, qrFile.url)))}`}
                              alt="QR code for file download"
                              style={{ display: 'block', width: 220, height: 220 }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => downloadFile(qrFile)}
                            style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'var(--accent)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)' }}
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
                            style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)' }}
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
          v2.0
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
  const [theme, setTheme] = useState(() => localStorage.getItem('paperly_theme') || 'light')
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

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

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

      {currentView === 'home' && <PageAura />}

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
