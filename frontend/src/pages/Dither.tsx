import React, { useEffect, useRef } from 'react';

export interface DitherProps {
  waveColor?: [number, number, number];
  bgColor?: [number, number, number];
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  colorNum?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  waveSpeed?: number;
}

const VS = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_waveColor;
uniform vec3 u_bgColor;
uniform float u_waveAmplitude;
uniform float u_waveFrequency;
uniform float u_waveSpeed;
uniform float u_colorNum;
uniform float u_mouseRadius;
uniform bool u_enableMouse;

float bayer4(vec2 p) {
    vec2 f = floor(mod(p, 4.0));
    int x = int(f.x);
    int y = int(f.y);
    if (y == 0) {
      if (x == 0) return 0.0/16.0;
      if (x == 1) return 8.0/16.0;
      if (x == 2) return 2.0/16.0;
      return 10.0/16.0;
    }
    if (y == 1) {
      if (x == 0) return 12.0/16.0;
      if (x == 1) return 4.0/16.0;
      if (x == 2) return 14.0/16.0;
      return 6.0/16.0;
    }
    if (y == 2) {
      if (x == 0) return 3.0/16.0;
      if (x == 1) return 11.0/16.0;
      if (x == 2) return 1.0/16.0;
      return 9.0/16.0;
    }
    if (x == 0) return 15.0/16.0;
    if (x == 1) return 7.0/16.0;
    if (x == 2) return 13.0/16.0;
    return 5.0/16.0;
}

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;
  
  float time = u_time * u_waveSpeed;
  
  float wave = sin(p.x * u_waveFrequency + time) * cos(p.y * u_waveFrequency + time) * u_waveAmplitude;
  wave += sin(p.y * u_waveFrequency * 1.5 - time * 0.8) * u_waveAmplitude * 0.5;

  if (u_enableMouse && u_mouse.x >= 0.0) {
    vec2 m = u_mouse * aspect;
    float dist = length(p - m);
    if (dist < u_mouseRadius) {
      wave += (1.0 - dist / u_mouseRadius) * 0.25;
    }
  }

  float intensity = clamp(0.5 + wave, 0.0, 1.0);
  vec2 px = gl_FragCoord.xy;
  float dither = bayer4(px);
  
  float quantized = floor((intensity + (dither - 0.5) / u_colorNum) * u_colorNum) / max(1.0, u_colorNum - 1.0);
  quantized = clamp(quantized, 0.0, 1.0);

  vec3 finalColor = mix(u_bgColor, u_waveColor, quantized);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const Dither: React.FC<DitherProps> = ({
  waveColor = [0.043, 0.137, 0.235],
  bgColor = [0.043, 0.137, 0.235],
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 0.3,
  colorNum = 4,
  waveAmplitude = 0.3,
  waveFrequency = 3,
  waveSpeed = 0.05,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Create shaders
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VS);
    const frag = createShader(gl.FRAGMENT_SHADER, FS);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Buffer quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uWaveColor = gl.getUniformLocation(program, 'u_waveColor');
    const uBgColor = gl.getUniformLocation(program, 'u_bgColor');
    const uWaveAmp = gl.getUniformLocation(program, 'u_waveAmplitude');
    const uWaveFreq = gl.getUniformLocation(program, 'u_waveFrequency');
    const uWaveSpeed = gl.getUniformLocation(program, 'u_waveSpeed');
    const uColorNum = gl.getUniformLocation(program, 'u_colorNum');
    const uMouseRad = gl.getUniformLocation(program, 'u_mouseRadius');
    const uEnableMouse = gl.getUniformLocation(program, 'u_enableMouse');

    let mouseX = -1;
    let mouseY = -1;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    const handleMouseLeave = () => {
      mouseX = -1;
      mouseY = -1;
    };

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    let animationId: number;
    let startTime = performance.now();

    const resize = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }
    };

    const render = (now: number) => {
      resize();

      const elapsed = disableAnimation ? 0 : (now - startTime) / 1000;

      gl.uniform1f(uTime, elapsed * 50.0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform3f(uWaveColor, waveColor[0], waveColor[1], waveColor[2]);
      gl.uniform3f(uBgColor, bgColor[0], bgColor[1], bgColor[2]);
      gl.uniform1f(uWaveAmp, waveAmplitude);
      gl.uniform1f(uWaveFreq, waveFrequency);
      gl.uniform1f(uWaveSpeed, waveSpeed);
      gl.uniform1f(uColorNum, colorNum);
      gl.uniform1f(uMouseRad, mouseRadius);
      gl.uniform1i(uEnableMouse, enableMouseInteraction ? 1 : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!disableAnimation) {
        animationId = requestAnimationFrame(render);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [
    waveColor,
    bgColor,
    disableAnimation,
    enableMouseInteraction,
    mouseRadius,
    colorNum,
    waveAmplitude,
    waveFrequency,
    waveSpeed,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: enableMouseInteraction ? 'auto' : 'none',
      }}
    />
  );
};

export default Dither;
