const defaultSectionFiles = [
  "sections/hero.html",
  "sections/about.html",
  "sections/footer.html",
];

async function loadSections() {
  const container = document.getElementById("page-sections");
  if (!container) return;
  container.innerHTML = "";

  const sectionsAttr = container.getAttribute("data-sections");
  const sectionFiles = sectionsAttr
    ? sectionsAttr.split(",").map((section) => section.trim()).filter(Boolean)
    : defaultSectionFiles;

  for (const file of sectionFiles) {
    try {
      const response = await fetch(file);
      if (!response.ok) {
        console.error(`Failed to load ${file}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      Array.from(wrapper.children).forEach((child) => container.appendChild(child));
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  initInteractiveBackground();
  initNavState();
  initScrollSpy();
  initScrollReveal();
  initTiltCards();
  initTelemetryValues();
  initSignalChainCard();
  initSubmitTracking();
  initSubmissionNotice();
}

function initNavState() {
  const navLinks = document.querySelectorAll(".site-nav a");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const linkPath = href.split("/").pop();
    link.classList.toggle("active", linkPath === currentPath);
  });
}

function initScrollSpy() {
  const navLinks = document.querySelectorAll(".site-nav a");
  const sections = document.querySelectorAll("section[id]");
  const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
  const anchorLinks = Array.from(navLinks).filter((link) => (link.getAttribute("href") || "").startsWith("#"));

  if (!sections.length || !anchorLinks.length) return;

  function updateActiveLink() {
    const scrollPosition = window.scrollY + headerHeight + 40;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const isActive = scrollPosition >= sectionTop && scrollPosition < sectionBottom;

      anchorLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${section.id}` && isActive);
      });
    });
  }

  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();
}

function starRgb(tint) {
  if (tint < 0.84) return "255,255,255";
  if (tint < 0.95) return "255,236,210";
  return "220,218,235";
}

function buildCssStarfield(layer, count, maxOpacity) {
  const gradients = [];
  const twinkleDuration = 2.4 + Math.random() * 3.2;

  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = 0.8 + Math.random() * 1.6;
    const opacity = (0.65 + Math.random() * 0.35) * maxOpacity;
    const tintRoll = Math.random();
    const color =
      tintRoll < 0.82
        ? `rgba(255,255,255,${opacity})`
        : tintRoll < 0.94
          ? `rgba(255, 236, 210, ${opacity})`
          : `rgba(230, 228, 245, ${opacity * 0.9})`;
    gradients.push(`radial-gradient(${size}px ${size}px at ${x}% ${y}%, ${color}, transparent 68%)`);
  }

  layer.style.backgroundImage = gradients.join(",");
  layer.style.animationDuration = `${48 + Math.random() * 40}s, ${twinkleDuration}s`;
}

function createStarPopulation(viewWidth, viewHeight) {
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

function starScintillation(star, t) {
  const slow = Math.sin(t * star.speed + star.phase);
  const mid = Math.sin(t * star.speed * 1.91 + star.phase * 0.63) * 0.42;
  const fast = Math.sin(t * star.speed * 4.6 + star.phase * 1.7) * 0.18;
  const shimmer = Math.sin(t * star.speed * 9.3 + star.phase * 2.4) * 0.08;
  const mix = slow * 0.52 + mid + fast + shimmer;
  const normalized = (mix + 1) / 2;
  const shaped = Math.pow(normalized, star.sharpness);
  const alpha = star.minAlpha + shaped * (star.maxAlpha - star.minAlpha);
  return Math.min(1, alpha * star.brightness);
}

function starSpikeAngle(x, y) {
  return ((x * 12.9898 + y * 78.233) % 628) / 100;
}

function drawStarCore(ctx, x, y, radius, rgb, alpha, spikes) {
  const glowRadius = radius * (spikes ? 4.8 : 2.8);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  gradient.addColorStop(0, `rgba(${rgb}, ${Math.min(1, alpha * 1.05)})`);
  gradient.addColorStop(0.08, `rgba(${rgb}, ${alpha * 0.85})`);
  gradient.addColorStop(0.22, `rgba(${rgb}, ${alpha * 0.35})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const coreRadius = Math.max(0.55, radius * 0.42);
  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, alpha * 0.95)})`;
  ctx.fill();

  if (!spikes || radius < 1 || alpha < 0.35) return;

  const spikeLength = radius * 5.5 + alpha * 2.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(starSpikeAngle(x, y));
  ctx.globalAlpha = alpha * 0.32;
  ctx.lineCap = "round";

  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI / 2) * i;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const spikeGradient = ctx.createLinearGradient(
      -spikeLength * cos,
      -spikeLength * sin,
      spikeLength * cos,
      spikeLength * sin,
    );
    spikeGradient.addColorStop(0, `rgba(${rgb}, 0)`);
    spikeGradient.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.55})`);
    spikeGradient.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.75})`);
    spikeGradient.addColorStop(0.55, `rgba(${rgb}, ${alpha * 0.55})`);
    spikeGradient.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.strokeStyle = spikeGradient;
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-spikeLength * cos, -spikeLength * sin);
    ctx.lineTo(spikeLength * cos, spikeLength * sin);
    ctx.stroke();
  }

  ctx.restore();
}

function initInteractiveBackground() {
  const bg = document.getElementById("interactive-bg");
  if (!bg) return;
  bg.innerHTML = "";

  const starsLayerNear = document.createElement("div");
  starsLayerNear.className = "bg-stars near";
  const starsLayer = document.createElement("div");
  starsLayer.className = "bg-stars";
  const starsLayerFar = document.createElement("div");
  starsLayerFar.className = "bg-stars far";
  buildCssStarfield(starsLayerNear, 220, 1);
  buildCssStarfield(starsLayer, 300, 1);
  buildCssStarfield(starsLayerFar, 220, 0.9);
  bg.append(starsLayerFar, starsLayer, starsLayerNear);

  const meteorCount = 28;
  for (let i = 0; i < meteorCount; i += 1) {
    const meteor = document.createElement("span");
    meteor.className = "bg-meteor";
    const top = 2 + ((i * 17) % 86);
    const left = 3 + ((i * 23) % 88);
    meteor.style.top = `${top}%`;
    meteor.style.left = `${left}%`;
    meteor.style.animationDelay = `${((i * 0.41) % 7) + (i % 3) * 0.2}s`;
    const duration = 5.2 + (i % 6) * 0.75;
    meteor.style.animationDuration = `${duration}s`;
    const angle = -44 + (i * 5) % 20;
    meteor.style.setProperty("--meteor-angle", `${angle}deg`);
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

  const layers = {
    grid: gridCanvas.getContext("2d"),
    stars: starCanvas.getContext("2d"),
    circuit: circuitCanvas.getContext("2d"),
    trails: trailsCanvas.getContext("2d"),
  };

  if (!layers.grid || !layers.stars || !layers.circuit || !layers.trails) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let time = 0;
  let mouseX = width / 2;
  let mouseY = height / 2;

  const nodes = Array.from({ length: 36 }, (_, index) => ({
    x: (index % 6) * (width / 6) + 80,
    y: Math.floor(index / 6) * (height / 6) + 80,
    pulse: Math.random() * Math.PI * 2,
  }));

  let stars = createStarPopulation(width, height);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    [gridCanvas, starCanvas, circuitCanvas, trailsCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });
    stars = createStarPopulation(width, height);
  }

  function drawStars() {
    const ctx = layers.stars;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    stars.forEach((star) => {
      const alpha = starScintillation(star, time);
      const rgb = starRgb(star.tint);

      if (star.dust) {
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.fillRect(star.x, star.y, 1.1, 1.1);
        return;
      }

      drawStarCore(ctx, star.x, star.y, star.radius, rgb, alpha, star.spikes);
    });

    ctx.restore();
  }

  function drawGrid() {
    const ctx = layers.grid;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(148, 152, 168, 0.055)";
    ctx.lineWidth = 1;

    const baseSpacing = 52;
    const offsetX = ((mouseX / width) - 0.5) * 12;
    const offsetY = ((mouseY / height) - 0.5) * 12;

    for (let x = -baseSpacing; x < width + baseSpacing; x += baseSpacing) {
      ctx.beginPath();
      for (let y = -baseSpacing; y < height + baseSpacing; y += 6) {
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
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.1;

    nodes.forEach((node, index) => {
      const n = {
        x: (index % 6) * (width / 5.5) + 60,
        y: Math.floor(index / 6) * (height / 6.5) + 80,
      };

      const heat = (Math.sin(time * 1.2 + node.pulse) + 1) / 2;
      const glow = 120 + Math.floor(100 * heat);
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
    time += 0.016;
    drawGrid();
    drawStars();
    drawCircuit();
    drawTrails();
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  resize();
  animate();
}

function initIntroGate() {
  if (!document.body || window.location.pathname.split("/").pop() !== "index.html" && window.location.pathname.split("/").pop() !== "") return;

  const gate = document.createElement("div");
  gate.className = "intro-gate";
  gate.innerHTML = `
    <div class="intro-gate-card">
      <video class="intro-video" autoplay muted loop playsinline poster="assets/images/intro-video-cover.jpg">
        <source src="assets/videos/intro-reel.mp4" type="video/mp4" />
      </video>
      <div class="intro-gate-controls">
        <p class="intro-gate-note">Avionics / embedded systems reel — replace with your footage: <strong>assets/videos/intro-reel.mp4</strong></p>
        <button class="intro-gate-enter" type="button">Initialize Avionics Console</button>
      </div>
    </div>
  `;
  document.body.appendChild(gate);

  const enterBtn = gate.querySelector(".intro-gate-enter");
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      gate.classList.add("hidden");
      window.setTimeout(() => gate.remove(), 480);
    });
  }
}

function initScrollReveal() {
  const revealTargets = document.querySelectorAll(
    ".timeline-item, .edu-item, .project-card, .achievement-card, .journey-card, .gallery-item"
  );

  if (!revealTargets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealTargets.forEach((item) => {
    item.classList.add("scroll-reveal");
    observer.observe(item);
  });
}

function initTiltCards() {
  const tiltCards = document.querySelectorAll(".project-card, .achievement-card, .journey-card");
  tiltCards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -5;
      const rotateY = ((x / rect.width) - 0.5) * 5;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function initTelemetryValues() {
  const telemetryValues = document.querySelectorAll("[data-telemetry]");
  telemetryValues.forEach((valueNode) => {
    const baseValue = Number.parseFloat(valueNode.getAttribute("data-telemetry")) || 0;
    const digits = Number.parseInt(valueNode.getAttribute("data-digits") || "2", 10);

    setInterval(() => {
      const noise = (Math.random() - 0.5) * 0.06 * Math.max(baseValue, 1);
      const next = Math.max(0, baseValue + noise);
      valueNode.textContent = next.toFixed(digits);
    }, 1500);
  });
}

function initSignalChainCard() {
  const root = document.querySelector("[data-signal-chain]");
  if (!root) return;

  const altEl = root.querySelector('[data-readout="alt"]');
  const attEl = root.querySelector('[data-readout="att"]');
  const tempEl = root.querySelector('[data-readout="temp"]');
  const battEl = root.querySelector('[data-readout="batt"]');
  const logEl = root.querySelector("[data-chain-log]");
  if (!altEl || !attEl || !tempEl || !battEl || !logEl) return;

  let altM = 412.0;
  let roll = 2.14;
  let pitch = -0.38;
  let yaw = 118.3;
  let tMcu = 36.8;
  let vBatt = 7.42;

  const logTemplates = [
    "[DRV] IMU_WHOAMI=0x47 | DRDY=1",
    "[I2C] 0x77 ACK | baro burst 6B OK",
    "[SPI] AS5047 READ @10MHz | frame OK",
    "[TLM] SEQ=0x4A1B len=48 CRC16 PASS",
    "[RTOS] idle=94% | stack_hwm 612/2048 B",
    "[RF] RSSI=-67 dBm | FSK 50k | LOCK",
    "[PWR] DCDC=NOM | Iq≈18 mA",
  ];
  let logIndex = 0;

  function tickReadouts() {
    altM += (Math.random() - 0.5) * 2.4;
    roll += (Math.random() - 0.5) * 0.32;
    pitch += (Math.random() - 0.5) * 0.26;
    yaw = (yaw + (Math.random() - 0.5) * 0.85 + 360) % 360;
    tMcu += (Math.random() - 0.5) * 0.18;
    vBatt += (Math.random() - 0.5) * 0.014;

    altEl.textContent = altM.toFixed(1);
    attEl.textContent = `${roll.toFixed(1)} / ${pitch.toFixed(1)} / ${yaw.toFixed(1)}`;
    tempEl.textContent = tMcu.toFixed(1);
    battEl.textContent = vBatt.toFixed(2);
  }

  function tickLog() {
    const stamp = new Date().toISOString().slice(11, 19);
    const line = `[${stamp}Z] ${logTemplates[logIndex % logTemplates.length]}`;
    logIndex += 1;
    const prev = logEl.textContent.trim();
    const combined = prev ? `${line}\n${prev}` : line;
    const lines = combined.split("\n");
    logEl.textContent = lines.slice(0, 5).join("\n");
  }

  tickReadouts();
  tickLog();
  window.setInterval(tickReadouts, 1100);
  window.setInterval(tickLog, 2300);
}

function initSubmissionNotice() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("submitted") === "true";
  const fromSession = window.sessionStorage.getItem("portfolioSubmitted") === "true";
  if (!fromQuery && !fromSession) return;

  const notice = document.createElement("div");
  notice.className = "submit-toast";
  notice.setAttribute("role", "status");
  notice.textContent = "Message sent successfully. Thank you for reaching out!";
  document.body.appendChild(notice);

  window.setTimeout(() => {
    notice.classList.add("show");
  }, 80);

  window.setTimeout(() => {
    notice.classList.remove("show");
    window.setTimeout(() => notice.remove(), 300);
  }, 4300);

  window.sessionStorage.removeItem("portfolioSubmitted");
  params.delete("submitted");
  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", cleanUrl);
}

function initSubmitTracking() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", () => {
    window.sessionStorage.setItem("portfolioSubmitted", "true");
  });
}

document.addEventListener("DOMContentLoaded", loadSections);
document.addEventListener("DOMContentLoaded", initIntroGate);
