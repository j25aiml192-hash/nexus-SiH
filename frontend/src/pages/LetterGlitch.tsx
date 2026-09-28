import React, { useRef, useEffect } from 'react';

interface LetterGlitchProps {
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  glitchColors?: string[];
  letters?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LetterGlitch: React.FC<LetterGlitchProps> = ({
  glitchSpeed = 50,
  centerVignette = true,
  outerVignette = false,
  smooth = true,
  glitchColors = ['#1E293B', '#3B82F6', '#10B981', '#38BDF8', '#0F172A'],
  letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$KEYNEXUS8821',
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initGrid();
    };

    window.addEventListener('resize', handleResize);

    const fontSize = 14;
    let cols = Math.floor(width / fontSize);
    let rows = Math.floor(height / fontSize);

    interface CharItem {
      char: string;
      color: string;
      opacity: number;
      targetOpacity: number;
    }

    let grid: CharItem[][] = [];

    const initGrid = () => {
      cols = Math.floor(width / fontSize);
      rows = Math.floor(height / fontSize);
      grid = [];
      for (let r = 0; r < rows; r++) {
        const row: CharItem[] = [];
        for (let c = 0; c < cols; c++) {
          row.push({
            char: letters[Math.floor(Math.random() * letters.length)],
            color: glitchColors[Math.floor(Math.random() * glitchColors.length)],
            opacity: Math.random() * 0.4 + 0.1,
            targetOpacity: Math.random() * 0.4 + 0.1,
          });
        }
        grid.push(row);
      }
    };

    initGrid();

    let lastTime = performance.now();
    const updateInterval = Math.max(10, 1000 / glitchSpeed);

    const render = (now: number) => {
      const delta = now - lastTime;
      if (delta >= updateInterval) {
        lastTime = now;

        // Glitch a subset of characters
        const glitchCount = Math.floor(cols * rows * 0.08);
        for (let i = 0; i < glitchCount; i++) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          if (grid[r] && grid[r][c]) {
            grid[r][c].char = letters[Math.floor(Math.random() * letters.length)];
            grid[r][c].color = glitchColors[Math.floor(Math.random() * glitchColors.length)];
            grid[r][c].targetOpacity = Math.random() * 0.6 + 0.05;
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const item = grid[r]?.[c];
          if (!item) continue;

          if (smooth) {
            item.opacity += (item.targetOpacity - item.opacity) * 0.1;
          } else {
            item.opacity = item.targetOpacity;
          }

          ctx.fillStyle = item.color;
          ctx.globalAlpha = item.opacity;
          ctx.fillText(item.char, c * fontSize + fontSize / 2, r * fontSize + fontSize / 2);
        }
      }

      ctx.globalAlpha = 1;

      // Center Vignette
      if (centerVignette) {
        const centerGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.5
        );
        centerGrad.addColorStop(0, 'rgba(5, 11, 20, 0.85)');
        centerGrad.addColorStop(0.5, 'rgba(5, 11, 20, 0.5)');
        centerGrad.addColorStop(1, 'rgba(5, 11, 20, 0.2)');
        ctx.fillStyle = centerGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Outer Vignette
      if (outerVignette) {
        const outerGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.max(width, height) * 0.3,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.7
        );
        outerGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        outerGrad.addColorStop(1, 'rgba(5, 11, 20, 0.95)');
        ctx.fillStyle = outerGrad;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [glitchSpeed, centerVignette, outerVignette, smooth, glitchColors, letters]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

export default LetterGlitch;
