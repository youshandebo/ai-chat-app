import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const RED_PACKET = "🧧";

export default function RedPacketRain() {
    const [packets, setPackets] = useState<{ id: number; x: number; delay: number }[]>([]);

    useEffect(() => {
        // Generate packets
        const count = 30;
        const newPackets = Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // percentage
            delay: Math.random() * 5
        }));
        setPackets(newPackets);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {packets.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ y: -50, x: `${p.x}vw`, rotate: 0 }}
                    animate={{ y: '120vh', rotate: 360 }}
                    transition={{
                        duration: 4,
                        delay: p.delay,
                        ease: "linear",
                        repeat: Infinity
                    }}
                    className="absolute text-4xl"
                >
                    {RED_PACKET}
                </motion.div>
            ))}
        </div>
    );
}
