const defaultSectionFiles = [
  "sections/hero.html",
  "sections/about.html",
  "sections/projects.html",
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

function initInteractiveBackground() {
  const bg = document.getElementById("interactive-bg");
  if (!bg) return;
  bg.innerHTML = "";

  const starsLayer = document.createElement("div");
  starsLayer.className = "bg-stars";
  const starsLayerFar = document.createElement("div");
  starsLayerFar.className = "bg-stars far";
  bg.append(starsLayer, starsLayerFar);

  for (let i = 0; i < 4; i += 1) {
    const meteor = document.createElement("span");
    meteor.className = "bg-meteor";
    meteor.style.top = `${8 + i * 18}%`;
    meteor.style.left = `${72 + i * 6}%`;
    meteor.style.animationDelay = `${i * 2.4}s`;
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

  bg.append(gridCanvas, starCanvas, circuitCanvas, trailsCanvas);

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

  const stars = Array.from({ length: 560 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2.1 + 0.35,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.45 + Math.random() * 1.25,
    tint: Math.random(),
  }));

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    [gridCanvas, starCanvas, circuitCanvas, trailsCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });
  }

  function drawStars() {
    const ctx = layers.stars;
    ctx.clearRect(0, 0, width, height);
    stars.forEach((star) => {
      const pulse = (Math.sin(time * star.speed + star.twinkle) + 1) / 2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius + pulse * 0.85, 0, Math.PI * 2);
      const alpha = 0.55 + pulse * 0.45;
      const color =
        star.tint < 0.72
          ? `rgba(255,255,255,${alpha})`
          : star.tint < 0.9
            ? `rgba(147,197,253,${alpha})`
            : `rgba(250,204,21,${alpha * 0.9})`;
      ctx.fillStyle = color;
      ctx.fill();

      if (star.radius > 1.9) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.11})`;
        ctx.fill();
      }
    });
  }

  function drawGrid() {
    const ctx = layers.grid;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(96, 165, 250, 0.12)";
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
      ctx.fillStyle = `rgba(34, ${glow}, 255, ${0.2 + heat * 0.3})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.8 + heat * 2.8, 0, Math.PI * 2);
      ctx.fill();

      if (index % 2 === 0 && nodes[index + 1]) {
        const next = {
          x: ((index + 1) % 6) * (width / 5.5) + 60,
          y: Math.floor((index + 1) / 6) * (height / 6.5) + 80,
        };
        const pulse = (Math.sin(time * 2 + node.pulse) + 1) / 2;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 + pulse * 0.24})`;
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
        <p class="intro-gate-note">Add your real intro video: <strong>assets/videos/intro-reel.mp4</strong></p>
        <button class="intro-gate-enter" type="button">Enter Mission Control</button>
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
