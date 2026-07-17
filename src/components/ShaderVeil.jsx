/* ShaderVeil — GPU-Hintergrund-Aura in Markenfarben (Graphit → Silber).
   WebGL2-Fragment-Shader mit fbm-Noise, langsam fließend wie flüssiges
   Metall. Bewusst monochrom (design.md: mono premium, keine Aurora-Blobs
   in Buntfarben). Verhalten:
   - prefers-reduced-motion / data-motion=reduced → ein statisches Frame
   - Tab im Hintergrund → Loop pausiert (kein Akku-Verbrauch)
   - kein WebGL / Context-Lost → rendert nichts (Seite bleibt intakt)
   - mix-blend-mode: screen → auf hellem Grund automatisch dezent */

import React, { useEffect, useRef } from "react";
import { REDUCED_MOTION } from "../lib/utils.js";

const FRAG = `#version 300 es
precision highp float;
uniform float uT;
uniform vec2 uR;
out vec4 outColor;

float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x),
             mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uR;
  vec2 p = uv * vec2(uR.x / uR.y, 1.0) * 1.6;
  float t = uT * 0.05;
  float f = fbm(p + vec2(t, -t * 0.7) + fbm(p * 1.7 - t) * 0.8);
  float sheen = smoothstep(0.35, 0.85, f);
  vec3 base = mix(vec3(0.05, 0.055, 0.07), vec3(0.85, 0.87, 0.91),
                  sheen * 0.22 + f * 0.08);
  float vig = smoothstep(1.1, 0.35, distance(uv, vec2(0.5)));
  outColor = vec4(base * vig, 0.9);
}`;

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

export default function ShaderVeil({ className = "", opacity = 0.55 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "uT");
    const uR = gl.getUniformLocation(prog, "uR");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let running = true;
    const t0 = performance.now();

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const hpx = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== hpx) {
        canvas.width = w;
        canvas.height = hpx;
        gl.viewport(0, 0, w, hpx);
      }
    };
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    resize();

    const frame = () => {
      resize();
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const reduced =
      REDUCED_MOTION ||
      !!canvas.closest('[data-motion="reduced"]');

    const loop = () => {
      if (!running) return;
      frame();
      raf = requestAnimationFrame(loop);
    };
    if (reduced) {
      frame(); // ein statisches, schönes Frame — keine Bewegung
    } else {
      loop();
    }

    const onVis = () => {
      running = !document.hidden && !reduced;
      cancelAnimationFrame(raf);
      if (running) loop();
    };
    document.addEventListener("visibilitychange", onVis);
    const onLost = (e) => {
      e.preventDefault();
      running = false;
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      ro?.disconnect();
      // KEIN loseContext(): StrictMode remountet — derselbe Canvas gäbe dann
      // nur noch den verlorenen Context zurück. GC räumt beim DOM-Entfernen.
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={"ig-shader-veil" + (className ? ` ${className}` : "")}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
