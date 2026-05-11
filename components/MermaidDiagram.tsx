"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuZoomIn, LuZoomOut, LuMaximize } from "react-icons/lu";

type MermaidDiagramProps = {
  chart: string;
};

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          fontFamily: "inherit",
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: rendered } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.25), 4));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [translate]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.25, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev * 0.8, 0.25));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-divider bg-content1 p-4 text-sm text-danger">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-divider bg-content1 p-8 text-foreground/50">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div className="group/mermaid relative my-4 rounded-lg border border-divider bg-white">
      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-divider bg-white/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/mermaid:opacity-100">
        <button
          type="button"
          onClick={zoomIn}
          className="rounded p-1.5 text-foreground/60 hover:bg-content2 hover:text-foreground"
          aria-label="Zoom in"
        >
          <LuZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="rounded p-1.5 text-foreground/60 hover:bg-content2 hover:text-foreground"
          aria-label="Zoom out"
        >
          <LuZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded p-1.5 text-foreground/60 hover:bg-content2 hover:text-foreground"
          aria-label="Reset view"
        >
          <LuMaximize className="size-4" />
        </button>
      </div>

      {/* Diagram viewport */}
      <div
        ref={containerRef}
        className="h-[400px] cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={svgWrapRef}
          className="h-full w-full origin-center [&_svg]:h-full [&_svg]:w-full"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
