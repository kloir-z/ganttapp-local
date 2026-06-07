// DependencyConnector.tsx
//
// Draws a thin arrow from the dependency builder popover to the chart bar it is
// editing (the source row, marked on the chart by .dependency-source-highlight),
// like the row-note connector. Updates via requestAnimationFrame by writing SVG
// attributes directly (no React re-render), so it stays glued to the bar while the
// chart scrolls / the popover is dragged, at negligible cost.
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DependencyConnectorProps {
  popoverRef: React.RefObject<HTMLElement>;
}

const DependencyConnector: React.FC<DependencyConnectorProps> = ({ popoverRef }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const pop = popoverRef.current;
      const bar = document.querySelector('.dependency-source-highlight') as HTMLElement | null;
      const svg = svgRef.current;
      const line = lineRef.current;
      if (pop && bar && svg && line) {
        const p = pop.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const bx = b.left + b.width / 2;
        const by = b.top + b.height / 2;
        // Start from the closest point on the popover edge to the bar.
        const mx = Math.max(p.left, Math.min(bx, p.right));
        const my = Math.max(p.top, Math.min(by, p.bottom));
        line.setAttribute('x1', String(mx));
        line.setAttribute('y1', String(my));
        line.setAttribute('x2', String(bx));
        line.setAttribute('y2', String(by));
        svg.style.display = '';
      } else if (svg) {
        svg.style.display = 'none';
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [popoverRef]);

  return createPortal(
    <svg
      ref={svgRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10999, display: 'none' }}
    >
      <defs>
        <marker id="depConnArrow" markerWidth={12} markerHeight={12} refX={8} refY={4} orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,4 L0,8 Z" fill="#3579f8" />
        </marker>
      </defs>
      <line ref={lineRef} stroke="#3579f8" strokeWidth={2} strokeOpacity={0.9} markerEnd="url(#depConnArrow)" />
    </svg>,
    document.body
  );
};

export default DependencyConnector;
