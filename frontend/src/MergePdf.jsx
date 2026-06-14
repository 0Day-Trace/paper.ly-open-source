import React, { useCallback, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { API_BASE, getUserId } from './config'
import { downloadRemoteFile } from './download'
import { Draggable } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import { FileText, GripVertical, RotateCw, Trash2, Upload } from 'lucide-react'
import ToolShell from './components/ToolShell'
import VerticalReorderList from './components/VerticalReorderList'
import ReorderMoveButtons from './components/ReorderMoveButtons'
import { mergeDraggableStyle, moveListItem, reorderRowShell, rowDragHandleStyle } from './dndStyles'
import { primaryActionBg, primaryActionColor, resolveAccent } from './toolUi'
import useTheme from './hooks/useTheme'
import useSlowWarning from './hooks/useSlowWarning'

const trunc = (name, max = 38) => {
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

export default function MergePdf({ onBack, tool, onComplete }) {
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [thumbLoading, setThumbLoading] = useState(false)
  const [error, setError] = useState('')
  const [rotations, setRotations] = useState({})

  const theme = useTheme()
  const accent = resolveAccent(tool?.accent || '#0D9488', theme)
  const slowWarning = useSlowWarning(loading)

  const totalBytes = useMemo(
    () => items.reduce((a, p) => a + (p.size || p.file?.size || 0), 0),
    [items]
  )

  const addFiles = async (files) => {
    const pdfs = files.filter((f) => f && (f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf')))
    if (!pdfs.length) return
    setError('')
    setThumbLoading(true)
    const results = []
    for (const file of pdfs) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', getUserId())
      try {
        const res = await axios.post(`${API_BASE}/thumbnail`, formData, { timeout: 15000 })
        results.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          filename: file.name,
          thumbnail: res.data.thumbnail || null,
          pages: res.data.pages ?? null,
          size: res.data.size ?? file.size,
        })
      } catch {
        results.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          filename: file.name,
          thumbnail: null,
          pages: null,
          size: file.size,
        })
      }
    }
    setItems((prev) => [...prev, ...results])
    setThumbLoading(false)
  }

  const onDragEnd = (result) => {
    if (!result.destination) return
    setItems((prev) => {
      const next = Array.from(prev)
      const [moved] = next.splice(result.source.index, 1)
      next.splice(result.destination.index, 0, moved)
      return next
    })
  }

  const movePdf = (index, delta) => {
    setItems((prev) => moveListItem(prev, index, delta))
  }

  const rotate = (id) => setRotations((prev) => ({ ...prev, [id]: ((prev[id] || 0) + 90) % 360 }))
  const remove = (id) => setItems((prev) => prev.filter((p) => p.id !== id))
  const clearAll = () => { setItems([]); setRotations({}); setError('') }

  const handleMerge = async () => {
    if (items.length < 2) { setError('Add at least 2 PDFs.'); return }
    setLoading(true)
    setError('')
    const formData = new FormData()
    items.forEach((p) => {
      formData.append('files', p.file)
      formData.append('rotations', rotations[p.id] || 0)
    })
    formData.append('user_id', getUserId())
    try {
      const response = await axios.post(`${API_BASE}/merge`, formData)
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

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files || []))
  }, [])

  return (
    <ToolShell tool={tool} onBack={onBack} loading={loading} loadingLabel="Merging your PDFs">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${items.length ? 'var(--border-strong)' : 'var(--border-strong)'}`,
            borderRadius: 20,
            padding: '28px 22px',
            background: items.length ? 'var(--surface)' : 'var(--dropzone-empty-bg)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.18s ease',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = '' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 16,
                background: 'var(--surface-2)',
                border: `1px solid ${items.length ? 'var(--border)' : accent + '33'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: items.length ? 'var(--text-3)' : accent,
                transition: 'all 0.18s ease',
              }}>
                <Upload size={20} strokeWidth={1.6} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                  Drop PDFs here or click to browse
                </p>
                <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-3)', margin: '4px 0 0' }}>
                  {items.length ? `${items.length} files · ${formatSize(totalBytes)} total` : 'PDF files only'}
                </p>
              </div>
            </div>

            {items.length > 0 && (
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

        {/* Queue */}
        {items.length > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
                Drag the grip or use arrows to reorder
              </p>
              <div style={{
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                fontSize: 12,
                color: 'var(--text-2)',
                fontWeight: 300,
              }}>
                <FileText size={12} />
                <span>{items.length} PDFs</span>
              </div>
            </div>

            <VerticalReorderList droppableId="pdfs" onDragEnd={onDragEnd}>
              {() => items.map((pdf, index) => {
                const rotation = rotations[pdf.id] || 0
                return (
                  <Draggable key={pdf.id} draggableId={pdf.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={mergeDraggableStyle(provided.draggableProps.style, snapshot, reorderRowShell(snapshot, accent))}
                      >
                        <div {...provided.dragHandleProps} style={rowDragHandleStyle} aria-label="Drag to reorder">
                          <GripVertical size={18} strokeWidth={2} />
                        </div>
                        <div className="reorder-row-body">
                          <div className="reorder-row-main">
                            <span className="reorder-row-index">{index + 1}</span>
                            <div style={{
                              width: 72,
                              height: 92,
                              borderRadius: 10,
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: 'rgba(0,0,0,0.04)',
                              border: '1px solid var(--border)',
                              position: 'relative',
                            }}>
                              {pdf.thumbnail ? (
                                <img
                                  src={`data:image/png;base64,${pdf.thumbnail}`}
                                  alt=""
                                  draggable={false}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    transform: `rotate(${rotation}deg)`,
                                    transition: snapshot.isDragging ? 'none' : 'transform 0.25s ease',
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-3)',
                                }}>
                                  <FileText size={22} strokeWidth={1.4} />
                                </div>
                              )}
                            </div>
                            <div className="reorder-row-info">
                              <p className="reorder-row-info-title">
                                {trunc(pdf.filename, 34)}
                              </p>
                              <p className="reorder-row-info-meta">
                                {formatSize(pdf.size || pdf.file?.size)}
                                {pdf.pages ? ` · ${pdf.pages} pages` : ''}
                                {rotation ? ` · ${rotation}°` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="reorder-row-actions">
                            <button
                              type="button"
                              className="reorder-action-btn"
                              title="Rotate 90°"
                              onClick={() => rotate(pdf.id)}
                            >
                              <RotateCw size={15} />
                            </button>
                            <ReorderMoveButtons
                              index={index}
                              total={items.length}
                              onMoveUp={() => movePdf(index, -1)}
                              onMoveDown={() => movePdf(index, 1)}
                            />
                            <button
                              type="button"
                              className="reorder-action-btn reorder-delete-btn"
                              title="Remove"
                              onClick={() => remove(pdf.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })}
            </VerticalReorderList>
          </div>
        )}

        {/* Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div>
            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#DC2626', fontWeight: 400 }}>
                {error}
              </p>
            )}
            {thumbLoading && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
                Loading previews…
              </p>
            )}
          </div>


        {slowWarning && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 300 }}>
            {slowWarning}
          </p>
        )}

        <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleMerge}
            disabled={loading || items.length < 2}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: primaryActionBg(items.length >= 2),
              border: `1px solid ${items.length < 2 ? 'var(--border)' : 'var(--accent)'}`,
              borderRadius: 18,
              color: primaryActionColor(items.length >= 2),
              padding: '13px 18px',
              cursor: loading || items.length < 2 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.75 : 1,
              transition: 'all 0.18s ease',
              width: '100%',
              boxShadow: items.length < 2 ? 'none' : '0 10px 30px rgba(0, 102, 204, 0.22)',
            }}
          >
            {loading ? 'Merging…' : `Merge ${items.length} PDFs`}
          </motion.button>
        </div>
    </ToolShell>
  )
}