# Design: Replace @hello-pangea/dnd with dnd-kit in PlayerList

**Date:** 2026-04-20  
**Status:** Approved

## Problem

`@hello-pangea/dnd` only supports single-axis (vertical or horizontal) lists. The `PlayerList` component uses `display: flex; flex-wrap: wrap` so players appear as a multi-row grid of chips. The library's drop-zone hit detection breaks in this layout — dragging works but dropping in the middle of a row does not. The issue is most noticeable on mobile.

## Chosen Approach

Replace `@hello-pangea/dnd` with `dnd-kit`, which natively supports wrapped/grid layouts. Use a long-press (500 ms) to initiate drag on touch devices, and a short tap to toggle player presence — no visible UI change to the chips.

## Dependencies

**Remove:**
- `@hello-pangea/dnd`

**Add:**
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## Component Design

### `PlayerList.tsx`

Rewrite using dnd-kit primitives:

- `DndContext` replaces `DragDropContext` — wraps the whole list, receives `onDragEnd`
- `SortableContext` with `rectSortingStrategy` replaces `Droppable` — supports wrapped layouts
- A `SortablePlayerChip` sub-component (inline or extracted) replaces each `Draggable` — uses the `useSortable` hook
- Container style stays `display: flex; flex-wrap: wrap; gap: 10px`

### Sensors

Two sensors configured on `DndContext`:

| Sensor | Config | Purpose |
|---|---|---|
| `TouchSensor` | `activationConstraint: { delay: 500, tolerance: 8 }` | 500 ms long-press starts drag on mobile; short tap falls through to `onClick` |
| `MouseSensor` | `activationConstraint: { distance: 5 }` | Small drag distance starts drag on desktop; prevents accidental drags on click |

### Drag end handler

```
onDragEnd(event):
  if no event.over → return
  find oldIndex from players by event.active.id
  find newIndex from players by event.over.id
  if oldIndex !== newIndex → call onReorder(oldIndex, newIndex)
```

### Chip interaction

- **Short tap / click** → `onToggle(player.id)` (unchanged)
- **Long-press / mouse-drag** → reorder via dnd-kit

No grip icon, no visual change to chips. The `onClick` on the inner div is preserved as-is.

## Interface Unchanged

`App.tsx` and the `onReorder(startIndex, endIndex)` callback are not touched. The reorder logic in `handleReorderPlayers` works with plain indices and remains correct.

## Files Changed

| File | Change |
|---|---|
| `package.json` | Remove `@hello-pangea/dnd`, add three `@dnd-kit/*` packages |
| `src/components/PlayerList.tsx` | Full rewrite of DnD implementation |

No other files change.

## Out of Scope

- Visual redesign of chips
- Changes to `App.tsx`, `RotaTable.tsx`, `PlayerManagement.tsx`
- Any changes to rota logic
