import React from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'

/** Vertical reorder list — scrolls down; works well on phone with many items. */
export default function VerticalReorderList({ droppableId, onDragEnd, children, gap = 8 }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={droppableId} direction="vertical">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="reorder-list"
            style={{
              gap,
              width: '100%',
              background: snapshot.isDraggingOver ? 'rgba(128, 128, 128, 0.06)' : 'transparent',
              borderRadius: 12,
              transition: 'background 0.12s ease',
            }}
          >
            {children(provided)}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
