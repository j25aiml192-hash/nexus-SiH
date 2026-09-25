import React, { useEffect, useRef } from 'react';

interface Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseAlpha: number;
  alpha: number;
  phase: number;
  speed: number;
  amplitude: number;
  driftX: number;
  clusterId: number;
}

export const NexusAnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    // Palette: NEXUS Bright Theme Cyber Telemetry
    const DOT_COLORS = [
      '#6B8FF5', // NEXUS Indigo-Blue
      '#9CCBFF', // Light Cyan-Blue
      '#80A8FF', // Soft Periwinkle
      '#315EEB', // Primary Accent
      '#4C75F2', // Muted Royal
    ];

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      // Particle density based on screen size
      let particleCount = 160;
      if (width < 640) {
        particleCount = 50;
      } else if (width < 1024) {
        particleCount = 90;
      }

      // Create irregular cluster anchors along edges and wave paths
      const clusterCenters = [
        { x: width * 0.1, y: height * 0.15 }, // Top-Left Margin
        { x: width * 0.88, y: height * 0.2 }, // Top-Right Margin
        { x: width * 0.05, y: height * 0.75 }, // Bottom-Left Margin
        { x: width * 0.92, y: height * 0.8 }, // Bottom-Right Margin
        { x: width * 0.5, y: height * 0.08 }, // Top Center Hero
        { x: width * 0.5, y: height * 0.92 }, // Bottom Center
      ];

      for (let i = 0; i < particleCount; i++) {
        let bx: number;
        let by: number;
        let baseAlpha: number;

        // 65% of particles generated around edge clusters & wave paths
        if (i < particleCount * 0.65) {
          const cluster = clusterCenters[i % clusterCenters.length];
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.pow(Math.random(), 1.5) * 260; // Concentrated around edges
          bx = cluster.x + Math.cos(angle) * dist;
          by = cluster.y + Math.sin(angle) * dist;
          baseAlpha = 0.10 + Math.random() * 0.12; // Slightly higher alpha around edges
        } else {
          // 35% distributed across flowing wave paths across the screen
          bx = Math.random() * width;
          // Follow gentle sine wave height profile across screen
          const waveBaseY = height * 0.3 + Math.sin((bx / width) * Math.PI * 2) * (height * 0.2);
          by = waveBaseY + (Math.random() - 0.5) * (height * 0.35);
          baseAlpha = 0.06 + Math.random() * 0.08; // Very subtle in inner card zones
        }

        const color = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
        const radius = 1.0 + Math.random() * 1.4; // Tiny dots: 1.0px to 2.4px

        particles.push({
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          radius,
          color,
          baseAlpha,
          alpha: baseAlpha,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0004 + Math.random() * 0.0006, // 8-15 second smooth cycle
          amplitude: 8 + Math.random() * 16,
          driftX: (Math.random() - 0.2) * 0.15, // Slow horizontal telemetry drift
          clusterId: i % clusterCenters.length,
        });
      }
    };

    initParticles();

    // Smooth Mouse Proximity Interpolation
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    let startTime = performance.now();

    const render = (now: number) => {
      // Pause rendering if tab is hidden to preserve performance
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const elapsed = (now - startTime) / 1000;

      // Smooth mouse position decay
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Render faint telemetry data links between close particles in clusters
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i += 2) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j += 3) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          // Connect dots within 85px threshold
          if (distSq < 7225) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / 85) * 0.06 * ((p1.alpha + p2.alpha) / 2);
            if (lineAlpha > 0.005) {
              ctx.strokeStyle = `rgba(107, 143, 245, ${lineAlpha.toFixed(4)})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Telemetry horizontal wrap drift
        p.baseX += p.driftX;
        if (p.baseX > width + 60) p.baseX = -60;
        if (p.baseX < -60) p.baseX = width + 60;

        // Wave motion math
        const waveX = Math.sin(elapsed * p.speed * 1000 + p.phase) * p.amplitude;
        const waveY = Math.cos(elapsed * p.speed * 800 + p.phase * 1.3) * (p.amplitude * 0.6);

        // Subtle mouse reaction force (proximity shift, no chasing)
        if (mouseX > 0 && mouseY > 0) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140;

          if (dist < maxDist && dist > 0) {
            const force = (1 - dist / maxDist) * 0.2;
            p.vx += (dx / dist) * force * 1.2;
            p.vy += (dy / dist) * force * 1.2;
          }
        }

        // Apply friction & velocity dampening
        p.vx *= 0.90;
        p.vy *= 0.90;

        // Update target positions
        p.x = p.baseX + waveX + p.vx;
        p.y = p.baseY + waveY + p.vy;

        // Pulsing opacity cycle (8-15 seconds)
        const pulse = Math.sin(elapsed * (p.speed * 600) + p.phase);
        p.alpha = Math.max(0.04, Math.min(0.25, p.baseAlpha + pulse * 0.05));

        // Draw particle dot
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="nexus-animated-bg-container pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Soft Radial Gradient Background Layers */}
      <div className="nexus-radial-gradient top-left" />
      <div className="nexus-radial-gradient top-right" />
      <div className="nexus-radial-gradient bottom-right" />
      <div className="nexus-radial-gradient center-glow" />

      {/* HTML5 Telemetry Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-90"
      />
    </div>
  );
};
