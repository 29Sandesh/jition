# Architecture Decision Record 005: HTML5 Native Drag & Drop Kanban

## Status
Approved

## Context
Standard drag-and-drop features in React are often built using wrapper libraries like `react-beautiful-dnd` or `@dnd-kit/core`. However, these libraries add overhead to bundle sizes, can be hard to customize for multi-select dragging, and were explicitly prohibited by the technical assessment instructions. We needed a custom, highly performant drag-and-drop Kanban board built in pure HTML5 that supports multi-select card dragging, column reordering, virtual scrolling, and WCAG 2.1 AA keyboard accessibility.

## Decision
We implemented a custom Kanban board in The CirCle utilizing:
1. **HTML5 Drag and Drop API:** Handled via `onDragStart`, `onDragOver`, and `onDrop` events. Multiple selected tasks are stored in a client state array and carried in the `dataTransfer` payload.
2. **Keyboard Accessibility Gating:** Added keyboard event listeners (`Space` to select/grab cards, `Arrow` keys to change parent columns, and `Enter`/`Space` to commit drops).
3. **Viewport Virtualization:** Implemented a rendering window that only paints task cards currently visible within the board viewport, allowing The CirCle to display 1000+ tasks without DOM performance bottlenecks.
4. **Optimistic UI Updates:** State mutations execute immediately in Zustand and TanStack Query, reverting to the original order only if the server returns a REST request failure.

## Consequences
* **Pros:**
  * **Minimal Bundle Size:** Zero external bundle dependencies.
  * **Accessible:** Compliance with WCAG 2.1 AA standards for keyboard users.
  * **Scalable Render Performance:** Viewport virtualization keeps the number of concurrently rendered DOM elements minimal, avoiding UI jank.
* **Cons:**
  * **Manual Coordinate Math:** Creating custom visuals (like drop indicator markers or drag ghost effects) requires writing custom CSS transitions and calculating offsets in JS.
