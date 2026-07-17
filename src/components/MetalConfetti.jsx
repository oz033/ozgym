/* MetalConfetti — GPU-Partikel für den Workout-Abschluss.
   WebGL-Points mit metallischen Silber-/Weiß-Tönen (mono brand) statt
   bunter Emoji-Optik. Physik (Fall, Drift, Flackern) auf der CPU,
   Rendering auf der GPU. Fallbacks:
   - reduced motion → nichts (Meilenstein bleibt über Text/Badges sichtbar)
   - kein WebGL → klassisches CSS-Konfetti (<Confetti/>) */

import React, { useEffect, useRef, useState } from "react";
import { Confetti } from "./ui.jsx";
import { REDUCED_MOTION } from "../lib/utils.js";

const COUNT = 150;

const VERT = `#version 300 es
in vec2 aPos;
in float aSize;
in float aShade;
uniform vec2 uR;
out float vShade;
void main(){
  vec2 clip = (aPos / uR) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = aSize;
  vShade = aShade;
}`;

const FRAG = `#version 300 es
precision mediump float;
in float vShade;
out vec4 outColor;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  // Rechteckige "Flitter"-Plättchen mit weicher Kante
  float a = smoothstep(0.5, 0.42, max(abs(d.x), abs(d.y) * 1.6));
  vec3 c = mix(vec3(0.62, 0.65, 0.71), vec3(1.0), vShade);
  outColor = vec4(c, a * 0.95);
}`;

export default function MetalConfetti() {
  const canvasRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (REDUCED_MOTION) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = () => canvas.width;
    const H = () => canvas.height;
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // Partikel: x, y, vx, vy, size, phase (Flackern), shade
    const P = new Float32Array(COUNT * 7);
    const spawn = (i, initial) => {
      const o = i * 7;
      P[o] = Math.random() * W();
      P[o + 1] = initial ? Math.random() * -H() : -20 * dpr;
      P[o + 2] = (Math.random() - 0.5) * 40 * dpr;
      P[o + 3] = (60 + Math.random() * 90) * dpr;
      P[o + 4] = (5 + Math.random() * 9) * dpr;
      P[o + 5] = Math.random() * Math.PI * 2;
      P[o + 6] = Math.random();
    };
    for (let i = 0; i < COUNT; i++) spawn(i, true);

    // Interleaved Buffer: aPos(2) + aSize(1) + aShade(1)
    const draw = new Float32Array(COUNT * 4);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, draw.byteLength, gl.DYNAMIC_DRAW);
    const stride = 16;
    const locPos = gl.getAttribLocation(prog, "aPos");
    const locSize = gl.getAttribLocation(prog, "aSize");
    const locShade = gl.getAttribLocation(prog, "aShade");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(locSize);
    gl.vertexAttribPointer(locSize, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(locShade);
    gl.vertexAttribPointer(locShade, 1, gl.FLOAT, false, stride, 12);
    const uR = gl.getUniformLocation(prog, "uR");

    let raf = 0;
    let running = true;
    let last = performance.now();
    const tick = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let i = 0; i < COUNT; i++) {
        const o = i * 7;
        P[o] += P[o + 2] * dt;
        P[o + 1] += P[o + 3] * dt;
        P[o + 5] += dt * (3 + P[o + 6] * 4);
        if (P[o + 1] > H() + 20 * dpr) spawn(i, false);
        const d = i * 4;
        draw[d] = P[o];
        draw[d + 1] = P[o + 1];
        // Flackern: Plättchen kippt im Licht → Größe pulsiert leicht
        draw[d + 2] = P[o + 4] * (0.6 + 0.4 * Math.abs(Math.sin(P[o + 5])));
        draw[d + 3] = 0.25 + 0.75 * Math.abs(Math.sin(P[o + 5] * 0.7 + i));
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uR, W(), H());
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, draw);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      // KEIN loseContext(): StrictMode remountet — derselbe Canvas gäbe dann
      // nur noch den verlorenen Context zurück. GC räumt beim DOM-Entfernen.
    };
  }, []);

  if (REDUCED_MOTION) return null;
  if (fallback) return <Confetti />;
  return <canvas ref={canvasRef} className="ig-confetti ig-gl-confetti" aria-hidden="true" />;
}
