import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const commonHandleStyle = {
  width: '8px',
  height: '8px',
  background: 'var(--obsidian-accent)',
  border: '2px solid var(--obsidian-pane)',
};

// Base props for our custom nodes
interface CustomNodeProps {
  data: { label: string };
  selected?: boolean;
}

export const EditableNode = ({ data, selected }: CustomNodeProps) => {
  const [label, setLabel] = useState(data.label);

  const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLabel(evt.target.value);
    // Ideally, we'd sync this back to the store, but for simplicity we rely on local state within the session
    // Data synchronization will be handled at the CanvasEditor level mapping over nodes.
    data.label = evt.target.value; 
  };

  return (
    <div className={`p-3 rounded-xl border-2 shadow-sm bg-[var(--obsidian-pane)] transition-all ${selected ? 'border-[var(--obsidian-accent)] shadow-md' : 'border-[var(--obsidian-border)]'}`} style={{ minWidth: 150 }}>
      <Handle type="target" position={Position.Top} style={commonHandleStyle} />
      <div className="flex flex-col">
        <textarea
          value={label}
          onChange={onChange}
          className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-sm font-medium outline-none text-center"
          rows={2}
          spellCheck={false}
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={commonHandleStyle} />
      <Handle type="source" position={Position.Right} style={commonHandleStyle} />
      <Handle type="target" position={Position.Left} style={commonHandleStyle} />
    </div>
  );
};

export const DiamondNode = ({ data, selected }: CustomNodeProps) => {
    const [label, setLabel] = useState(data.label);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLabel(evt.target.value);
        data.label = evt.target.value; 
    };

    return (
        <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            {/* Diamond SVG Background */}
            <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-full h-full pointer-events-none drop-shadow-sm">
                <polygon 
                    points="50,2 98,50 50,98 2,50" 
                    fill="var(--obsidian-pane)" 
                    stroke={selected ? "var(--obsidian-accent)" : "var(--obsidian-border)"} 
                    strokeWidth="4" 
                    strokeLinejoin="round"
                    className="transition-colors"
                />
            </svg>
            
            <div className="relative z-10 w-[80px] text-center flex flex-col items-center justify-center">
                <textarea
                    value={label}
                    onChange={onChange}
                    className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-[11px] font-bold outline-none text-center m-0 p-0"
                    rows={3}
                    spellCheck={false}
                />
            </div>
            
            <Handle type="target" position={Position.Top} style={commonHandleStyle} />
            <Handle type="source" position={Position.Bottom} style={commonHandleStyle} />
            <Handle type="source" position={Position.Right} style={commonHandleStyle} />
            <Handle type="target" position={Position.Left} style={commonHandleStyle} />
        </div>
    );
};

export const StickyNoteNode = ({ data, selected }: CustomNodeProps) => {
    const [label, setLabel] = useState(data.label);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLabel(evt.target.value);
        data.label = evt.target.value; 
    };

    return (
        <div 
            className={`p-4 shadow-lg transition-all ${selected ? 'ring-2 ring-[var(--obsidian-accent)] scale-[1.02]' : ''}`} 
            style={{ 
                minWidth: 160, 
                minHeight: 160,
                background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)', // Yellow sticky gradient
                borderRadius: '2px 2px 2px 24px', // Folded corner effect
                transform: 'rotate(-1deg)', // Slight casual rotation
                color: '#3f3f46' // Dark gray text for contrast
            }}
        >
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 rounded-tl-full rounded-br-sm" />
            <Handle type="target" position={Position.Top} style={{...commonHandleStyle, border: '2px solid #fde047'}} />
            
            <div className="h-full w-full">
                <textarea
                    value={label}
                    onChange={onChange}
                    className="w-full h-full bg-transparent border-none text-[#3f3f46] resize-none text-sm font-medium outline-none"
                    style={{ 
                        fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif" 
                    }}
                    placeholder="Note..."
                    spellCheck={false}
                />
            </div>
            <Handle type="source" position={Position.Bottom} style={{...commonHandleStyle, border: '2px solid #fde047'}} />
            <Handle type="source" position={Position.Right} style={{...commonHandleStyle, border: '2px solid #fde047'}} />
            <Handle type="target" position={Position.Left} style={{...commonHandleStyle, border: '2px solid #fde047'}} />
        </div>
    );
};
export const CircleNode = ({ data, selected }: CustomNodeProps) => {
    const [label, setLabel] = useState(data.label);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLabel(evt.target.value);
        data.label = evt.target.value; 
    };

    return (
        <div className={`flex items-center justify-center w-[120px] h-[120px] rounded-full border-2 bg-[var(--obsidian-pane)] transition-all ${selected ? 'border-[var(--obsidian-accent)] shadow-md' : 'border-[var(--obsidian-border)]'}`}>
            <Handle type="target" position={Position.Top} style={commonHandleStyle} id="t" />
            <Handle type="source" position={Position.Top} style={{...commonHandleStyle, opacity: 0}} id="ts" />
            
            <Handle type="target" position={Position.Bottom} style={{...commonHandleStyle, opacity: 0}} id="bt" />
            <Handle type="source" position={Position.Bottom} style={commonHandleStyle} id="b" />
            
            <Handle type="target" position={Position.Right} style={{...commonHandleStyle, opacity: 0}} id="rt" />
            <Handle type="source" position={Position.Right} style={commonHandleStyle} id="r" />
            
            <Handle type="target" position={Position.Left} style={commonHandleStyle} id="l" />
            <Handle type="source" position={Position.Left} style={{...commonHandleStyle, opacity: 0}} id="ls" />

            <div className="w-[80px] text-center">
                <textarea
                    value={label}
                    onChange={onChange}
                    className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-[12px] font-medium outline-none text-center"
                    rows={2}
                    spellCheck={false}
                />
            </div>
        </div>
    );
};

export const ArrowNode = ({ data, selected }: CustomNodeProps) => {
    return (
        <div className="relative w-[100px] h-[60px] flex items-center justify-center">
            <svg viewBox="0 0 100 60" className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <path 
                    d="M 10 20 L 60 20 L 60 5 L 95 30 L 60 55 L 60 40 L 10 40 Z" 
                    fill="var(--obsidian-pane)" 
                    stroke={selected ? "var(--obsidian-accent)" : "var(--obsidian-border)"} 
                    strokeWidth="3" 
                    strokeLinejoin="round"
                    className="transition-colors"
                />
            </svg>
            <div className="relative z-10 text-[10px] font-bold text-[var(--obsidian-text)] opacity-80 pointer-events-none pr-4">
                {data.label}
            </div>
            <Handle type="target" position={Position.Left} style={commonHandleStyle} />
            <Handle type="source" position={Position.Right} style={commonHandleStyle} />
        </div>
    );
};
export const TextNode = ({ data, selected }: CustomNodeProps) => {
    const [label, setLabel] = useState(data.label);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLabel(evt.target.value);
        data.label = evt.target.value; 
    };

    return (
        <div className={`p-2 transition-all group ${selected ? 'ring-1 ring-[var(--obsidian-accent)] rounded-sm' : ''}`} style={{ minWidth: 100 }}>
             <Handle type="target" position={Position.Top} style={{...commonHandleStyle, opacity: selected ? 1 : 0}} />
             <Handle type="source" position={Position.Bottom} style={{...commonHandleStyle, opacity: selected ? 1 : 0}} />
            <div className="flex flex-col">
                <textarea
                    value={label}
                    onChange={onChange}
                    className="w-full bg-transparent border-none text-[var(--obsidian-text)] resize-none text-sm font-normal outline-none text-center placeholder:opacity-30"
                    rows={1}
                    placeholder="Text..."
                    spellCheck={false}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
            </div>
             <Handle type="source" position={Position.Right} style={{...commonHandleStyle, opacity: selected ? 1 : 0}} />
             <Handle type="target" position={Position.Left} style={{...commonHandleStyle, opacity: selected ? 1 : 0}} />
        </div>
    );
};
