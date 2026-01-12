import { useEffect, useRef } from 'react';

export default function Fireworks() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const rockets: Rocket[] = [];
        let animationId: number;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            alpha: number;

            constructor(x: number, y: number, color: string) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = color;
                this.alpha = 1;
            }

            draw() {
                if (!ctx) return;
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.05; // gravity
                this.alpha -= 0.01;
            }
        }

        class Rocket {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            exploded: boolean;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = canvas!.height;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = -(Math.random() * 5 + 10);
                this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
                this.exploded = false;
            }

            draw() {
                if (!ctx) return;
                ctx.globalAlpha = 1;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.2; // gravity

                if (this.vy >= 0 && !this.exploded) {
                    this.explode();
                }
            }

            explode() {
                this.exploded = true;
                for (let i = 0; i < 50; i++) {
                    particles.push(new Particle(this.x, this.y, this.color));
                }
            }
        }

        function animate() {
            if (!canvas || !ctx) return;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (Math.random() < 0.05) {
                rockets.push(new Rocket());
            }

            rockets.forEach((rocket, i) => {
                rocket.draw();
                rocket.update();
                if (rocket.exploded) rockets.splice(i, 1);
            });

            particles.forEach((p, i) => {
                p.draw();
                p.update();
                if (p.alpha <= 0) particles.splice(i, 1);
            });

            animationId = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationId);
        };

    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[100]"
        />
    );
}
