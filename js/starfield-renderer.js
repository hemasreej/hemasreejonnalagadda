/**
 * Original Hemasree space background — full features, WebGL replaces only canvas star drawing.
 */
(function spaceBackground(global) {
  const STRIDE = 12;
  const TILE_SIZE = 512;
  const CSS_TILE_LAYERS = [
    { key: "far", count: 140, opacity: 0.9, seed: 101 },
    { key: "mid", count: 180, opacity: 1, seed: 202 },
    { key: "near", count: 140, opacity: 1, seed: 303 },
  ];

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
    varying float v_dust;
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
      v_dust = a_dust;
      v_spikes = a_spikes;
      if (a_tint < 0.84) v_rgb = vec3(1.0);
      else if (a_tint < 0.95) v_rgb = vec3(1.0, 0.925, 0.824);
      else v_rgb = vec3(0.863, 0.855, 0.922);
      float pointSize = a_dust > 0.5
        ? 2.0 * u_dpr
        : (a_radius * (a_spikes > 0.5 ? 11.0 : 6.5) + alpha * 2.5) * u_dpr;
      gl_PointSize = max(1.0, pointSize);
      gl_Position = vec4(
        (a_xy.x / u_resolution.x) * 2.0 - 1.0,
        1.0 - (a_xy.y / u_resolution.y) * 2.0,
        0.0, 1.0
      );
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;
    varying float v_alpha;
    varying float v_radius;
    varying vec3 v_rgb;
    varying float v_dust;
    varying float v_spikes;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float dist = length(uv);
      float falloff = v_dust > 0.5 ? 40.0 : 7.5 / max(0.25, v_radius);
      float glow = exp(-dist * dist * falloff) * v_alpha;
      vec3 color = v_rgb * glow;
      if (v_spikes > 0.5 && v_alpha > 0.35 && v_dust < 0.5) {
        float angle = atan(uv.y, uv.x);
        float spike = pow(abs(sin(angle * 2.0)), 14.0) + pow(abs(cos(angle * 2.0)), 14.0);
        color += v_rgb * spike * v_alpha * 0.22;
      }
      if (glow < 0.004) discard;
      gl_FragColor = vec4(color, glow);
    }
  `;

  function yieldFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
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

  function scheduleIdle(task, timeoutMs) {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => task(), { timeout: timeoutMs });
      return;
    }
    window.setTimeout(task, timeoutMs);
  }

  function bakeStarTile(count, maxOpacity, seed) {
    let s = seed;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    for (let i = 0; i < count; i += 1) {
      const x = rnd() * TILE_SIZE;
      const y = rnd() * TILE_SIZE;
      const radius = 0.45 + rnd() * 1.1;
      const opacity = (0.55 + rnd() * 0.4) * maxOpacity;
      const tint = rnd();
      if (tint < 0.82) ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      else if (tint < 0.94) ctx.fillStyle = `rgba(255,236,210,${opacity})`;
      else ctx.fillStyle = `rgba(230,228,245,${opacity * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL("image/png");
  }

  async function applyTiledCssStars(cssLayers) {
    const drift = [
      [48 + Math.random() * 40, 2.4 + Math.random() * 3.2],
      [55 + Math.random() * 35, 3.1 + Math.random() * 2.8],
      [38 + Math.random() * 28, 2.8 + Math.random() * 2.4],
    ];

    for (let index = 0; index < CSS_TILE_LAYERS.length; index += 1) {
      const spec = CSS_TILE_LAYERS[index];
      const layer = cssLayers[spec.key];
      const url = bakeStarTile(spec.count, spec.opacity, spec.seed);
      if (!url) continue;
      layer.style.backgroundImage = `url("${url}")`;
      layer.style.backgroundRepeat = "repeat";
      layer.style.backgroundSize = `${TILE_SIZE}px ${TILE_SIZE}px`;
      layer.style.animationDuration = `${drift[index][0]}s, ${drift[index][1]}s`;
      await yieldFrame();
    }
  }

  function loadGpuStarsFromWorker(viewWidth, viewHeight) {
    return new Promise((resolve) => {
      if (!global.Worker) {
        resolve(null);
        return;
      }

      let worker;
      try {
        worker = new Worker("js/starfield-population-worker.js?v=16");
      } catch (error) {
        console.warn("Star worker unavailable:", error);
        resolve(null);
        return;
      }

      const finish = (payload) => {
        worker.terminate();
        resolve(payload);
      };

      worker.onmessage = (event) => finish(event.data);
      worker.onerror = () => finish(null);
      worker.postMessage({ width: viewWidth, height: viewHeight });
    });
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
    return { data, count: stars.length };
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
        dust: gl.getAttribLocation(this.program, "a_dust"),
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

    setStarBuffer(data, count) {
      if (!this.ready || !data || !count) return;
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
      pointer(this.attribs.dust, 1, 40);
      pointer(this.attribs.spikes, 1, 44);
    }

    setStars(stars) {
      if (!this.ready) return;
      const { data, count } = packStars(stars);
      this.setStarBuffer(data, count);
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
    return Math.min(1.75, window.devicePixelRatio || 1);
  }

  function sizeCanvas2d(canvas, width, height, dpr) {
    const pixelW = Math.floor(width * dpr);
    const pixelH = Math.floor(height * dpr);
    canvas.width = pixelW;
    canvas.height = pixelH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function mountSpaceBackground(bg) {
    bg.innerHTML = "";

    const starsLayerFar = document.createElement("div");
    starsLayerFar.className = "bg-stars far";
    const starsLayer = document.createElement("div");
    starsLayer.className = "bg-stars";
    const starsLayerNear = document.createElement("div");
    starsLayerNear.className = "bg-stars near";
    bg.append(starsLayerFar, starsLayer, starsLayerNear);

    for (let i = 0; i < 28; i += 1) {
      const meteor = document.createElement("span");
      meteor.className = "bg-meteor";
      meteor.style.top = `${2 + ((i * 17) % 86)}%`;
      meteor.style.left = `${3 + ((i * 23) % 88)}%`;
      meteor.style.animationDelay = `${((i * 0.41) % 7) + (i % 3) * 0.2}s`;
      meteor.style.animationDuration = `${5.2 + (i % 6) * 0.75}s`;
      meteor.style.setProperty("--meteor-angle", `${-44 + ((i * 5) % 20)}deg`);
      bg.append(meteor);
    }

    const gridCanvas = document.createElement("canvas");
    gridCanvas.className = "bg-layer bg-grid";
    const starCanvas = document.createElement("canvas");
    starCanvas.className = "bg-layer bg-star-canvas";
    const circuitCanvas = document.createElement("canvas");
    circuitCanvas.className = "bg-layer bg-circuit";
    const trailsCanvas = document.createElement("canvas");
    trailsCanvas.className = "bg-layer bg-trails";
    bg.append(gridCanvas, circuitCanvas, trailsCanvas, starCanvas);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let time = 0;
    let mouseX = width / 2;
    let mouseY = height / 2;
    const dpr = getDpr();

    const layers = {
      grid: sizeCanvas2d(gridCanvas, width, height, dpr),
      circuit: sizeCanvas2d(circuitCanvas, width, height, dpr),
      trails: sizeCanvas2d(trailsCanvas, width, height, dpr),
    };

    const glLayer = new WebGLStarLayer(starCanvas);
    let stars = [];
    let starsReady = false;

    const cssLayers = { far: starsLayerFar, mid: starsLayer, near: starsLayerNear };
    let heavyStarted = false;

    function startHeavyLayers() {
      if (heavyStarted) return;
      heavyStarted = true;
      scheduleIdle(async () => {
        await applyTiledCssStars(cssLayers);
        const packed = await loadGpuStarsFromWorker(width, height);
        if (packed && glLayer.ready) {
          glLayer.resize(width, height, dpr);
          glLayer.setStarBuffer(packed.data, packed.count);
          starsReady = true;
        }
      }, 800);
    }

    const nodes = Array.from({ length: 36 }, () => ({
      pulse: Math.random() * Math.PI * 2,
    }));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let running = true;
    let animId = 0;

    function drawGrid() {
      const ctx = layers.grid;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(148, 152, 168, 0.09)";
      ctx.lineWidth = 1;
      const baseSpacing = 52;
      const offsetX = ((mouseX / width) - 0.5) * 12;
      const offsetY = ((mouseY / height) - 0.5) * 12;
      for (let x = -baseSpacing; x < width + baseSpacing; x += baseSpacing) {
        ctx.beginPath();
        for (let y = -baseSpacing; y < height + baseSpacing; y += 10) {
          const warp = Math.sin((y + time * 45 + x) * 0.01) * 6;
          const px = x + warp + offsetX;
          const py = y + Math.sin((x + time * 30) * 0.01) * 4 + offsetY;
          if (y === -baseSpacing) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    function drawCircuit() {
      const ctx = layers.circuit;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.1;
      nodes.forEach((node, index) => {
        const n = {
          x: (index % 6) * (width / 5.5) + 60,
          y: Math.floor(index / 6) * (height / 6.5) + 80,
        };
        const heat = (Math.sin(time * 1.2 + node.pulse) + 1) / 2;
        ctx.fillStyle = `rgba(210, ${180 + Math.floor(heat * 40)}, ${220 + Math.floor(heat * 20)}, ${0.12 + heat * 0.18})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8 + heat * 2.8, 0, Math.PI * 2);
        ctx.fill();
        if (index % 2 === 0 && nodes[index + 1]) {
          const next = {
            x: ((index + 1) % 6) * (width / 5.5) + 60,
            y: Math.floor((index + 1) / 6) * (height / 6.5) + 80,
          };
          const pulse = (Math.sin(time * 2 + node.pulse) + 1) / 2;
          ctx.strokeStyle = `rgba(170, 165, 190, ${0.04 + pulse * 0.12})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      });
    }

    function drawTrails() {
      const ctx = layers.trails;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const scrollFactor = window.scrollY * 0.0003;
      for (let i = 0; i < 9; i += 1) {
        const baseY = (height / 10) * (i + 1);
        const speed = 0.4 + i * 0.08;
        const x = ((time * 80 * speed + i * 140) % (width + 240)) - 120;
        const alpha = 0.08 + i * 0.008;
        ctx.beginPath();
        ctx.moveTo(x, baseY + Math.sin(time + i) * 20);
        ctx.lineTo(x + 120, baseY + Math.cos(time + i + scrollFactor) * 24);
        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 120, baseY + Math.cos(time + i + scrollFactor) * 24, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
        ctx.fill();
      }
    }

    function animate() {
      if (!running) return;
      animId = requestAnimationFrame(animate);
      if (!reducedMotion) time += 0.016;
      drawGrid();
      drawCircuit();
      drawTrails();
      if (glLayer.ready && starsReady) glLayer.draw(time);
    }

    let resizeTimer = 0;
    function resize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        width = window.innerWidth;
        height = window.innerHeight;
        layers.grid = sizeCanvas2d(gridCanvas, width, height, dpr);
        layers.circuit = sizeCanvas2d(circuitCanvas, width, height, dpr);
        layers.trails = sizeCanvas2d(trailsCanvas, width, height, dpr);
        if (starsReady && glLayer.ready) {
          void loadGpuStarsFromWorker(width, height).then((packed) => {
            if (packed) glLayer.setStarBuffer(packed.data, packed.count);
          });
        }
      }, 280);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) {
        cancelAnimationFrame(animId);
        animate();
      }
    });

    animate();
    startHeavyLayers();
    global.schedulePortfolioHeavyBg = startHeavyLayers;
  }

  global.mountSpaceBackground = mountSpaceBackground;
  global.schedulePortfolioHeavyBg = null;
  global.getBackgroundDpr = getDpr;
})(window);
