import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  opacityDir: number;
  color: 'cyan' | 'magenta' | 'white';
  layer: number; // 0=far 1=mid 2=near
  trail: Array<{ x: number; y: number }>;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const psRef     = useRef<Particle[]>([]);
  const laserRef  = useRef({ x: -300, active: false });
  const timeRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn helpers
    const rnd  = (min: number, max: number) => Math.random() * (max - min) + min;
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const spawnParticle = (fromBottom = true): Particle => {
      const layer = Math.floor(rnd(0, 3)) as 0 | 1 | 2;
      const speed = [0.15, 0.35, 0.65][layer];
      const sz    = [0.5,  1.1,  2.0][layer];
      return {
        x: rnd(0, canvas.width),
        y: fromBottom ? canvas.height + rnd(0, 60) : rnd(0, canvas.height),
        vx: rnd(-0.2, 0.2),
        vy: -rnd(speed * 0.5, speed * 1.5),
        size: rnd(sz * 0.6, sz * 1.5),
        opacity: fromBottom ? 0 : rnd(0.2, 0.85),
        opacityDir: rnd(0.003, 0.012),
        color: pick(['cyan', 'cyan', 'cyan', 'magenta', 'white'] as const),
        layer,
        trail: [],
      };
    };

    // Init pool
    for (let i = 0; i < 100; i++) psRef.current.push(spawnParticle(false));

    // Fire laser once on load (single dramatic sweep, no repeat)
    setTimeout(() => { laserRef.current = { x: -300, active: true }; }, 400);

    // Hex grid helper
    const drawHexGrid = (t: number) => {
      const hexR = 55;
      const hexW = hexR * 2;
      const hexH = Math.sqrt(3) * hexR;
      ctx.save();
      for (let row = -1; row < canvas.height / hexH + 2; row++) {
        for (let col = -1; col < canvas.width / hexW + 2; col++) {
          const cx = col * hexW * 0.75 + (row % 2 === 0 ? 0 : hexW * 0.375);
          const cy = row * hexH;
          const pulse = Math.sin(t * 0.5 + col * 0.3 + row * 0.4) * 0.5 + 0.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + hexR * 0.98 * Math.cos(angle);
            const py = cy + hexR * 0.98 * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(0,255,255,${0.015 + pulse * 0.012})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // Particle color rgba
    const particleColor = (p: Particle, alpha: number) => {
      if (p.color === 'cyan')    return `rgba(0,255,255,${alpha})`;
      if (p.color === 'magenta') return `rgba(255,0,255,${alpha})`;
      return `rgba(200,240,255,${alpha})`;
    };

    const draw = (now: number) => {
      const dt = (now - (timeRef.current || now)) / 16;
      timeRef.current = now;
      const t = now * 0.001;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Hex grid
      drawHexGrid(t);

      // Ambient radial orbs
      const orb = (x: number, y: number, r: number, c: string, a: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, c.replace(')', `,${a})`).replace('rgb', 'rgba'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      };
      const pulse = Math.sin(t * 0.7) * 0.5 + 0.5;
      orb(canvas.width * 0.15, canvas.height * 0.3,  280, 'rgb(0,255,255)',   0.04 + pulse * 0.02);
      orb(canvas.width * 0.85, canvas.height * 0.55, 240, 'rgb(255,0,255)',   0.035 + pulse * 0.015);
      orb(canvas.width * 0.5,  canvas.height * 0.1,  320, 'rgb(0,180,255)',   0.03 + pulse * 0.01);

      // Particles — far layer first
      for (let layer = 0; layer <= 2; layer++) {
        psRef.current.forEach((p, i) => {
          if (p.layer !== layer) return;

          // Motion
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.opacity += p.opacityDir;
          if (p.opacity > 0.9) p.opacityDir = -Math.abs(p.opacityDir);
          if (p.opacity < 0)   p.opacityDir =  Math.abs(p.opacityDir);

          // Track trail for near particles
          if (p.layer === 2) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
          }

          if (p.y < -20) psRef.current[i] = spawnParticle(true);

          // Draw trail
          if (p.layer === 2 && p.trail.length > 2) {
            for (let t = 1; t < p.trail.length; t++) {
              const a = (t / p.trail.length) * p.opacity * 0.35;
              ctx.beginPath();
              ctx.moveTo(p.trail[t-1].x, p.trail[t-1].y);
              ctx.lineTo(p.trail[t].x, p.trail[t].y);
              ctx.strokeStyle = particleColor(p, a);
              ctx.lineWidth = p.size * 0.5;
              ctx.stroke();
            }
          }

          // Glow halo
          if (p.size > 1.2) {
            const haloR = p.size * (4 + p.layer * 2);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
            g.addColorStop(0, particleColor(p, p.opacity * 0.35));
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, haloR, 0, Math.PI*2); ctx.fill();
          }

          // Core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fillStyle = particleColor(p, p.opacity);
          ctx.fill();
        });
      }

      // One-shot laser sweep
      const laser = laserRef.current;
      if (laser.active) {
        laser.x += 14 * dt;
        if (laser.x > canvas.width + 200) { laser.active = false; }

        const lx = laser.x;
        const wash = ctx.createLinearGradient(lx - 220, 0, lx + 100, 0);
        wash.addColorStop(0, 'transparent');
        wash.addColorStop(0.5, 'rgba(0,255,255,0.04)');
        wash.addColorStop(0.85, 'rgba(0,255,255,0.09)');
        wash.addColorStop(1, 'transparent');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx - 70, canvas.height);
        ctx.strokeStyle = 'rgba(140,255,255,0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx - 70, canvas.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
