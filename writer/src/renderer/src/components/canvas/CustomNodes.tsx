import { Handle, type NodeProps, NodeResizer, Position } from '@xyflow/react'

type CanvasNodeData = {
  label: string
  onChangeLabel?: (nodeId: string, label: string) => void
}

const commonHandleStyle = {
  width: '8px',
  height: '8px',
  background: 'var(--obsidian-accent)',
  border: '2px solid var(--obsidian-pane)',
}

const getLabel = (data: unknown) => {
  const nodeData = (data ?? {}) as Partial<CanvasNodeData>
  return nodeData.label ?? ''
}

const onLabelChange = (id: string, data: unknown, value: string) => {
  const nodeData = (data ?? {}) as Partial<CanvasNodeData>
  nodeData.onChangeLabel?.(id, value)
}

export const EditableNode = ({ id, data, selected }: NodeProps) => {
  const label = getLabel(data)

  return (
    <div
      className={`relative p-3 rounded-md h-full w-full border-2 shadow-sm bg-[var(--obsidian-pane)] transition-all ${
        selected ? 'border-[var(--obsidian-accent)] shadow-md' : 'border-[var(--obsidian-border)]'
      }`}
    >
      <NodeResizer isVisible={!!selected} minWidth={120} minHeight={60} />

      <Handle type="target" position={Position.Top} id="t" style={commonHandleStyle} />
      <Handle type="source" position={Position.Top} id="tt" style={commonHandleStyle} />
      <Handle type="target" position={Position.Bottom} id="b" style={commonHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="bb" style={commonHandleStyle} />
      <Handle type="target" position={Position.Right} id="r" style={commonHandleStyle} />
      <Handle type="source" position={Position.Right} id="rr" style={commonHandleStyle} />
      <Handle type="target" position={Position.Left} id="l" style={commonHandleStyle} />
      <Handle type="source" position={Position.Left} id="ll" style={commonHandleStyle} />

      <div className="flex flex-col">
        <textarea
          value={label}
          onChange={(evt) => onLabelChange(id, data, evt.target.value)}
          className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-sm font-medium outline-none text-center"
          rows={2}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export const DiamondNode = ({ id, data, selected }: NodeProps) => {
  const label = getLabel(data)

  return (
    <div className="relative flex items-center justify-center w-[120px] h-[120px]">
      <Handle type="target" position={Position.Top} id="t1" style={commonHandleStyle} />
      <Handle type="source" position={Position.Top} id="t2" style={commonHandleStyle} />
      <Handle type="target" position={Position.Bottom} id="b1" style={commonHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="b2" style={commonHandleStyle} />
      <Handle type="target" position={Position.Right} id="r1" style={commonHandleStyle} />
      <Handle type="source" position={Position.Right} id="r2" style={commonHandleStyle} />
      <Handle type="source" position={Position.Left} id="l2" style={commonHandleStyle} />
      <Handle type="target" position={Position.Left} id="l1" style={commonHandleStyle} />

      <svg
        viewBox="0 0 100 100"
        className="absolute top-0 left-0 w-full h-full pointer-events-none drop-shadow-sm"
      >
        <polygon
          points="50,2 98,50 50,98 2,50"
          fill="var(--obsidian-pane)"
          stroke={selected ? 'var(--obsidian-accent)' : 'var(--obsidian-border)'}
          strokeWidth="4"
          strokeLinejoin="round"
          className="transition-colors"
        />
      </svg>

      <div className="relative z-10 w-[80px] text-center flex flex-col items-center justify-center">
        <textarea
          value={label}
          onChange={(evt) => onLabelChange(id, data, evt.target.value)}
          className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-[11px] font-bold outline-none text-center m-0 p-0"
          rows={3}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export const StickyNoteNode = ({ id, data, selected }: NodeProps) => {
  const label = getLabel(data)

  return (
    <div className="relative w-full h-full">
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={80} />
      <div
        className={`p-4 w-full h-full shadow-lg transition-all ${
          selected ? 'ring-2 ring-[var(--obsidian-accent)] scale-[1.02]' : ''
        }`}
        style={{
          minHeight: '80',
          minWidth: '80',
          background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)',
          borderRadius: '2px 2px 2px 24px',
          transform: 'rotate(-1deg)',
          color: '#3f3f46',
        }}
      >
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 rounded-tl-full rounded-br-sm" />
        <Handle
          type="target"
          position={Position.Top}
          style={{ ...commonHandleStyle, border: '2px solid #fde047' }}
        />

        <div className="h-full w-full">
          <textarea
            value={label}
            onChange={(evt) => onLabelChange(id, data, evt.target.value)}
            className="w-full h-full bg-transparent border-none text-[#3f3f46] resize-none text-sm font-medium outline-none"
            style={{
              fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif",
            }}
            placeholder="Note..."
            spellCheck={false}
          />
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ ...commonHandleStyle, border: '2px solid #fde047' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ ...commonHandleStyle, border: '2px solid #fde047' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          style={{ ...commonHandleStyle, border: '2px solid #fde047' }}
        />
      </div>
    </div>
  )
}

export const CircleNode = ({ id, data, selected }: NodeProps) => {
  const label = getLabel(data)

  return (
    <div
      className={`flex items-center justify-center w-[120px] h-[120px] rounded-full border-2 bg-[var(--obsidian-pane)] transition-all ${
        selected ? 'border-[var(--obsidian-accent)] shadow-md' : 'border-[var(--obsidian-border)]'
      }`}
    >
      <Handle type="target" position={Position.Top} style={commonHandleStyle} id="t" />
      <Handle type="source" position={Position.Top} style={{ ...commonHandleStyle, opacity: 0 }} id="ts" />
      <Handle type="target" position={Position.Bottom} style={{ ...commonHandleStyle, opacity: 0 }} id="bt" />
      <Handle type="source" position={Position.Bottom} style={commonHandleStyle} id="b" />
      <Handle type="target" position={Position.Right} style={{ ...commonHandleStyle, opacity: 0 }} id="rt" />
      <Handle type="source" position={Position.Right} style={commonHandleStyle} id="r" />
      <Handle type="target" position={Position.Left} style={commonHandleStyle} id="l" />
      <Handle type="source" position={Position.Left} style={{ ...commonHandleStyle, opacity: 0 }} id="ls" />

      <div className="w-[80px] text-center">
        <textarea
          value={label}
          onChange={(evt) => onLabelChange(id, data, evt.target.value)}
          className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-[12px] font-medium outline-none text-center"
          rows={2}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export const TextNode = ({ id, data, selected }: NodeProps) => {
  const label = getLabel(data)

  return (
    <div
      className={`p-2 transition-all group ${
        selected ? 'ring-1 ring-[var(--obsidian-accent)] rounded-sm' : ''
      }`}
      style={{ minWidth: 100 }}
    >
      <Handle type="target" position={Position.Top} style={{ ...commonHandleStyle, opacity: selected ? 1 : 0 }} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...commonHandleStyle, opacity: selected ? 1 : 0 }}
      />
      <div className="flex flex-col">
        <textarea
          value={label}
          onChange={(evt) => onLabelChange(id, data, evt.target.value)}
          className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-sm font-normal outline-none text-center placeholder:opacity-30"
          rows={1}
          placeholder="Text..."
          spellCheck={false}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${target.scrollHeight}px`
          }}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...commonHandleStyle, opacity: selected ? 1 : 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...commonHandleStyle, opacity: selected ? 1 : 0 }}
      />
    </div>
  )
}
