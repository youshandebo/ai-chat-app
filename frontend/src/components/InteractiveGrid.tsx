import { useEffect, useRef, useState, memo, useCallback } from "react";

// Interactive grid with gyroscope support for mobile and random drift when idle
export default function InteractiveGrid() {
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [gyroPos, setGyroPos] = useState<{ x: number; y: number } | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [isMobile, setIsMobile] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const idleTimeoutRef = useRef<number | null>(null);
    const driftRef = useRef({ time: 0 });

    useEffect(() => {
        const updateSize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };

        // Check if mobile
        const checkMobile = () => {
            setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };

        window.addEventListener('resize', updateSize);
        updateSize();
        checkMobile();

        // Desktop mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
            setIsIdle(false);
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = window.setTimeout(() => setIsIdle(true), 3000);
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        // Mobile gyroscope tracking
        const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
            if (e.gamma !== null && e.beta !== null) {
                // gamma: left-right tilt (-90 to 90)
                // beta: front-back tilt (-180 to 180)
                const normalizedX = (e.gamma / 45) * (window.innerWidth / 2) + window.innerWidth / 2;
                const normalizedY = ((e.beta - 45) / 45) * (window.innerHeight / 2) + window.innerHeight / 2;
                setGyroPos({ x: normalizedX, y: normalizedY });
                setIsIdle(false);
                if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
                idleTimeoutRef.current = window.setTimeout(() => setIsIdle(true), 3000);
            }
        };

        // Request permission for iOS 13+ devices
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            // We'll request on first user interaction
            const requestPermission = async () => {
                try {
                    const permission = await (DeviceOrientationEvent as any).requestPermission();
                    if (permission === 'granted') {
                        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
                    }
                } catch (err) {
                    console.log('DeviceOrientation permission denied');
                }
            };
            window.addEventListener('touchstart', requestPermission, { once: true });
        } else {
            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
        }

        // Set initial idle state after a short delay
        idleTimeoutRef.current = window.setTimeout(() => setIsIdle(true), 2000);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
            window.removeEventListener('resize', updateSize);
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        };
    }, []);

    // Update drift time for idle animation
    useEffect(() => {
        if (!isIdle) return;

        let animationId: number;
        const animate = () => {
            driftRef.current.time += 0.016; // ~60fps
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationId);
    }, [isIdle]);

    const rows = 12;
    const cols = 18;

    // Determine active position - prefer gyro on mobile, mouse on desktop
    const activePos = isMobile ? gyroPos : mousePos;

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
                        mouseX={activePos?.x ?? null}
                        mouseY={activePos?.y ?? null}
                        isIdle={isIdle}
                        driftTime={driftRef.current.time}
                    />
                ))}
            </svg>
        </div>
    );
}

const GridDot = memo(function GridDot({
    row, col, totalRows, totalCols, width, height, mouseX, mouseY, isIdle, driftTime,
}: {
    row: number; col: number; totalRows: number; totalCols: number;
    width: number; height: number;
    mouseX: number | null; mouseY: number | null;
    isIdle: boolean; driftTime: number;
}) {
    const pxX = ((col + 0.5) / totalCols) * width;
    const pxY = ((row + 0.5) / totalRows) * height;
    const cx = `${((col + 0.5) / totalCols) * 100}%`;
    const cy = `${((row + 0.5) / totalRows) * 100}%`;

    // Unique seed for each dot's drift pattern
    const seed = row * totalCols + col;
    const phase1 = seed * 0.1;
    const phase2 = seed * 0.15;
    const freq1 = 0.3 + (seed % 5) * 0.05;
    const freq2 = 0.25 + (seed % 7) * 0.04;

    let influence = 0, tx = 0, ty = 0;

    if (isIdle) {
        // Organic drift pattern when idle
        const driftX = Math.sin(driftTime * freq1 + phase1) * 8;
        const driftY = Math.cos(driftTime * freq2 + phase2) * 6;
        const breathe = Math.sin(driftTime * 0.5 + phase1) * 0.3;

        tx = driftX;
        ty = driftY;
        influence = 0.15 + breathe;
    } else if (mouseX !== null && mouseY !== null) {
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
                transition: isIdle ? 'all 0.5s ease-in-out' : 'all 0.08s ease-out',
            }}
        />
    );
});
