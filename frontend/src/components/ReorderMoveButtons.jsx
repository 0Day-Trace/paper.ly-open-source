import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ReorderMoveButtons({ index, total, onMoveUp, onMoveDown }) {
  return (
    <div className="reorder-move-buttons">
      <button
        type="button"
        className="reorder-action-btn"
        aria-label="Move up"
        disabled={index === 0}
        onClick={onMoveUp}
        style={{ opacity: index === 0 ? 0.35 : 1 }}
      >
        <ChevronUp size={16} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="reorder-action-btn"
        aria-label="Move down"
        disabled={index >= total - 1}
        onClick={onMoveDown}
        style={{ opacity: index >= total - 1 ? 0.35 : 1 }}
      >
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
    </div>
  )
}
