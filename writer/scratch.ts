import { normalizeKanbanState, createDefaultKanbanColumns } from './src/renderer/src/store/kanbanStore';

const initial = {
  activeWorkspaceId: 'workspace-1',
  workspaces: [
    {
      id: 'workspace-1',
      name: 'My Tasks',
      columns: createDefaultKanbanColumns()
    }
  ]
};

let state = initial as any;
for (let i = 0; i < 5; i++) {
  const next = normalizeKanbanState(state);
  console.log(i, JSON.stringify(state) === JSON.stringify(next));
  state = next;
}
