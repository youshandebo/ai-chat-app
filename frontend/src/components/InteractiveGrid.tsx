import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function InteractiveGrid() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Denser grid
    const rows = 16;
    const cols = 24;
    const items = [];

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            items.push({ id: `${i}-${j}`, r: i, c: j });
        }
    }

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden -z-10 pointer-events-none"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 dark:to-dark-bg/50" />
            <div
                className="grid w-full h-full opacity-40 dark:opacity-30"
                style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
            >
                {items.map((item) => (
                    <GridItem key={item.id} mouseX={mousePosition.x} mouseY={mousePosition.y} />
                ))}
            </div>
        </div>
    );
}

function GridItem({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [center, setCenter] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (ref.current) {
            setCenter({
                x: ref.current.offsetLeft + ref.current.offsetWidth / 2,
                y: ref.current.offsetTop + ref.current.offsetHeight / 2,
            });
        }
    }, []);

    // Calculate distance
    const dist = Math.sqrt(Math.pow(mouseX - center.x, 2) + Math.pow(mouseY - center.y, 2));
    const maxDist = 300;
    const influence = Math.max(0, 1 - dist / maxDist);

    // More subtle, fluid movement
    const x = (mouseX - center.x) * influence * 0.15;
    const y = (mouseY - center.y) * influence * 0.15;
    const scale = 1 + influence * 0.8;
    const colorInfluence = influence * 100;

    return (
        <div ref={ref} className="flex items-center justify-center">
            <motion.div
                className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600"
                style={{
                    backgroundColor: `rgba(${100 + colorInfluence}, ${100 + colorInfluence}, ${255}, ${0.3 + influence * 0.5})`
                }}
                animate={{
                    x,
                    y,
                    scale,
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20, mass: 0.2 }}
            />
        </div>
    );
}
