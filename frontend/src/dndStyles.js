/**
 * Styles for @hello-pangea/dnd — avoid CSS transitions on transform (causes jank).
 * Do not set width: 100% while dragging (clone is position:fixed → spans viewport).
 */
export function mergeDraggableStyle(draggableStyle, snapshot, layout = {}) {
  const { width: layoutWidth, maxWidth: layoutMaxWidth, ...layoutRest } = layout

  if (snapshot.isDragging) {
    const dragWidth = draggableStyle?.width
    return {
      ...layoutRest,
      ...draggableStyle,
      boxSizing: 'border-box',
      width: dragWidth,
      maxWidth: dragWidth,
      minWidth: dragWidth,
      flexShrink: 0,
      zIndex: 1000,
      cursor: 'grabbing',
      boxShadow: 'var(--shadow-lg)',
    }
  }

  if (snapshot.isDropAnimating) {
    return {
      ...draggableStyle,
      boxSizing: 'border-box',
      ...layoutRest,
      width: layoutWidth,
      maxWidth: layoutMaxWidth,
      flexShrink: 0,
      transitionDuration: draggableStyle?.transitionDuration ?? '0.2s',
    }
  }

  return {
    ...draggableStyle,
    boxSizing: 'border-box',
    ...layoutRest,
    width: layoutWidth,
    maxWidth: layoutMaxWidth,
    flexShrink: 0,
  }
}

/** Left grip column on a reorder row */
export const rowDragHandleStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  flexShrink: 0,
  alignSelf: 'stretch',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  color: 'var(--text-3)',
  borderRight: '1px solid var(--border)',
  background: 'var(--surface)',
}

export function reorderRowShell(snapshot, accent) {
  return {
    display: 'flex',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: '100%',
    borderRadius: 14,
    border: `1px solid ${snapshot.isDragging ? accent : 'var(--border)'}`,
    background: 'var(--surface-2)',
    overflow: 'hidden',
    minHeight: 76,
  }
}

export function reorderList(items, fromIndex, toIndex) {
  const next = Array.from(items)
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function moveListItem(items, index, delta) {
  const to = index + delta
  if (to < 0 || to >= items.length) return items
  return reorderList(items, index, to)
}
