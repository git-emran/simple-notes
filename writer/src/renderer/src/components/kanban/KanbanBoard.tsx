import { ContextMenu, ContextMenuItem } from "@renderer/components/ContextMenu";
import {
  createKanbanCard,
  createKanbanColumn,
  createKanbanWorkspace,
  kanbanStateAtom,
  normalizeKanbanState,
} from "@renderer/store/kanbanStore";
import type { KanbanCardPriority, KanbanCard } from "@renderer/store/kanbanStore";

export type KanbanCardWithColumn = KanbanCard & { column: string };
import { useAtom } from "jotai";
import { motion } from "motion/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaFire } from "react-icons/fa";
import { FiPlus, FiTrash } from "react-icons/fi";
import { VscAdd, VscTrash, VscChevronDown } from "react-icons/vsc";
import { twMerge } from "tailwind-merge";
import { TaskDetailsPanel } from "./TaskDetailsPanel";

export const KanbanBoard = () => {
  const [storedState, setState] = useAtom(kanbanStateAtom);
  const state = useMemo(() => normalizeKanbanState(storedState), [storedState]);

  useEffect(() => {
    const normalized = normalizeKanbanState(storedState);
    if (JSON.stringify(normalized) !== JSON.stringify(storedState)) {
      setState(normalized);
    }
  }, [setState, storedState]);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceContextMenu, setWorkspaceContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null);
  const [columnContextMenu, setColumnContextMenu] = useState<{ x: number; y: number; columnId: string } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingDeleteColumnId, setPendingDeleteColumnId] = useState<string | null>(null);

  const newWorkspaceInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = useMemo(
    () => state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? state.workspaces[0],
    [state.activeWorkspaceId, state.workspaces]
  );

  const columns = useMemo(() => activeWorkspace?.columns ?? [], [activeWorkspace]);

  // Adapter: Convert columns to flat array of cards
  const cards = useMemo(() => {
    return columns.flatMap((col) => (col.cards || []).map((card) => ({ ...card, column: col.id })));
  }, [columns]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === selectedCardId);
      if (card) return card;
    }
    return null;
  }, [columns, selectedCardId]);

  // Adapter: Handle updates to the flat cards array
  const setCards = (updater: KanbanCardWithColumn[] | ((prev: KanbanCardWithColumn[]) => KanbanCardWithColumn[])) => {
    const currentFlatCards: KanbanCardWithColumn[] = columns.flatMap((col) => (col.cards || []).map((c) => ({ ...c, column: col.id })));
    const nextFlatCards = typeof updater === "function" ? updater(currentFlatCards) : updater;

    setState((prevStored) => {
      const prev = normalizeKanbanState(prevStored);
      return {
        ...prev,
        workspaces: prev.workspaces.map((workspace) => {
          if (workspace.id !== prev.activeWorkspaceId) return workspace;
          return {
            ...workspace,
            columns: workspace.columns.map((col) => ({
              ...col,
              cards: nextFlatCards
                .filter((c: KanbanCardWithColumn) => c.column === col.id)
                .map((c: KanbanCardWithColumn) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { column: _col, ...rest } = c;
                  return rest as KanbanCard;
                }),
            })),
          };
        }),
      };
    });
  };

  const addColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    setState((prev) => {
      const wIdx = prev.workspaces.findIndex((w) => w.id === prev.activeWorkspaceId);
      if (wIdx < 0) return prev;
      const nextWs = [...prev.workspaces];
      nextWs[wIdx] = {
        ...nextWs[wIdx],
        columns: [...nextWs[wIdx].columns, createKanbanColumn(title)],
      };
      return { ...prev, workspaces: nextWs };
    });
    setNewColumnTitle("");
  };

  const addWorkspace = () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    const workspace = createKanbanWorkspace(name);
    setState((prev) => ({
      ...prev,
      activeWorkspaceId: workspace.id,
      workspaces: [...prev.workspaces, workspace],
    }));
    setNewWorkspaceName("");
    setIsWorkspaceModalOpen(false);
  };

  const removeWorkspace = (workspaceId: string) => {
    if (state.workspaces.length <= 1) return;
    setState((prev) => {
      const nextWs = prev.workspaces.filter((w) => w.id !== workspaceId);
      return {
        ...prev,
        activeWorkspaceId: prev.activeWorkspaceId === workspaceId ? nextWs[0].id : prev.activeWorkspaceId,
        workspaces: nextWs,
      };
    });
  };

  const updateColumnTitle = (columnId: string, newTitle: string) => {
    setState((prev) => {
      const wIdx = prev.workspaces.findIndex((w) => w.id === prev.activeWorkspaceId);
      if (wIdx < 0) return prev;
      const nextWs = [...prev.workspaces];
      nextWs[wIdx] = {
        ...nextWs[wIdx],
        columns: nextWs[wIdx].columns.map((c) => (c.id === columnId ? { ...c, title: newTitle } : c)),
      };
      return { ...prev, workspaces: nextWs };
    });
  };

  const removeColumn = (columnId: string) => {
    setState((prev) => {
      const wIdx = prev.workspaces.findIndex((w) => w.id === prev.activeWorkspaceId);
      if (wIdx < 0) return prev;
      const nextWs = [...prev.workspaces];
      nextWs[wIdx] = {
        ...nextWs[wIdx],
        columns: nextWs[wIdx].columns.filter((c) => c.id !== columnId),
      };
      return { ...prev, workspaces: nextWs };
    });
  };

  const updateCardDetails = (next: {
    text: string;
    description: string;
    priority: KanbanCardPriority;
    remindAt: string | null;
    reminderFiredAt: string | null;
  }) => {
    if (!selectedCardId) return;
    setState((prev) => {
      const wIdx = prev.workspaces.findIndex((w) => w.id === prev.activeWorkspaceId);
      if (wIdx < 0) return prev;
      const nextWs = [...prev.workspaces];
      const workspace = { ...nextWs[wIdx] };
      workspace.columns = workspace.columns.map((col) => {
        if (!col.cards.some((c) => c.id === selectedCardId)) return col;
        return {
          ...col,
          cards: col.cards.map((c) => (c.id === selectedCardId ? { ...c, ...next } : c)),
        };
      });
      nextWs[wIdx] = workspace;
      return { ...prev, workspaces: nextWs };
    });
  };

  useEffect(() => {
    if (isWorkspaceModalOpen) newWorkspaceInputRef.current?.focus();
  }, [isWorkspaceModalOpen]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--obsidian-base)] text-[var(--obsidian-text)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {state.workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setState((prev) => ({ ...prev, activeWorkspaceId: workspace.id }))}
              onContextMenu={(e) => {
                e.preventDefault();
                setWorkspaceContextMenu({ x: e.clientX, y: e.clientY, workspaceId: workspace.id });
              }}
              className={twMerge(
                "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm transition-colors",
                workspace.id === state.activeWorkspaceId
                  ? "bg-[var(--obsidian-hover)] font-semibold text-[var(--obsidian-text)]"
                  : "text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)]"
              )}
            >
              {workspace.name}
            </button>
          ))}
          <button
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] hover:text-[var(--obsidian-text)]"
          >
            <VscAdd className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
            placeholder="Add board name"
            className="w-52 rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none border border-[var(--obsidian-border)] focus:border-[var(--obsidian-accent)]/50 transition-colors"
          />
          <button
            onClick={addColumn}
            className="inline-flex items-center gap-2 rounded bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            <VscAdd className="w-4 h-4" />
            Add board
          </button>
        </div>
      </div>

      <div className="kanban-scroll flex min-h-0 flex-1 w-full gap-3 overflow-x-auto overflow-y-hidden p-12 pb-8">
        {columns.map((col) => (
          <Column
            key={col.id}
            title={col.title}
            column={col.id}
            headingColor="text-[var(--obsidian-text)]"
            cards={cards}
            setCards={setCards}
            color={col.color}
            onRename={(newTitle: string) => updateColumnTitle(col.id, newTitle)}
            onContextMenu={(e: React.MouseEvent) => {
              setColumnContextMenu({ x: e.clientX, y: e.clientY, columnId: col.id });
            }}
            onCardClick={setSelectedCardId}
          />
        ))}
        <BurnBarrel setCards={setCards} />
      </div>

      <TaskDetailsPanel
        isOpen={!!selectedCardId}
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onUpdate={updateCardDetails}
      />

      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-5 shadow-2xl">
            <div className="text-lg font-semibold text-[var(--obsidian-text)]">Create workspace</div>
            <input
              ref={newWorkspaceInputRef}
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addWorkspace();
                if (e.key === "Escape") setIsWorkspaceModalOpen(false);
              }}
              placeholder="Workspace name"
              className="mt-4 w-full rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none border border-[var(--obsidian-border)] focus:border-[var(--obsidian-accent)]/50 transition-colors"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="rounded px-3 py-2 text-sm text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={addWorkspace}
                className="rounded bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {workspaceContextMenu && (
        <ContextMenu x={workspaceContextMenu.x} y={workspaceContextMenu.y} onClose={() => setWorkspaceContextMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              removeWorkspace(workspaceContextMenu.workspaceId);
              setWorkspaceContextMenu(null);
            }}
          >
            <VscTrash className="h-4 w-4 text-red-400" />
            <span className="text-red-400">Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {columnContextMenu && (
        <ContextMenu x={columnContextMenu.x} y={columnContextMenu.y} onClose={() => setColumnContextMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              setPendingDeleteColumnId(columnContextMenu.columnId);
              setColumnContextMenu(null);
            }}
          >
            <VscTrash className="h-4 w-4 text-red-400" />
            <span className="text-red-400">Delete Board</span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {pendingDeleteColumnId && (() => {
        const col = columns.find((c) => c.id === pendingDeleteColumnId);
        const cardCount = col?.cards?.length ?? 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-5 shadow-2xl">
              <div className="text-lg font-semibold text-[var(--obsidian-text)]">Delete board</div>
              <p className="mt-2 text-sm text-[var(--obsidian-text-muted)]">
                Are you sure you want to delete <span className="font-medium text-[var(--obsidian-text)]">{col?.title ?? "this board"}</span>?
                {cardCount > 0 && (
                  <span> This will permanently remove {cardCount} {cardCount === 1 ? "card" : "cards"}.</span>
                )}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setPendingDeleteColumnId(null)}
                  className="rounded px-3 py-2 text-sm text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeColumn(pendingDeleteColumnId);
                    setPendingDeleteColumnId(null);
                  }}
                  className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

interface ColumnProps {
  title: string;
  headingColor: string;
  cards: KanbanCardWithColumn[];
  column: string;
  setCards: React.Dispatch<React.SetStateAction<KanbanCardWithColumn[]>>;
  onRename: (newTitle: string) => void;
  color?: string;
  onContextMenu: (e: React.MouseEvent) => void;
  onCardClick?: (cardId: string) => void;
}

const Column = ({ title, headingColor, cards, column, setCards, onRename, color, onContextMenu, onCardClick }: ColumnProps) => {
  const [active, setActive] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(title);

  const handleDragStart = (e: React.DragEvent<HTMLElement> | DragEvent, card: KanbanCardWithColumn) => {
    (e as DragEvent).dataTransfer?.setData("cardId", card.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");
    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);
    const before = element.dataset.before || "-1";

    if (before !== cardId) {
      let copy = [...cards];
      let cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return;
      cardToTransfer = { ...cardToTransfer, column };
      copy = copy.filter((c) => c.id !== cardId);
      const moveToBack = before === "-1";
      if (moveToBack) {
        copy.push(cardToTransfer);
      } else {
        const insertAtIndex = copy.findIndex((el) => el.id === before);
        if (insertAtIndex === undefined) return;
        copy.splice(insertAtIndex, 0, cardToTransfer);
      }
      setCards(copy);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();
    indicators.forEach((i: HTMLElement) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: React.DragEvent) => {
    const indicators = getIndicators();
    clearHighlights(indicators);
    const el = getNearestIndicator(e, indicators);
    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: React.DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;
    return indicators.reduce<{ offset: number; element: HTMLElement }>(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + DISTANCE_OFFSET);
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );
  };

  const getIndicators = () => {
    return Array.from(document.querySelectorAll(`[data-column="${column}"]`)) as HTMLElement[];
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c: KanbanCardWithColumn) => c.column === column);

  const commitRename = () => {
    if (renameDraft.trim()) onRename(renameDraft.trim());
    setIsRenaming(false);
  };

  const bgStyle = color
    ? { backgroundColor: `color-mix(in srgb, var(--obsidian-workspace) 92%, ${color} 8%)` }
    : {};

  return (
    <div
      className="w-[313.6px] shrink-0 rounded-xl border border-[var(--obsidian-border)] px-3 pt-3 pb-2 flex flex-col max-h-full"
      style={bgStyle}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
    >
      <div className="mb-3 flex items-center justify-between shrink-0">
        {isRenaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            className="w-full bg-transparent text-sm font-medium outline-none text-[var(--obsidian-text)]"
          />
        ) : (
          <h3
            className={`font-medium ${headingColor} cursor-pointer truncate mr-2`}
            onDoubleClick={() => setIsRenaming(true)}
            title="Double click to rename"
          >
            {title}
          </h3>
        )}
        <span className="rounded text-sm text-[var(--obsidian-text-muted)]">{filteredCards.length}</span>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 min-h-0 overflow-y-auto pr-1 rounded-lg transition-colors ${active ? "bg-[var(--obsidian-hover-soft)]" : "bg-transparent"}`}
      >
        {filteredCards.map((c: KanbanCardWithColumn) => (
          <Card key={c.id} {...c} handleDragStart={handleDragStart} onClick={() => onCardClick?.(c.id)} />
        ))}
        <DropIndicator beforeId={null} column={column} />
      </div>
      <div className="shrink-0">
        <AddCard column={column} setCards={setCards} />
      </div>
    </div>
  );
};

interface CardProps {
  text: string;
  id: string;
  column: string;
  priority?: KanbanCardPriority;
  description?: string;
  // framer-motion onDragStart passes MouseEvent | PointerEvent | TouchEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDragStart: (e: any, card: KanbanCardWithColumn) => void;
  onClick?: () => void;
}

const Card = ({ text, id, column, priority, description, handleDragStart, onClick }: CardProps) => {
  const priorityColors: Record<string, string> = {
    low: "#10B981", // Emerald/Green
    medium: "#F59E0B", // Amber/Yellow
    high: "#EF4444", // Red
  };
  const color = priority ? priorityColors[priority] : undefined;

  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, { text, id, column })}
        onClick={onClick}
        className="cursor-grab rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-3 active:cursor-grabbing transition-all hover:border-[var(--obsidian-accent)]/50"
        style={color ? { backgroundColor: `color-mix(in srgb, var(--obsidian-pane) 93%, ${color} 7%)` } : {}}
      >
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          <p className="text-sm text-[var(--obsidian-text)] flex-1 break-words font-medium">{text}</p>
        </div>
        {description && (
          <p className="mt-1.5 text-xs text-[var(--obsidian-text-muted)] leading-relaxed line-clamp-2 break-words">
            {description}
          </p>
        )}
      </motion.div>
    </>
  );
};

interface DropIndicatorProps {
  beforeId: string | null;
  column: string;
}

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0 transition-opacity"
    />
  );
};

interface BurnBarrelProps {
  setCards: React.Dispatch<React.SetStateAction<KanbanCardWithColumn[]>>;
}

const BurnBarrel = ({ setCards }: BurnBarrelProps) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");
    setCards((pv: KanbanCardWithColumn[]) => pv.filter((c: KanbanCardWithColumn) => c.id !== cardId));
    setActive(false);
  };

  return (
    <div
      onDrop={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`grid w-[313.6px] shrink-0 place-content-center rounded-xl border border-dashed text-3xl transition-colors ${
        active
          ? "border-red-800 bg-red-800/20 text-red-500"
          : "border-[var(--obsidian-border)] bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)]"
      }`}
    >
      {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
    </div>
  );
};

interface AddCardProps {
  column: string;
  setCards: React.Dispatch<React.SetStateAction<KanbanCardWithColumn[]>>;
}

const AddCard = ({ column, setCards }: AddCardProps) => {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Exclude<KanbanCardPriority, null>>("low");
  const [adding, setAdding] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && adding) {
        setAdding(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adding]);

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!text.trim().length) return;
    const newCard = createKanbanCard(text.trim(), { priority, description: description.trim() });
    setCards((pv: KanbanCardWithColumn[]) => [...pv, { ...newCard, column } as KanbanCardWithColumn]);
    setAdding(false);
    setText("");
    setDescription("");
    setPriority("low");
  };

  const priorityLabels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  const priorityColors: Record<string, string> = {
    low: "#10B981", // Emerald/Green
    medium: "#F59E0B", // Amber/Yellow
    high: "#EF4444", // Red
  };

  return (
    <>
      {adding ? (
        <motion.form
          layout
          onSubmit={handleSubmit}
          className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] p-3 flex flex-col gap-2 relative mt-2 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--obsidian-text-muted)] font-medium">New Task</span>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-2 py-1 text-[11px] text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-all"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: priorityColors[priority] }}
                />
                <span>Priority: {priorityLabels[priority]}</span>
                <VscChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-28 rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-1 shadow-lg">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setPriority(level);
                        setIsDropdownOpen(false);
                      }}
                      className={twMerge(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--obsidian-text)] transition-colors hover:bg-[var(--obsidian-hover)]",
                        priority === level ? "bg-[var(--obsidian-hover)] font-semibold" : ""
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: priorityColors[level] }}
                      />
                      <span>{priorityLabels[level]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            autoFocus
            placeholder="Add new task..."
            className="w-full bg-transparent text-sm text-[var(--obsidian-text)] font-medium placeholder-[var(--obsidian-text-muted)] outline-none rounded p-1 -ml-1 focus:bg-[var(--obsidian-pane)] focus:shadow-[0_0_0_2px_var(--obsidian-accent)] transition-shadow resize-none"
            rows={2}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Add details..."
            className="w-full bg-transparent text-xs text-[var(--obsidian-text)] placeholder-[var(--obsidian-text-muted)] outline-none rounded p-1 -ml-1 focus:bg-[var(--obsidian-pane)] focus:shadow-[0_0_0_2px_var(--obsidian-accent)] transition-shadow resize-none"
            rows={3}
          />
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <button
              onClick={() => setAdding(false)}
              type="button"
              className="px-3 py-1.5 text-xs text-[var(--obsidian-text-muted)] transition-colors hover:text-[var(--obsidian-text)]"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded bg-[var(--obsidian-accent)] px-3 py-1.5 text-xs text-white transition-colors hover:opacity-90"
            >
              <span>Add</span>
              <FiPlus />
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          layout
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--obsidian-text-muted)] transition-colors hover:text-[var(--obsidian-text)] mt-2"
        >
          <span>Add card</span>
          <FiPlus />
        </motion.button>
      )}
    </>
  );
};
