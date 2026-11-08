"use client";

import { useEffect, useRef } from "react";

/**
 * A deliberately small WebGL layer for the landing hero.
 *
 * It draws one deterministic constellation of score points and connecting
 * rules. Product content stays in accessible DOM/SVG above it; this canvas is
 * decorative progressive enhancement and disappears for reduced motion,
 * unsupported WebGL, or when it leaves the viewport.
 */
export function DataConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) return;
    // Keep explicit non-null aliases for callbacks declared below. TypeScript
    // does not preserve the early-return narrowing across those closures.
    const surface = canvas;
    const context = gl;

    const vertexSource = `
      attribute vec2 a_position;
      uniform float u_time;
      uniform float u_scroll;
      uniform vec2 u_pointer;
      uniform float u_aspect;
      uniform float u_points;
      void main() {
        vec2 p = a_position;
        float wave = sin((p.x * 5.0) + u_time * 0.34 + p.y * 2.0) * 0.018;
        p.y += wave + u_scroll * (0.04 + abs(p.x) * 0.025);
        vec2 cursor = vec2(u_pointer.x / u_aspect, u_pointer.y);
        float influence = max(0.0, 0.32 - distance(p, cursor));
        p += normalize(p - cursor + vec2(0.0001)) * influence * 0.06;
        gl_Position = vec4(p.x / u_aspect, p.y, 0.0, 1.0);
        gl_PointSize = u_points;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform vec4 u_color;
      uniform float u_is_point;
      void main() {
        if (u_is_point > 0.5) {
          vec2 c = gl_PointCoord - vec2(0.5);
          if (dot(c, c) > 0.25) discard;
        }
        gl_FragColor = u_color;
      }
    `;

    function shader(type: number, source: string) {
      const value = context.createShader(type);
      if (!value) return null;
      context.shaderSource(value, source);
      context.compileShader(value);
      if (!context.getShaderParameter(value, context.COMPILE_STATUS)) {
        context.deleteShader(value);
        return null;
      }
      return value;
    }

    const vertex = shader(context.VERTEX_SHADER, vertexSource);
    const fragment = shader(context.FRAGMENT_SHADER, fragmentSource);
    const program = context.createProgram();
    if (!vertex || !fragment || !program) return;
    context.attachShader(program, vertex);
    context.attachShader(program, fragment);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return;
    context.useProgram(program);

    // Stable pseudo-random points: the same preparation map on every visit.
    let seed = 29;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const points = Array.from({ length: 54 }, () => [
      random() * 2 - 1,
      random() * 1.7 - 0.85,
    ] as const).sort((a, b) => a[0] - b[0]);
    const positions = new Float32Array(points.flat());
    const lines: number[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index]!;
      const next = points[index + 1]!;
      if (Math.abs(current[1] - next[1]) < 0.38) lines.push(...current, ...next);
      const skip = points[index + 5];
      if (skip && Math.abs(current[1] - skip[1]) < 0.2) lines.push(...current, ...skip);
    }

    const pointBuffer = context.createBuffer();
    const lineBuffer = context.createBuffer();
    const location = context.getAttribLocation(program, "a_position");
    const timeLocation = context.getUniformLocation(program, "u_time");
    const scrollLocation = context.getUniformLocation(program, "u_scroll");
    const pointerLocation = context.getUniformLocation(program, "u_pointer");
    const aspectLocation = context.getUniformLocation(program, "u_aspect");
    const sizeLocation = context.getUniformLocation(program, "u_points");
    const colorLocation = context.getUniformLocation(program, "u_color");
    const pointLocation = context.getUniformLocation(program, "u_is_point");

    let width = 1;
    let height = 1;
    let aspect = 1;
    let scroll = 0;
    let visible = true;
    let frame = 0;
    const pointer = { x: 0, y: 0 };

    function resize() {
      const rect = surface.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 1.5);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      aspect = rect.width / Math.max(1, rect.height);
      if (surface.width !== width || surface.height !== height) {
        surface.width = width;
        surface.height = height;
        context.viewport(0, 0, width, height);
      }
    }

    function draw(now: number) {
      frame = 0;
      if (!visible) return;
      resize();
      context.clearColor(0, 0, 0, 0);
      context.clear(context.COLOR_BUFFER_BIT);
      context.enable(context.BLEND);
      context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
      context.uniform1f(timeLocation, now / 1000);
      context.uniform1f(scrollLocation, scroll);
      context.uniform2f(pointerLocation, pointer.x, pointer.y);
      context.uniform1f(aspectLocation, aspect);

      context.bindBuffer(context.ARRAY_BUFFER, lineBuffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array(lines), context.STATIC_DRAW);
      context.enableVertexAttribArray(location);
      context.vertexAttribPointer(location, 2, context.FLOAT, false, 0, 0);
      context.uniform1f(pointLocation, 0);
      context.uniform1f(sizeLocation, 1);
      context.uniform4f(colorLocation, 0.15, 0.14, 0.12, 0.13);
      context.drawArrays(context.LINES, 0, lines.length / 2);

      context.bindBuffer(context.ARRAY_BUFFER, pointBuffer);
      context.bufferData(context.ARRAY_BUFFER, positions, context.STATIC_DRAW);
      context.vertexAttribPointer(location, 2, context.FLOAT, false, 0, 0);
      context.uniform1f(pointLocation, 1);
      context.uniform1f(sizeLocation, Math.min(5, 2.6 * devicePixelRatio));
      context.uniform4f(colorLocation, 0.71, 0.33, 0.2, 0.52);
      context.drawArrays(context.POINTS, 0, points.length);

      frame = requestAnimationFrame(draw);
    }

    function schedule() {
      if (!frame && visible) frame = requestAnimationFrame(draw);
    }
    function onScroll() {
      scroll = Math.min(1, Math.max(0, window.scrollY / innerHeight));
      schedule();
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const rect = surface.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      schedule();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) schedule();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(surface);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    surface.addEventListener("pointermove", onPointerMove, { passive: true });
    schedule();

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll);
      surface.removeEventListener("pointermove", onPointerMove);
      context.deleteBuffer(pointBuffer);
      context.deleteBuffer(lineBuffer);
      context.deleteProgram(program);
      context.deleteShader(vertex);
      context.deleteShader(fragment);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 h-full w-full opacity-80"
    />
  );
}
