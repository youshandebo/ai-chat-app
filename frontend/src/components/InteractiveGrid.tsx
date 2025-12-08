import { useEffect, useRef, useState, memo } from "react";

// Interactive grid with fixed positioning for reliable mouse tracking
export default function InteractiveGrid() {
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateSize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', updateSize);
        updateSize();

        // Simple mouse tracking with clientX/Y for fixed positioning
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const rows = 12;
    const cols = 18;

    return (
        <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/70 dark:to-dark-bg/70" />
            <svg className="w-full h-full opacity-40 dark:opacity-30">
                {size.width > 0 && Array.from({ length: rows * cols }).map((_, i) => (
                    <GridDot
                        key={i}
                        row={Math.floor(i / cols)}
                        col={i % cols}
                        totalRows={rows}
                        totalCols={cols}
                        width={size.width}
                        height={size.height}
                        mouseX={mousePos?.x ?? null}
                        mouseY={mousePos?.y ?? null}
                    />
                ))}
            </svg>
        </div>
    );
}

const GridDot = memo(function GridDot({
    row, col, totalRows, totalCols, width, height, mouseX, mouseY,
}: {
    row: number; col: number; totalRows: number; totalCols: number;
    width: number; height: number;
    mouseX: number | null; mouseY: number | null;
}) {
    const pxX = ((col + 0.5) / totalCols) * width;
    const pxY = ((row + 0.5) / totalRows) * height;
    const cx = `${((col + 0.5) / totalCols) * 100}%`;
    const cy = `${((row + 0.5) / totalRows) * 100}%`;

    let influence = 0, tx = 0, ty = 0;

    if (mouseX !== null && mouseY !== null) {
        const dist = Math.sqrt((mouseX - pxX) ** 2 + (mouseY - pxY) ** 2);
        influence = Math.max(0, 1 - dist / 200);
        tx = (mouseX - pxX) * influence * 0.12;
        ty = (mouseY - pxY) * influence * 0.12;
    }

    const r = 2.5 + influence * 5;
    const opacity = 0.25 + influence * 0.6;
    const color = `rgba(${100 + influence * 55}, ${100 + influence * 55}, ${180 + influence * 75}, ${opacity})`;

    return (
        <circle
            cx={cx} cy={cy} r={r} fill={color}
            style={{
                transform: `translate(${tx}px, ${ty}px)`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'all 0.08s ease-out',
            }}
        />
    );
});
