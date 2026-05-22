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

  initNavState();
  initScrollSpy();
  initScrollReveal();
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

  let readoutTimer;
  let logTimer;

  function startTimers() {
    stopTimers();
    readoutTimer = window.setInterval(tickReadouts, 2500);
    logTimer = window.setInterval(tickLog, 5000);
  }

  function stopTimers() {
    window.clearInterval(readoutTimer);
    window.clearInterval(logTimer);
  }

  startTimers();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTimers();
    else startTimers();
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
