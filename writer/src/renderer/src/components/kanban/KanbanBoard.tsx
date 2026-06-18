import React, { useState, useMemo, useRef, useEffect } from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { motion } from "motion/react";
import { FaFire } from "react-icons/fa";
import { VscAdd, VscTrash } from "react-icons/vsc";
import { twMerge } from "tailwind-merge";
import { useAtom } from "jotai";
import {
  kanbanStateAtom,
  normalizeKanbanState,
  createKanbanWorkspace,
  createKanbanColumn,
  createKanbanCard,
} from "@renderer/store/kanbanStore";
import { ContextMenu, ContextMenuItem } from "@renderer/components/ContextMenu";

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

  // Adapter: Handle updates to the flat cards array
  const setCards = (updater: any) => {
    const currentFlatCards = columns.flatMap((col) => (col.cards || []).map((c) => ({ ...c, column: col.id })));
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
                .filter((c: any) => c.column === col.id)
                .map((c: any) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { column: _col, ...rest } = c;
                  return rest as any;
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

  useEffect(() => {
    if (isWorkspaceModalOpen) newWorkspaceInputRef.current?.focus();
  }, [isWorkspaceModalOpen]);

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--obsidian-base)] text-[var(--obsidian-text)] overflow-hidden">
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
            className="w-52 rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none border border-[var(--obsidian-border)] focus:border-violet-500"
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

      <div className="flex h-full w-full gap-3 overflow-scroll p-12">
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
          />
        ))}
        <BurnBarrel setCards={setCards} />
      </div>

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
              className="mt-4 w-full rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none border border-[var(--obsidian-border)] focus:border-violet-500"
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
    </div>
  );
};

const Column = ({ title, headingColor, cards, column, setCards, onRename, color }: any) => {
  const [active, setActive] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(title);

  const handleDragStart = (e: any, card: any) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDragEnd = (e: any) => {
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

  const handleDragOver = (e: any) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: any) => {
    const indicators = els || getIndicators();
    indicators.forEach((i: any) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: any) => {
    const indicators = getIndicators();
    clearHighlights(indicators);
    const el = getNearestIndicator(e, indicators);
    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: any, indicators: any[]) => {
    const DISTANCE_OFFSET = 50;
    return indicators.reduce(
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
    return Array.from(document.querySelectorAll(`[data-column="${column}"]`));
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c: any) => c.column === column);

  const commitRename = () => {
    if (renameDraft.trim()) onRename(renameDraft.trim());
    setIsRenaming(false);
  };

  const bgStyle = color
    ? { backgroundColor: `color-mix(in srgb, var(--obsidian-workspace) 92%, ${color} 8%)` }
    : {};

  return (
    <div
      className="w-56 shrink-0 rounded-xl border border-[var(--obsidian-border)] px-3 pt-3 pb-2"
      style={bgStyle}
    >
      <div className="mb-3 flex items-center justify-between">
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
        className={`h-full w-full rounded-lg transition-colors ${active ? "bg-[var(--obsidian-hover-soft)]" : "bg-transparent"}`}
      >
        {filteredCards.map((c: any) => (
          <Card key={c.id} {...c} handleDragStart={handleDragStart} />
        ))}
        <DropIndicator beforeId={null} column={column} />
        <AddCard column={column} setCards={setCards} />
      </div>
    </div>
  );
};

const Card = ({ text, id, column, handleDragStart }: any) => {
  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, { text, id, column })}
        className="cursor-grab rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-3 active:cursor-grabbing"
      >
        <p className="text-sm text-[var(--obsidian-text)]">{text}</p>
      </motion.div>
    </>
  );
};

const DropIndicator = ({ beforeId, column }: any) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0 transition-opacity"
    />
  );
};

const BurnBarrel = ({ setCards }: any) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDragEnd = (e: any) => {
    const cardId = e.dataTransfer.getData("cardId");
    setCards((pv: any) => pv.filter((c: any) => c.id !== cardId));
    setActive(false);
  };

  return (
    <div
      onDrop={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl transition-colors ${
        active ? "border-red-800 bg-red-800/20 text-red-500" : "border-[var(--obsidian-text-muted)] bg-[var(--obsidian-text-muted)]/20 text-[var(--obsidian-text)]0"
      }`}
    >
      {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
    </div>
  );
};

const AddCard = ({ column, setCards }: any) => {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!text.trim().length) return;
    const newCard = createKanbanCard(text.trim());
    setCards((pv: any) => [...pv, { ...newCard, column }]);
    setAdding(false);
    setText("");
  };

  return (
    <>
      {adding ? (
        <motion.form layout onSubmit={handleSubmit}>
          <textarea
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Add new task..."
            className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] p-3 text-sm text-[var(--obsidian-text)] placeholder-[var(--obsidian-text-muted)] focus:outline-0"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
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
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--obsidian-text-muted)] transition-colors hover:text-[var(--obsidian-text)]"
        >
          <span>Add card</span>
          <FiPlus />
        </motion.button>
      )}
    </>
  );
};
