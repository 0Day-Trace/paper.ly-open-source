import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { ArrowUpDown, FileImage, FileStack, GripVertical, Images, Plus, Trash2 } from 'lucide-react'
import ToolShell from './components/ToolShell'
import VerticalReorderList from './components/VerticalReorderList'
import ReorderMoveButtons from './components/ReorderMoveButtons'
import { mergeDraggableStyle, moveListItem, reorderRowShell, rowDragHandleStyle } from './dndStyles'
import { primaryActionBg, primaryActionColor } from './toolUi'
import useTheme from './hooks/useTheme'
import useSlowWarning from './hooks/useSlowWarning'
import { resolveAccent } from './toolUi'

const truncateFilename = (name, max = 28) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 3
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
}

const formatSize = (bytes) => {
  if (!bytes) return 'N/A'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export default function ImageToPdfTool({ onBack, tool, onComplete }) {
  const [images, setImages] = useState([])
  const [paperSize, setPaperSize] = useState('fit')
  const [orientation, setOrientation] = useState('portrait')
  const [margin, setMargin] = useState('none')
  const [outputMode, setOutputMode] = useState('merged')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const inputRef = useRef(null)

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#DB2777', theme)
  const slowWarning = useSlowWarning(loading)

  // Revoke all object URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      setImages((prev) => {
        prev.forEach((img) => { if (img.preview) URL.revokeObjectURL(img.preview) })
        return prev
      })
    }
  }, [])

  const totalBytes = useMemo(() => images.reduce((acc, img) => acc + (img.size || 0), 0), [images])
  const selectStyle = {
    padding: '10px 36px 10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontFamily: 'var(--font-ui)',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238C8C87' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '14px',
  }

  const addImages = useCallback((files) => {
    const imgs = Array.from(files || [])
      .filter((f) => f?.type?.startsWith('image/'))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        preview: URL.createObjectURL(f),
      }))
    if (!imgs.length) return
    setImages((prev) => [...prev, ...imgs])
    setError('')
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    addImages(e.dataTransfer.files)
  }, [addImages])

  const onDragEnd = (result) => {
    if (!result.destination) return
    setImages((prev) => {
      const next = Array.from(prev)
      const [moved] = next.splice(result.source.index, 1)
      next.splice(result.destination.index, 0, moved)
      return next
    })
  }

  const moveImage = (index, delta) => {
    setImages((prev) => moveListItem(prev, index, delta))
  }

  const toggleSort = () => {
    const nextAsc = !sortAsc
    setSortAsc(nextAsc)
    setImages((prev) => [...prev].sort((a, b) => (
      nextAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )))
  }

  const handleConvert = async () => {
    if (!images.length) return setError('Add at least one image.')
    setLoading(true)
    setError('')
    const fd = new FormData()
    images.forEach((img) => fd.append('files', img.file))
    fd.append('paper_size', paperSize)
    fd.append('orientation', orientation)
    fd.append('margin', margin)
    fd.append('output_mode', outputMode)
    fd.append('user_id', getUserId())
    try {
      const res = await axios.post(`${API_BASE}/image-to-pdf`, fd)
      const { url, file_name: fileName, created_at } = res.data
      if (onComplete) {
        onComplete({ url, file_name: fileName, created_at })
      } else {
        await downloadRemoteFile(url, fileName)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolShell tool={tool} onBack={onBack}>
        <div onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} style={{ border: `1.5px dashed var(--border-strong)`, borderRadius: 20, padding: '28px 22px', background: images.length ? 'var(--surface)' : 'var(--dropzone-empty-bg)', cursor: 'pointer' }}>
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 16, background: 'var(--surface-2)', border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}><Images size={20} strokeWidth={1.8} /></div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Drop images here or click to browse</p>
                <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', margin: '4px 0 0' }}>{images.length ? `${images.length} files · ${formatSize(totalBytes)} total` : 'JPG, PNG, WEBP, BMP, TIFF'}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
              {images.length ? 'Drag the grip or use arrows to reorder' : 'Images will appear here after upload'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toggleSort} style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', borderRadius: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)' }}><ArrowUpDown size={14} />Sort</button>
              <button onClick={() => inputRef.current?.click()} style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', borderRadius: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)' }}><Plus size={14} />Add</button>
            </div>
          </div>

          {images.length > 0 && (
            <VerticalReorderList droppableId="images" onDragEnd={onDragEnd}>
              {() => images.map((img, index) => (
                <Draggable key={img.id} draggableId={img.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      style={mergeDraggableStyle(dragProvided.draggableProps.style, snapshot, reorderRowShell(snapshot, accent))}
                    >
                      <div {...dragProvided.dragHandleProps} style={rowDragHandleStyle} aria-label="Drag to reorder">
                        <GripVertical size={18} strokeWidth={2} />
                      </div>
                      <div className="reorder-row-body">
                        <div className="reorder-row-main">
                          <span className="reorder-row-index">{index + 1}</span>
                          <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: 10,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'rgba(0,0,0,0.04)',
                            border: '1px solid var(--border)',
                          }}>
                            <img
                              src={img.preview}
                              alt=""
                              draggable={false}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                pointerEvents: 'none',
                                userSelect: 'none',
                              }}
                            />
                          </div>
                          <div className="reorder-row-info">
                            <p className="reorder-row-info-title">
                              {truncateFilename(img.name, 36)}
                            </p>
                            <p className="reorder-row-info-meta">
                              {formatSize(img.size)}
                            </p>
                          </div>
                        </div>
                        <div className="reorder-row-actions">
                          <ReorderMoveButtons
                            index={index}
                            total={images.length}
                            onMoveUp={() => moveImage(index, -1)}
                            onMoveDown={() => moveImage(index, 1)}
                          />
                          <button
                            type="button"
                            className="reorder-action-btn reorder-delete-btn"
                            aria-label="Remove image"
                            onClick={() => {
                              URL.revokeObjectURL(img.preview)
                              setImages((prev) => prev.filter((f) => f.id !== img.id))
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
            </VerticalReorderList>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>Paper size<select value={paperSize} onChange={(e) => setPaperSize(e.target.value)} style={selectStyle}><option value="fit">Fit (default)</option><option value="a4">A4</option><option value="a3">A3</option><option value="a2">A2</option><option value="letter">Letter</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>Orientation<select value={orientation} onChange={(e) => setOrientation(e.target.value)} style={selectStyle}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>Margin<select value={margin} onChange={(e) => setMargin(e.target.value)} style={selectStyle}><option value="none">None</option><option value="small">Small (10mm)</option><option value="large">Large (20mm)</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>Output<select value={outputMode} onChange={(e) => setOutputMode(e.target.value)} style={selectStyle}><option value="merged">1 PDF</option><option value="separate">ZIP (one PDF per image)</option></select></label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: 'var(--text-2)' }}><FileImage size={12} /><span>{images.length} images</span></div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: 'var(--text-2)' }}><FileStack size={12} /><span>{outputMode === 'merged' ? '1 PDF' : 'ZIP output'}</span></div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleConvert} disabled={loading || images.length < 1} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: primaryActionBg(images.length >= 1), border: `1px solid ${images.length < 1 ? 'var(--border)' : 'var(--accent)'}`, borderRadius: 18, color: primaryActionColor(images.length >= 1), padding: '13px 18px', cursor: loading || images.length < 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, opacity: loading ? 0.75 : 1, width: '100%', boxShadow: images.length < 1 ? 'none' : '0 10px 30px rgba(0, 102, 204, 0.22)' }}>{loading ? 'Converting…' : 'Convert to PDF'}</motion.button>
        </div>

{slowWarning && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>{slowWarning}</p>}

        {error ? <p style={{ margin: 0, fontSize: 13, color: '#DC2626', fontWeight: 400 }}>{error}</p> : null}
    </ToolShell>
  )
}
