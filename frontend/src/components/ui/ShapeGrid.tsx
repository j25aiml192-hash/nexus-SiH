import React, { useEffect, useRef } from 'react';

export interface ShapeGridProps {
  squareSize?: number;
  borderColor?: string;
  hoverFillColor?: string;
  accentColor?: string;
  animationSpeed?: number;
  shape?: 'square' | 'circle' | 'cross' | 'diamond' | 'mixed';
  opacity?: number;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ShapeGrid: React.FC<ShapeGridProps> = ({
  squareSize = 48,
  borderColor = 'rgba(0, 0, 0, 0.07)',
  hoverFillColor = 'rgba(2, 4, 28, 0.12)',
  accentColor = 'rgba(94, 106, 210, 0.35)',
  animationSpeed = 1,
  shape = 'mixed',
  opacity = 0.65,
  interactive = true,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width || window.innerWidth;
      height = rect?.height || window.innerHeight;
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement || window;
    parent.addEventListener('mousemove', handleMouseMove as any);
    parent.addEventListener('mouseleave', handleMouseLeave as any);

    // Draw single cell shape
    const drawShape = (
      x: number,
      y: number,
      size: number,
      shapeType: string,
      scale: number,
      alpha: number,
      color: string
    ) => {
      ctx.save();
      ctx.translate(x + size / 2, y + size / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;

      const half = size * 0.22;

      switch (shapeType) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, half, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'cross':
          ctx.beginPath();
          ctx.moveTo(-half, 0);
          ctx.lineTo(half, 0);
          ctx.moveTo(0, -half);
          ctx.lineTo(0, half);
          ctx.stroke();
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(0, -half * 1.1);
          ctx.lineTo(half * 1.1, 0);
          ctx.lineTo(0, half * 1.1);
          ctx.lineTo(-half * 1.1, 0);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'square':
        default:
          ctx.strokeRect(-half, -half, half * 2, half * 2);
          break;
      }

      ctx.restore();
    };

    // Render loop
    const render = () => {
      time += 0.015 * animationSpeed;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / squareSize) + 1;
      const rows = Math.ceil(height / squareSize) + 1;

      // 1. Draw Grid Lines
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let c = 0; c <= cols; c++) {
        const x = c * squareSize;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      for (let r = 0; r <= rows; r++) {
        const y = r * squareSize;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Draw Interactive & Animated Grid Shapes
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hoverRadius = 180;

      const shapeTypes: Array<'square' | 'circle' | 'cross' | 'diamond'> = ['square', 'circle', 'cross', 'diamond'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellX = c * squareSize;
          const cellY = r * squareSize;
          const centerX = cellX + squareSize / 2;
          const centerY = cellY + squareSize / 2;

          // Calculate distance to cursor
          const dx = mx - centerX;
          const dy = my - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Wave equation for ambient shape grid motion
          const wave = Math.sin(time + c * 0.35 + r * 0.35);
          const noiseScale = (wave + 1) / 2; // 0 to 1

          // Highlight cells near cursor
          const isNearMouse = interactive && mouseRef.current.active && dist < hoverRadius;
          const mouseIntensity = isNearMouse ? Math.pow(1 - dist / hoverRadius, 2) : 0;

          if (isNearMouse) {
            ctx.fillStyle = hoverFillColor;
            ctx.globalAlpha = mouseIntensity * 0.65;
            ctx.fillRect(cellX + 1, cellY + 1, squareSize - 1, squareSize - 1);
          }

          // Decide shape type for this grid index
          const shapeIdx = (c * 7 + r * 13) % shapeTypes.length;
          const currentShape = shape === 'mixed' ? shapeTypes[shapeIdx] : shape;

          // Scale and alpha calculation
          const scale = 0.5 + noiseScale * 0.3 + mouseIntensity * 0.45;
          const shapeAlpha = Math.max(0.08, noiseScale * 0.35 + mouseIntensity * 0.6);
          const color = mouseIntensity > 0.3 ? hoverFillColor : accentColor;

          // Only draw shapes for a percentage of cells to maintain sleek aesthetic
          if ((c + r * 3) % 2 === 0 || mouseIntensity > 0.1) {
            drawShape(cellX, cellY, squareSize, currentShape, scale, shapeAlpha, color);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      parent.removeEventListener('mousemove', handleMouseMove as any);
      parent.removeEventListener('mouseleave', handleMouseLeave as any);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [squareSize, borderColor, hoverFillColor, accentColor, animationSpeed, shape, opacity, interactive]);

  return (
    <div
      className={`nexus-shape-grid-wrapper ${className}`.trim()}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: opacity,
        zIndex: 1,
        overflow: 'hidden',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default ShapeGrid;
