import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedNoteAtom, saveCanvasAtom } from '../../store';
import { VscTypeHierarchy, VscFilePdf, VscNote, VscSymbolString } from 'react-icons/vsc';
import { FaRegSquare, FaRegCircle, } from 'react-icons/fa';
import { TbDiamond } from 'react-icons/tb';
import { EditableNode, DiamondNode, StickyNoteNode, CircleNode, TextNode } from './CustomNodes';

const initialNodes: any[] = [];
const initialEdges: any[] = [];

const nodeTypes = {
  editable: EditableNode,
  diamond: DiamondNode,
  sticky: StickyNoteNode,
  circle: CircleNode,
  text: TextNode,
};

export const CanvasEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom);
  const saveCanvas = useSetAtom(saveCanvasAtom);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load from file content
  React.useEffect(() => {
    if (selectedNote?.content && !isLoaded) {
      try {
        const parsed = JSON.parse(selectedNote.content);
        if (parsed.nodes) setNodes(parsed.nodes);
        if (parsed.edges) setEdges(parsed.edges);
        setIsLoaded(true);
      } catch (e) {
        console.error('Failed to parse canvas file:', e);
        setIsLoaded(true);
      }
    } else if (!selectedNote?.content && !isLoaded) {
      setIsLoaded(true);
    }
  }, [selectedNote?.content, isLoaded, setNodes, setEdges]);

  // Persistence effect - save on change
  React.useEffect(() => {
    if (!isLoaded) return;

    const timeout = setTimeout(() => {
      saveCanvas(JSON.stringify({ nodes, edges }, null, 2));
    }, 500);
    return () => clearTimeout(timeout);
  }, [nodes, edges, isLoaded, saveCanvas]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: 'var(--obsidian-accent)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--obsidian-accent)' }
    }, eds)),
    [setEdges]
  );

  const edgeReconnectSuccessful = useRef(true);
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);
  const onReconnect = useCallback(
    (oldEdge: any, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges]
  );
  const onReconnectEnd = useCallback(
    (_: any, edge: any) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      edgeReconnectSuccessful.current = true;
    },
    [setEdges]
  );

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: any) => {
      // If Alt is pressed, duplicate the node
      if (event.altKey) {
        const newNode = {
          ...node,
          id: `${node.type}-${Date.now()}`,
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20,
          },
          selected: false,
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [setNodes]
  );

  const addNode = (type: 'editable' | 'diamond' | 'sticky' | 'circle' | 'arrow' | 'text') => {
    const id = `${type}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: type === 'sticky' ? 'Note...' : type === 'diamond' ? 'Decision' : type === 'circle' ? 'Start/End' : type === 'arrow' ? '' : type === 'text' ? '' : 'Process' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const exportAsPdf = () => {
    // Hide UI elements for print
    const originalPrintStyle = document.body.style.cssText;

    // Add a print-specific class to hide sidebar and controls
    document.documentElement.classList.add('canvas-printing');

    setTimeout(() => {
      window.print();
      document.documentElement.classList.remove('canvas-printing');
    }, 100);
  };

  return (
    <div className="w-full h-full bg-[var(--obsidian-workspace)] relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onReconnect={onReconnect}
        fitView
        style={{ background: 'var(--obsidian-workspace)' }}
      >
        <Background color="var(--obsidian-border)" gap={24} size={1} />
        <Controls />
        <Panel position="top-right" className="flex gap-2">
          <div className="flex gap-1 bg-[var(--obsidian-pane)]/80 backdrop-blur-md p-1.5 rounded-xl border border-[var(--obsidian-border)] shadow-2xl">
            <button
              onClick={() => addNode('editable')}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-[var(--obsidian-text)] transition-all active:scale-95"
              title="Add Process Square"
            >
              <FaRegSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => addNode('diamond')}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-[var(--obsidian-text)] transition-all active:scale-95"
              title="Add Decision Diamond"
            >
              <TbDiamond className="w-5 h-5" />
            </button>
            <button
              onClick={() => addNode('sticky')}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-[var(--obsidian-text)] transition-all active:scale-95"
              title="Add Sticky Note"
            >
              <VscNote className="w-5 h-5 text-yellow-500" />
            </button>
            <button
              onClick={() => addNode('circle')}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-[var(--obsidian-text)] transition-all active:scale-95"
              title="Add Circle"
            >
              <FaRegCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => addNode('text')}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-[var(--obsidian-text)] transition-all active:scale-95"
              title="Add Text"
            >
              <VscSymbolString className="w-5 h-5" />
            </button>
            <div className="w-[1px] h-8 bg-[var(--obsidian-border)] my-auto mx-1" />
            <button
              onClick={exportAsPdf}
              className="p-2.5 hover:bg-[var(--obsidian-hover)] rounded-lg text-red-500 transition-all active:scale-95"
              title="Export as PDF"
            >
              <VscFilePdf className="w-5 h-5" />
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {/* Floating Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[var(--obsidian-pane)]/90 backdrop-blur-md px-4 py-2 rounded-full border border-[var(--obsidian-border)] shadow-lg flex items-center gap-2 pointer-events-auto">
          <VscTypeHierarchy className="w-4 h-4 text-[var(--obsidian-accent)]" />
          <span className="text-xs font-bold tracking-wider text-[var(--obsidian-text)] uppercase">Operations Canvas</span>
        </div>
      </div>
    </div>
  );
};
