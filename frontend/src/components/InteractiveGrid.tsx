import { useEffect, useRef, useState, memo } from "react";

export default function InteractiveGrid() {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateSize = () => {
            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                setSvgSize({ width: rect.width, height: rect.height });
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();
        setTimeout(updateSize, 100);

        // Mouse move handler - calculate position relative to SVG element
        const handleMouseMove = (e: MouseEvent) => {
            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                // Use clientX/Y relative to SVG's current viewport position
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const rows = 14;
    const cols = 20;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden -z-10 pointer-events-none"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 dark:to-dark-bg/60" />
            <svg
                ref={svgRef}
                className="w-full h-full opacity-50 dark:opacity-40"
            >
                {svgSize.width > 0 && Array.from({ length: rows * cols }).map((_, i) => (
                    <GridDot
                        key={i}
                        row={Math.floor(i / cols)}
                        col={i % cols}
                        totalRows={rows}
                        totalCols={cols}
                        svgWidth={svgSize.width}
                        svgHeight={svgSize.height}
                        mouseX={mousePos?.x ?? null}
                        mouseY={mousePos?.y ?? null}
                    />
                ))}
            </svg>
        </div>
    );
}

const GridDot = memo(function GridDot({
    row, col, totalRows, totalCols, svgWidth, svgHeight, mouseX, mouseY,
}: {
    row: number; col: number; totalRows: number; totalCols: number;
    svgWidth: number; svgHeight: number;
    mouseX: number | null; mouseY: number | null;
}) {
    // Pixel position within the SVG's visible area
    const pxX = ((col + 0.5) / totalCols) * svgWidth;
    const pxY = ((row + 0.5) / totalRows) * svgHeight;

    // Percentage for SVG positioning
    const cx = `${((col + 0.5) / totalCols) * 100}%`;
    const cy = `${((row + 0.5) / totalRows) * 100}%`;

    let influence = 0, transformX = 0, transformY = 0;

    if (mouseX !== null && mouseY !== null) {
        const dist = Math.sqrt((mouseX - pxX) ** 2 + (mouseY - pxY) ** 2);
        influence = Math.max(0, 1 - dist / 250);
        transformX = (mouseX - pxX) * influence * 0.15;
        transformY = (mouseY - pxY) * influence * 0.15;
    }

    const r = 3 + influence * 6;
    const opacity = 0.3 + influence * 0.6;
    const c = Math.round(100 + influence * 50);
    const b = Math.round(180 + influence * 75);

    return (
        <circle
            cx={cx} cy={cy} r={r}
            fill={`rgba(${c}, ${c}, ${b}, ${opacity})`}
            style={{
                transform: `translate(${transformX}px, ${transformY}px)`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'all 0.1s ease-out',
            }}
        />
    );
});
