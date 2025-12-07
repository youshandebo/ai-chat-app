import { useEffect, useRef, useState, memo } from "react";

// Interactive grid with accurate particle effect
export default function InteractiveGrid() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Handle resize to get accurate dimensions
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        // Handle mouse move
        let ticking = false;
        const handleMouseMove = (e: MouseEvent) => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setMousePos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
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
                style={{ willChange: 'auto' }}
            >
                {/* Only render dots if we have dimensions to prevent jumpiness */}
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
                            mouseX={mousePos.x}
                            mouseY={mousePos.y}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

// Memoized grid dot with dynamic position calculation
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
    mouseX: number;
    mouseY: number;
}) {
    // Calculate pixel position accurately based on container size
    const pxX = ((col + 0.5) / totalCols) * containerWidth;
    const pxY = ((row + 0.5) / totalRows) * containerHeight;

    // Percentage position for SVG placement
    const cx = `${((col + 0.5) / totalCols) * 100}%`;
    const cy = `${((row + 0.5) / totalRows) * 100}%`;

    const dist = Math.sqrt(Math.pow(mouseX - pxX, 2) + Math.pow(mouseY - pxY, 2));
    const maxDist = 250;
    const influence = Math.max(0, 1 - dist / maxDist);

    // Visual effects
    // Base radius 3, max radius 9 when hovered
    const r = 3 + influence * 6;
    const opacity = 0.3 + influence * 0.6;

    // Movement effect: move slightly towards mouse
    // Calculate vector to mouse
    const dx = mouseX - pxX;
    const dy = mouseY - pxY;
    // Move up to 20px towards mouse based on influence
    const moveFactor = influence * 0.15;
    const transformX = dx * moveFactor;
    const transformY = dy * moveFactor;

    // Colors
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
