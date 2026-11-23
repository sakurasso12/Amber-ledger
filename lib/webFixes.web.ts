/**
 * Web / desktop (2.0) page-level fixes that have no React home:
 *
 * 1. The tab pager lays all five screens side by side in an overflow:hidden row. Browsers still
 *    scroll such a box sideways when something inside it gets focus or is scrolled into view, which
 *    left the app showing half of Finance and half of Stats. Boxes with overflow-x: hidden can't be
 *    scrolled by the user anyway, so any sideways scroll there is undone right away.
 * 2. Thin scrollbars in the theme's colours instead of the browser's white ones.
 */
let installed = false;

export function installWebFixes(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener(
    'scroll',
    (e) => {
      const el = e.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement) || el.scrollLeft === 0) return;
      if (getComputedStyle(el).overflowX === 'hidden') el.scrollLeft = 0;
    },
    true
  );

  const style = document.createElement('style');
  style.textContent = `
    * { scrollbar-width: thin; scrollbar-color: rgba(160,140,200,0.35) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: rgba(160,140,200,0.35); border-radius: 8px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(160,140,200,0.6); }
    input, textarea { outline: none; }
  `;
  document.head.appendChild(style);
}
