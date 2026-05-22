/**
 * Space background v2 — tiled star textures (GPU compositor) + one WebGL pass for twinkling stars.
 * Avoids huge CSS gradient strings and multiple Canvas2D animation loops.
 */
(function spaceBackground(global) {
  const STRIDE = 12;
  const TILE = 512;

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
    attribute float a_spikes;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_dpr;

    varying float v_alpha;
    varying float v_radius;
    varying vec3 v_rgb;
    varying float v_spikes;

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
      v_spikes = a_spikes;

      if (a_tint < 0.84) v_rgb = vec3(1.0);
      else if (a_tint < 0.95) v_rgb = vec3(1.0, 0.925, 0.824);
      else v_rgb = vec3(0.863, 0.855, 0.922);

      float pointSize = (a_radius * (a_spikes > 0.5 ? 11.0 : 6.5) + alpha * 2.5) * u_dpr;
      gl_PointSize = max(1.5, pointSize);

      gl_Position = vec4(
        (a_xy.x / u_resolution.x) * 2.0 - 1.0,
        1.0 - (a_xy.y / u_resolution.y) * 2.0,
        0.0,
        1.0
      );
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;
    varying float v_alpha;
    varying float v_radius;
    varying vec3 v_rgb;
    varying float v_spikes;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float dist = length(uv);
      float glow = exp(-dist * dist * (7.5 / max(0.25, v_radius))) * v_alpha;
      vec3 color = v_rgb * glow;

      if (v_spikes > 0.5 && v_alpha > 0.35) {
        float angle = atan(uv.y, uv.x);
        float spike = pow(abs(sin(angle * 2.0)), 14.0) + pow(abs(cos(angle * 2.0)), 14.0);
        color += v_rgb * spike * v_alpha * 0.22;
      }

      if (glow < 0.004) discard;
      gl_FragColor = vec4(color, glow);
    }
  `;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Space background shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createGlProgram(gl) {
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
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function pickStarColor(ctx, tintRoll, opacity) {
    if (tintRoll < 0.82) {
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      return;
    }
    if (tintRoll < 0.94) {
      ctx.fillStyle = `rgba(255,236,210,${opacity})`;
      return;
    }
    ctx.fillStyle = `rgba(230,228,245,${opacity * 0.9})`;
  }

  function bakeStarTile(count, seed) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE;
    canvas.height = TILE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 0; i < count; i += 1) {
      const x = rand() * TILE;
      const y = rand() * TILE;
      const size = 0.6 + rand() * 1.4;
      const opacity = 0.45 + rand() * 0.55;
      pickStarColor(ctx, rand(), opacity);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL("image/png");
  }

  function createAnimatedStars(viewWidth, viewHeight) {
    const area = viewWidth * viewHeight;
    const dustCount = Math.min(5000, Math.max(1800, Math.floor(area / 260)));
    const mainCount = Math.min(2000, Math.max(650, Math.floor(area / 950)));
    const stars = [];

    for (let i = 0; i < dustCount; i += 1) {
      stars.push({
        x: Math.random() * viewWidth,
        y: Math.random() * viewHeight,
        radius: 0.35 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.65 + Math.random() * 1.1,
        sharpness: 0.85 + Math.random() * 0.35,
        minAlpha: 0.42,
        maxAlpha: 0.82,
        brightness: 0.9 + Math.random() * 0.25,
        tint: Math.random(),
        dust: true,
        spikes: false,
      });
    }

    for (let i = 0; i < mainCount; i += 1) {
      const tierRoll = Math.random();
      const tier = tierRoll < 0.62 ? "dim" : tierRoll < 0.9 ? "mid" : "bright";
      const radius =
        tier === "dim"
          ? 0.55 + Math.random() * 0.5
          : tier === "mid"
            ? 0.95 + Math.random() * 0.55
            : 1.35 + Math.random() * 0.9;
      stars.push({
        x: Math.random() * viewWidth,
        y: Math.random() * viewHeight,
        radius,
        phase: Math.random() * Math.PI * 2,
        speed: tier === "dim" ? 0.55 + Math.random() * 0.9 : 0.85 + Math.random() * 1.4,
        sharpness: tier === "bright" ? 0.9 + Math.random() * 0.3 : 1 + Math.random() * 0.4,
        minAlpha: tier === "dim" ? 0.48 : tier === "mid" ? 0.58 : 0.68,
        maxAlpha: tier === "dim" ? 0.88 : tier === "mid" ? 0.96 : 1,
        brightness: 1,
        tint: Math.random(),
        dust: false,
        spikes: tier === "bright",
      });
    }

    return stars;
  }

  function packAnimatedStars(stars) {
    const animated = stars.filter((star) => !star.dust);
    const data = new Float32Array(animated.length * STRIDE);
    let offset = 0;

    animated.forEach((star) => {
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
      data[offset++] = star.spikes ? 1 : 0;
      data[offset++] = 0;
    });

    return { data, count: animated.length };
  }

  class WebGLStarLayer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl =
        canvas.getContext("webgl", {
          alpha: true,
          antialias: false,
          depth: false,
          premultipliedAlpha: false,
          desynchronized: true,
          powerPreference: "high-performance",
        }) || null;

      if (!this.gl) {
        this.ready = false;
        return;
      }

      const gl = this.gl;
      this.program = createGlProgram(gl);
      if (!this.program) {
        this.ready = false;
        return;
      }

      this.ready = true;
      this.count = 0;
      this.dpr = 1;
      gl.useProgram(this.program);
      this.buffer = gl.createBuffer();
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
        spikes: gl.getAttribLocation(this.program, "a_spikes"),
      };
      this.uniforms = {
        resolution: gl.getUniformLocation(this.program, "u_resolution"),
        time: gl.getUniformLocation(this.program, "u_time"),
        dpr: gl.getUniformLocation(this.program, "u_dpr"),
      };
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    setStars(stars) {
      if (!this.ready) return;
      const { data, count } = packAnimatedStars(stars);
      this.count = count;
      const gl = this.gl;
      const strideBytes = STRIDE * 4;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const pointer = (location, size, offset) => {
        if (location < 0) return;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, strideBytes, offset);
      };

      pointer(this.attribs.xy, 2, 0);
      pointer(this.attribs.radius, 1, 8);
      pointer(this.attribs.phase, 1, 12);
      pointer(this.attribs.speed, 1, 16);
      pointer(this.attribs.sharpness, 1, 20);
      pointer(this.attribs.minA, 1, 24);
      pointer(this.attribs.maxA, 1, 28);
      pointer(this.attribs.brightness, 1, 32);
      pointer(this.attribs.tint, 1, 36);
      pointer(this.attribs.spikes, 1, 40);
    }

    resize(width, height, dpr) {
      if (!this.ready) return;
      this.dpr = dpr;
      const pixelW = Math.floor(width * dpr);
      const pixelH = Math.floor(height * dpr);
      this.canvas.width = pixelW;
      this.canvas.height = pixelH;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.gl.viewport(0, 0, pixelW, pixelH);
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
  }

  function getDpr() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const cap = isMobile ? 1.25 : 1.75;
    return Math.min(cap, window.devicePixelRatio || 1);
  }

  function appendMeteors(bg, count) {
    for (let i = 0; i < count; i += 1) {
      const meteor = document.createElement("span");
      meteor.className = "bg-meteor";
      meteor.style.top = `${2 + ((i * 17) % 86)}%`;
      meteor.style.left = `${3 + ((i * 23) % 88)}%`;
      meteor.style.animationDelay = `${((i * 0.41) % 7) + (i % 3) * 0.2}s`;
      meteor.style.animationDuration = `${5.2 + (i % 6) * 0.75}s`;
      meteor.style.setProperty("--meteor-angle", `${-44 + ((i * 5) % 20)}deg`);
      bg.append(meteor);
    }
  }

  function mountSpaceBackground(bg) {
    bg.innerHTML = "";

    const tileFar = bakeStarTile(1400, 101);
    const tileMid = bakeStarTile(1600, 202);
    const tileNear = bakeStarTile(1200, 303);

    [
      { className: "bg-stars far bg-stars-tile", tile: tileFar },
      { className: "bg-stars bg-stars-tile", tile: tileMid },
      { className: "bg-stars near bg-stars-tile", tile: tileNear },
    ].forEach((layer) => {
      const el = document.createElement("div");
      el.className = layer.className;
      el.style.backgroundImage = `url("${layer.tile}")`;
      bg.append(el);
    });

    const grid = document.createElement("div");
    grid.className = "bg-grid-css";
    grid.setAttribute("aria-hidden", "true");
    bg.append(grid);

    appendMeteors(bg, 28);

    const starCanvas = document.createElement("canvas");
    starCanvas.className = "bg-layer bg-star-canvas";
    bg.append(starCanvas);

    const glLayer = new WebGLStarLayer(starCanvas);
    if (!glLayer.ready) {
      console.warn("WebGL unavailable — space background uses tiled stars only.");
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let stars = createAnimatedStars(width, height);
    let time = 0;
    let animId = 0;
    let running = true;
    let lastFrame = performance.now();
    const dpr = getDpr();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      stars = createAnimatedStars(width, height);
      if (glLayer.ready) {
        glLayer.resize(width, height, dpr);
        glLayer.setStars(stars);
      }
    }

    function onMouseMove(event) {
      const ox = ((event.clientX / width) - 0.5) * 14;
      const oy = ((event.clientY / height) - 0.5) * 14;
      grid.style.setProperty("--grid-pan-x", `${ox}px`);
      grid.style.setProperty("--grid-pan-y", `${oy}px`);
    }

    function frame(now) {
      if (!running) return;
      animId = requestAnimationFrame(frame);

      const delta = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      if (reducedMotion) return;

      time += delta;
      if (glLayer.ready) glLayer.draw(time);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) {
        lastFrame = performance.now();
        cancelAnimationFrame(animId);
        requestAnimationFrame(frame);
      }
    });

    if (!reducedMotion) requestAnimationFrame(frame);
    else if (glLayer.ready) glLayer.draw(0);
  }

  global.getBackgroundDpr = getDpr;
  global.mountSpaceBackground = mountSpaceBackground;
})(window);
