
import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AnimatedBackground() {
    const { theme } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (theme !== 'apple') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let t = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const render = () => {
            if (!ctx || !canvas) return;
            t += 0.005;

            // Create a mesh gradient effect
            const w = canvas.width;
            const h = canvas.height;

            // Clear
            ctx.clearRect(0, 0, w, h);

            // Base background
            ctx.fillStyle = '#1f1f1f'; // Dark base
            ctx.fillRect(0, 0, w, h);

            // Blobs
            // 1. Pink/Red (Apple Music primary)
            const x1 = w * 0.5 + Math.sin(t) * w * 0.3;
            const y1 = h * 0.4 + Math.cos(t * 1.2) * h * 0.2;
            const r1 = Math.min(w, h) * 0.6;

            const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
            g1.addColorStop(0, 'rgba(250, 45, 72, 0.4)'); // #fa2d48
            g1.addColorStop(1, 'rgba(250, 45, 72, 0)');

            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(x1, y1, r1, 0, Math.PI * 2);
            ctx.fill();

            // 2. Purple/Blue secondary
            const x2 = w * 0.2 + Math.cos(t * 0.8) * w * 0.2;
            const y2 = h * 0.7 + Math.sin(t * 1.1) * h * 0.2;
            const r2 = Math.min(w, h) * 0.7;

            const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
            g2.addColorStop(0, 'rgba(88, 86, 214, 0.3)'); // Purple
            g2.addColorStop(1, 'rgba(88, 86, 214, 0)');

            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(x2, y2, r2, 0, Math.PI * 2);
            ctx.fill();

            // 3. Orange/Yellow tertiary
            const x3 = w * 0.8 + Math.sin(t * 1.3) * w * 0.2;
            const y3 = h * 0.2 + Math.cos(t * 0.9) * h * 0.2;
            const r3 = Math.min(w, h) * 0.5;

            const g3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
            g3.addColorStop(0, 'rgba(255, 149, 0, 0.2)'); // Orange
            g3.addColorStop(1, 'rgba(255, 149, 0, 0)');

            ctx.fillStyle = g3;
            ctx.beginPath();
            ctx.arc(x3, y3, r3, 0, Math.PI * 2);
            ctx.fill();

            // Overlay blur
            // We use CSS backdrop-filter for the actual blur effect on components, 
            // but we can draw a light noise overlay here if we want.

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    if (theme !== 'apple') return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none"
            style={{ filter: 'blur(60px) saturate(150%)' }} // Heavy blur for liquid effect
        />
    );
}
