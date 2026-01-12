import { motion } from "framer-motion";

export default function NewYearGreetings() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, type: "spring" }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] pointer-events-none w-[90vw] max-w-[800px]"
        >
            <svg viewBox="0 0 1000 400" className="w-full h-full overflow-visible">
                <defs>
                    <path id="curve" d="M50,350 Q500,50 950,350" />
                    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="100%" stopColor="#FFA500" />
                    </linearGradient>
                </defs>
                <text width="1000">
                    <textPath
                        href="#curve"
                        startOffset="50%"
                        textAnchor="middle"
                        className="text-5xl md:text-7xl font-black"
                        style={{
                            fill: "url(#gold-gradient)",
                            filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.5))"
                        }}
                        spacing="auto"
                    >
                        2026 新年快乐！
                    </textPath>
                </text>
            </svg>
        </motion.div>
    );
}
