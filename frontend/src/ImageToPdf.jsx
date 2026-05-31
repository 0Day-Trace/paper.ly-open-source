import React, { useCallback, useMemo, useRef, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import {
  ArrowUpDown,
  FileImage,
  FileStack,
  Images,
  Plus,
  Trash2,
} from 'lucide-react'
import ToolShell from './components/ToolShell'
import useTheme from './hooks/useTheme'
import { resolveAccent } from './toolUi'

const truncateFilename = (name, max = 28) => {
  if (!name || name.length <= max) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 2
  return base.slice(0, Math.ceil(keep / 2)) + '…' + base.slice(-Math.floor(keep / 2)) + ext
}

const formatSize = (bytes) => {
  if (!bytes) return 'N/A'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export default function ImageToPdf({ onBack, tool }) {
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
  const accentLight = tool?.accentLight || '#FDF2F8'

  const totalBytes = useMemo(
    () => images.reduce((acc, img) => acc + (img.size || 0), 0),
    [images]
  )

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
    const next = Array.from(images)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setImages(next)
  }

  const removeImage = (id) => {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  const clearAll = () => {
    setImages([])
    setError('')
  }

  const toggleSort = () => {
    const nextAsc = !sortAsc
    setSortAsc(nextAsc)
    setImages((prev) => [...prev].sort((a, b) => (
      nextAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )))
  }

  const handleConvert = async () => {
    if (!images.length) {
      setError('Add at least one image.')
      return
    }
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
      await downloadRemoteFile(url, fileName)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolShell tool={tool} onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${images.length ? 'var(--border-strong)' : accent}`,
            borderRadius: 20,
            padding: '28px 22px',
            background: images.length ? 'var(--surface)' : `${accentLight}66`,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 16,
                background: images.length ? 'var(--surface-2)' : accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: images.length ? 'var(--text-3)' : '#fff',
              }}>
                <Images size={20} strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                  Drop images here or click to browse
                </p>
                <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', margin: '4px 0 0' }}>
                  {images.length ? `${images.length} files · ${formatSize(totalBytes)} total` : 'JPG, PNG, WEBP, BMP, TIFF'}
                </p>
              </div>
            </div>

            {images.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); clearAll() }}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 400,
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Clear all
              </motion.button>
            )}
          </div>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 14,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
              Drag to reorder before converting
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={toggleSort}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <ArrowUpDown size={14} />
                Sort
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {images.map((img, index) => (
                    <Draggable key={img.id} draggableId={img.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={{
                            ...dragProvided.draggableProps.style,
                            width: 150,
                            borderRadius: 16,
                            border: `1px solid ${snapshot.isDragging ? accent : 'var(--border)'}`,
                            background: 'var(--surface-2)',
                            overflow: 'hidden',
                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'none',
                            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                          }}
                        >
                          <div style={{ height: 118, background: 'rgba(0,0,0,0.03)' }}>
                            <img
                              src={img.preview}
                              alt={img.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                            />
                          </div>
                          <div style={{ padding: '10px 10px 9px' }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {truncateFilename(img.name)}
                            </p>
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
                                {formatSize(img.size)}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  borderRadius: 10,
                                  width: 26,
                                  height: 26,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-2)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 16,
          boxShadow: 'var(--shadow-sm)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
            Paper size
            <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
              <option value="fit">Fit (default)</option>
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="a2">A2</option>
              <option value="letter">Letter</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
            Orientation
            <select value={orientation} onChange={(e) => setOrientation(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
            Margin
            <select value={margin} onChange={(e) => setMargin(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
              <option value="none">None</option>
              <option value="small">Small (10mm)</option>
              <option value="large">Large (20mm)</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
            Output
            <select value={outputMode} onChange={(e) => setOutputMode(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
              <option value="merged">1 PDF</option>
              <option value="separate">ZIP (one PDF per image)</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--text-2)',
            }}>
              <FileImage size={12} />
              <span>{images.length} images</span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--text-2)',
            }}>
              <FileStack size={12} />
              <span>{outputMode === 'merged' ? '1 PDF' : 'ZIP output'}</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConvert}
            disabled={loading || images.length < 1}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: images.length < 1 ? 'var(--surface-2)' : accent,
              border: `1px solid ${images.length < 1 ? 'var(--border)' : accent}`,
              borderRadius: 18,
              color: images.length < 1 ? 'var(--text-3)' : '#fff',
              padding: '13px 18px',
              cursor: loading || images.length < 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.75 : 1,
              transition: 'all 0.18s ease',
              minWidth: 230,
              boxShadow: images.length < 1 ? 'none' : `0 10px 30px ${accent}22`,
            }}
          >
            {loading ? 'Converting…' : 'Convert to PDF'}
          </motion.button>
        </div>

        {error ? (
          <p style={{ margin: 0, fontSize: 13, color: '#DC2626', fontWeight: 400 }}>
            {error}
          </p>
        ) : null}
      </div>
    </ToolShell>
  )
}
