import { useEffect, useRef, useState, memo } from "react";

// Interactive grid that scrolls with page content
export default function InteractiveGrid() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Handle resize
        const handleResize = () => {
            if (containerRef.current) {
                // Get actual container dimensions
                const parent = containerRef.current.parentElement;
                setDimensions({
                    width: parent?.scrollWidth || window.innerWidth,
                    height: parent?.scrollHeight || window.innerHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        // Use setTimeout to ensure parent is fully rendered
        setTimeout(handleResize, 100);
        handleResize();

        // Handle mouse move
        let ticking = false;
        const handleMouseMove = (e: MouseEvent) => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    if (containerRef.current) {
                        // Use pageX/Y for document-relative coordinates
                        // Subtract the container's offset from the document
                        const parent = containerRef.current.parentElement;
                        const offsetLeft = parent?.offsetLeft || 0;
                        const offsetTop = parent?.offsetTop || 0;

                        setMousePos({
                            x: e.pageX - offsetLeft,
                            y: e.pageY - offsetTop,
                        });
                    }
                    ticking = false;
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Grid configuration
    const rows = 14;
    const cols = 20;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden -z-10 pointer-events-none"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 dark:to-dark-bg/60" />
            <svg
                className="w-full h-full opacity-50 dark:opacity-40"
            >
                {dimensions.width > 0 && Array.from({ length: rows * cols }).map((_, i) => {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    return (
                        <GridDot
                            key={i}
                            row={row}
                            col={col}
                            totalRows={rows}
                            totalCols={cols}
                            containerWidth={dimensions.width}
                            containerHeight={dimensions.height}
                            mouseX={mousePos?.x ?? null}
                            mouseY={mousePos?.y ?? null}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

// Memoized grid dot
const GridDot = memo(function GridDot({
    row,
    col,
    totalRows,
    totalCols,
    containerWidth,
    containerHeight,
    mouseX,
    mouseY,
}: {
    row: number;
    col: number;
    totalRows: number;
    totalCols: number;
    containerWidth: number;
    containerHeight: number;
    mouseX: number | null;
    mouseY: number | null;
}) {
    // Calculate pixel position based on container size
    const pxX = ((col + 0.5) / totalCols) * containerWidth;
    const pxY = ((row + 0.5) / totalRows) * containerHeight;

    // Percentage position for SVG placement
    const cx = `${((col + 0.5) / totalCols) * 100}%`;
    const cy = `${((row + 0.5) / totalRows) * 100}%`;

    // Calculate influence (0 if mouse not tracked yet)
    let influence = 0;
    let transformX = 0;
    let transformY = 0;

    if (mouseX !== null && mouseY !== null) {
        const dist = Math.sqrt(Math.pow(mouseX - pxX, 2) + Math.pow(mouseY - pxY, 2));
        const maxDist = 250;
        influence = Math.max(0, 1 - dist / maxDist);

        // Move towards mouse
        const dx = mouseX - pxX;
        const dy = mouseY - pxY;
        const moveFactor = influence * 0.15;
        transformX = dx * moveFactor;
        transformY = dy * moveFactor;
    }

    // Visual effects
    const r = 3 + influence * 6;
    const opacity = 0.3 + influence * 0.6;
    const red = Math.round(100 + influence * 50);
    const green = Math.round(100 + influence * 50);
    const blue = Math.round(180 + influence * 75);

    return (
        <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={`rgba(${red}, ${green}, ${blue}, ${opacity})`}
            style={{
                transform: `translate(${transformX}px, ${transformY}px)`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'all 0.1s ease-out',
            }}
        />
    );
});
