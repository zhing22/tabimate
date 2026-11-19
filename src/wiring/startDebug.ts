// Composition helper for main.ts: the ?debug=1 panel, with the browser's own
// navigation and confirm dialog.
import { createDebugPanel, type DebugPanelDeps } from '@/debug/debugPanel';

export function startDebug(deps: Omit<DebugPanelDeps, 'navigate' | 'confirm'>): void {
  const panel = createDebugPanel({
    ...deps,
    navigate: (search) => (location.search = search),
    confirm: (question) => window.confirm(question),
  });
  document.body.append(panel.el);
}
