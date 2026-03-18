import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  layer: 0 | 1 | 2;
  trail: { x: number; y: number }[];
  color: string;
}

export default function DashboardParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let W = 0, H = 0;
    let particles: Particle[] = [];

    const COLORS = ['#00ffff','#00ffff','#00ffff','#ff00ff','#00ff96'];
    const ORB_CONFIGS = [
      { cx: 0.15, cy: 0.2,  r: 260, phase: 0,   spd: 0.0004, c: 'rgba(0,255,255,' },
      { cx: 0.85, cy: 0.75, r: 200, phase: 2.1, spd: 0.0005, c: 'rgba(255,0,255,' },
      { cx: 0.5,  cy: 0.5,  r: 160, phase: 4.2, spd: 0.0003, c: 'rgba(0,255,150,' },
    ];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const spawn = () => {
      const count = Math.min(Math.floor((W * H) / 16000), 60);
      particles = Array.from({ length: count }, (_, i) => {
        const layer = (i % 3) as 0 | 1 | 2;
        return {
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * (0.06 + layer * 0.07),
          vy: (Math.random() - 0.5) * (0.06 + layer * 0.07),
          size: 0.5 + layer * 0.6 + Math.random() * 0.8,
          opacity: 0.12 + layer * 0.15 + Math.random() * 0.1,
          layer, trail: [],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      });
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.016;

      // Ambient orbs
      ORB_CONFIGS.forEach(o => {
        const pulse = 0.5 + 0.5 * Math.sin(t * o.spd * 1000 + o.phase);
        const alpha = 0.02 + pulse * 0.016;
        const g = ctx.createRadialGradient(o.cx * W, o.cy * H, 0, o.cx * W, o.cy * H, o.r);
        g.addColorStop(0, o.c + alpha + ')');
        g.addColorStop(1, o.c + '0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.cx * W, o.cy * H, o.r, 0, Math.PI * 2); ctx.fill();
      });

      // Hex grid
      const hex = 60;
      for (let row = -1; row < H / hex + 2; row++) {
        for (let col = -1; col < W / (hex * 1.732) + 2; col++) {
          const cx = col * hex * 1.732 + (row % 2 === 0 ? 0 : hex * 0.866);
          const cy = row * hex * 1.5;
          const pulse = Math.sin(t * 0.35 + col * 0.25 + row * 0.4) * 0.01;
          ctx.globalAlpha = 0.032 + pulse;
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const a = (Math.PI / 3) * s;
            const px = cx + hex * 0.46 * Math.cos(a);
            const py = cy + hex * 0.46 * Math.sin(a);
            s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Particles + trails + connections
      const near: Particle[] = [];
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -2) p.x = W + 2;
        if (p.x > W + 2) p.x = -2;
        if (p.y < -2) p.y = H + 2;
        if (p.y > H + 2) p.y = -2;

        if (p.layer === 2) {
          p.trail.unshift({ x: p.x, y: p.y });
          if (p.trail.length > 6) p.trail.pop();
          p.trail.forEach((tp, ti) => {
            ctx.globalAlpha = p.opacity * (1 - ti / p.trail.length) * 0.3;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(tp.x, tp.y, p.size * (1 - ti / p.trail.length) * 0.65, 0, Math.PI * 2); ctx.fill();
          });
          near.push(p);
        }

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.layer === 2 ? 7 : 3;
        ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      });

      // Near-layer connections
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d < 120) {
            ctx.globalAlpha = (1 - d / 120) * 0.07;
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(near[i].x, near[i].y); ctx.lineTo(near[j].x, near[j].y); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize(); spawn(); draw();
    const onResize = () => { resize(); spawn(); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />;
}
