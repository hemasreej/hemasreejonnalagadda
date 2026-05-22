/**
 * GPU starfield — one WebGL draw call for thousands of stars (same look, no per-star Canvas2D cost).
 */
(function initStarfieldRenderer(global) {
  const VERTEX_SHADER = `
    attribute vec2 a_xy;
    attribute float a_radius;
    attribute float a_phase;
    attribute float a_speed;
    attribute float a_sharpness;
    attribute float a_minA;
    attribute float a_maxA;
    attribute float a_brightness;
    attribute float a_tint;
    attribute float a_dust;
    attribute float a_spikes;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_dpr;

    varying float v_alpha;
    varying float v_radius;
    varying vec3 v_rgb;
    varying float v_spikes;
    varying float v_dust;

    void main() {
      float slow = sin(u_time * a_speed + a_phase);
      float mid = sin(u_time * a_speed * 1.91 + a_phase * 0.63) * 0.42;
      float fast = sin(u_time * a_speed * 4.6 + a_phase * 1.7) * 0.18;
      float shimmer = sin(u_time * a_speed * 9.3 + a_phase * 2.4) * 0.08;
      float mixv = slow * 0.52 + mid + fast + shimmer;
      float normalized = (mixv + 1.0) * 0.5;
      float shaped = pow(normalized, a_sharpness);
      float alpha = min(1.0, (a_minA + shaped * (a_maxA - a_minA)) * a_brightness);

      v_alpha = alpha;
      v_radius = a_radius;
      v_dust = a_dust;
      v_spikes = a_spikes;

      if (a_tint < 0.84) v_rgb = vec3(1.0, 1.0, 1.0);
      else if (a_tint < 0.95) v_rgb = vec3(1.0, 0.925, 0.824);
      else v_rgb = vec3(0.863, 0.855, 0.922);

      float pointSize = a_dust > 0.5
        ? 2.2 * u_dpr
        : (a_radius * (a_spikes > 0.5 ? 11.0 : 6.5) + alpha * 2.5) * u_dpr;
      gl_PointSize = max(1.0, pointSize);

      vec2 clip = vec2(
        (a_xy.x / u_resolution.x) * 2.0 - 1.0,
        1.0 - (a_xy.y / u_resolution.y) * 2.0
      );
      gl_Position = vec4(clip, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;

    varying float v_alpha;
    varying float v_radius;
    varying vec3 v_rgb;
    varying float v_spikes;
    varying float v_dust;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float dist = length(uv);

      float falloff = v_dust > 0.5 ? 36.0 : 7.5 / max(0.25, v_radius);
      float glow = exp(-dist * dist * falloff) * v_alpha;

      vec3 color = v_rgb * glow;

      if (v_spikes > 0.5 && v_alpha > 0.35 && v_dust < 0.5) {
        float angle = atan(uv.y, uv.x);
        float spike = pow(abs(sin(angle * 2.0)), 14.0);
        spike += pow(abs(cos(angle * 2.0)), 14.0);
        color += v_rgb * spike * v_alpha * 0.22;
      }

      if (glow < 0.004) discard;
      gl_FragColor = vec4(color, glow);
    }
  `;

  const STRIDE = 11;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Starfield shader compile failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Starfield program link failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function packStars(stars) {
    const data = new Float32Array(stars.length * STRIDE);
    let offset = 0;

    stars.forEach((star) => {
      data[offset++] = star.x;
      data[offset++] = star.y;
      data[offset++] = star.radius;
      data[offset++] = star.phase;
      data[offset++] = star.speed;
      data[offset++] = star.sharpness;
      data[offset++] = star.minAlpha;
      data[offset++] = star.maxAlpha;
      data[offset++] = star.brightness;
      data[offset++] = star.tint;
      data[offset++] = star.dust ? 1 : 0;
      data[offset++] = star.spikes ? 1 : 0;
    });

    return data;
  }

  class WebGLStarfieldRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl =
        canvas.getContext("webgl", {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          desynchronized: true,
          powerPreference: "high-performance",
        }) ||
        canvas.getContext("experimental-webgl", {
          alpha: true,
          antialias: false,
          depth: false,
        });

      if (!this.gl) {
        this.ready = false;
        return;
      }

      const gl = this.gl;
      this.program = createProgram(gl);
      if (!this.program) {
        this.ready = false;
        return;
      }

      this.ready = true;
      this.count = 0;
      this.dpr = 1;

      gl.useProgram(this.program);
      this.attribs = {
        xy: gl.getAttribLocation(this.program, "a_xy"),
        radius: gl.getAttribLocation(this.program, "a_radius"),
        phase: gl.getAttribLocation(this.program, "a_phase"),
        speed: gl.getAttribLocation(this.program, "a_speed"),
        sharpness: gl.getAttribLocation(this.program, "a_sharpness"),
        minA: gl.getAttribLocation(this.program, "a_minA"),
        maxA: gl.getAttribLocation(this.program, "a_maxA"),
        brightness: gl.getAttribLocation(this.program, "a_brightness"),
        tint: gl.getAttribLocation(this.program, "a_tint"),
        dust: gl.getAttribLocation(this.program, "a_dust"),
        spikes: gl.getAttribLocation(this.program, "a_spikes"),
      };
      this.uniforms = {
        resolution: gl.getUniformLocation(this.program, "u_resolution"),
        time: gl.getUniformLocation(this.program, "u_time"),
        dpr: gl.getUniformLocation(this.program, "u_dpr"),
      };

      this.buffer = gl.createBuffer();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    setStars(stars) {
      if (!this.ready) return;
      const gl = this.gl;
      const packed = packStars(stars);
      this.count = stars.length;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);

      const strideBytes = STRIDE * 4;
      const setAttrib = (location, offsetFloats) => {
        if (location < 0) return;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 1, gl.FLOAT, false, strideBytes, offsetFloats * 4);
      };

      gl.vertexAttribPointer(this.attribs.xy, 2, gl.FLOAT, false, strideBytes, 0);
      gl.enableVertexAttribArray(this.attribs.xy);
      setAttrib(this.attribs.radius, 2);
      setAttrib(this.attribs.phase, 3);
      setAttrib(this.attribs.speed, 4);
      setAttrib(this.attribs.sharpness, 5);
      setAttrib(this.attribs.minA, 6);
      setAttrib(this.attribs.maxA, 7);
      setAttrib(this.attribs.brightness, 8);
      setAttrib(this.attribs.tint, 9);
      setAttrib(this.attribs.dust, 10);
      setAttrib(this.attribs.spikes, 11);
    }

    resize(width, height, dpr) {
      if (!this.ready) return;
      this.dpr = dpr;
      const gl = this.gl;
      const pixelW = Math.floor(width * dpr);
      const pixelH = Math.floor(height * dpr);
      this.canvas.width = pixelW;
      this.canvas.height = pixelH;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      gl.viewport(0, 0, pixelW, pixelH);
    }

    draw(time) {
      if (!this.ready || !this.count) return;
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.time, time);
      gl.uniform1f(this.uniforms.dpr, this.dpr);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }

    destroy() {
      if (!this.gl) return;
      const gl = this.gl;
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.program) gl.deleteProgram(this.program);
      this.ready = false;
    }
  }

  global.getBackgroundDpr = function getBackgroundDpr() {
    return Math.min(2, window.devicePixelRatio || 1);
  };

  global.applyCanvas2dSize = function applyCanvas2dSize(canvas, width, height, dpr) {
    const pixelW = Math.floor(width * dpr);
    const pixelH = Math.floor(height * dpr);
    canvas.width = pixelW;
    canvas.height = pixelH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  global.createWebGLStarfieldRenderer = function createWebGLStarfieldRenderer(canvas) {
    const renderer = new WebGLStarfieldRenderer(canvas);
    return renderer.ready ? renderer : null;
  };
})(window);
