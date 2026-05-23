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
  initTiltCards();
  initTelemetryValues();
  initSignalChainCard();
  initExperienceCards();
  initSubmitTracking();
  initSubmissionNotice();
}

function initExperienceCards() {
  document.querySelectorAll("[data-exp-card]").forEach((card) => {
    const toggle = card.querySelector(".exp-card-toggle");
    const panel = card.querySelector(".exp-card-depth");
    const label = card.querySelector(".exp-card-toggle-label");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      const nextOpen = !isOpen;

      toggle.setAttribute("aria-expanded", String(nextOpen));
      panel.hidden = !nextOpen;
      card.classList.toggle("is-expanded", nextOpen);

      if (label) {
        label.textContent = nextOpen ? "Hide details" : "View full details";
      }
    });
  });
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

let interactiveBgReady = false;

function initInteractiveBackground() {
  const bg = document.getElementById("interactive-bg");
  if (!bg || interactiveBgReady) return;
  interactiveBgReady = true;

  if (typeof mountSpaceBackground !== "function") {
    console.warn(
      "Space background module missing — load js/starfield-renderer.js before main.js."
    );
    return;
  }

  mountSpaceBackground(bg);
}

function initScrollReveal() {
  const revealTargets = document.querySelectorAll(
    ".timeline-item, .edu-item, .project-card, .achievement-card, .gallery-item"
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
  const tiltCards = document.querySelectorAll(".project-card, .achievement-card");
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

  const hwEl = root.querySelector('[data-readout="hw"]');
  const fwEl = root.querySelector('[data-readout="fw"]');
  const rdEl = root.querySelector('[data-readout="rd"]');
  const sysEl = root.querySelector('[data-readout="sys"]');
  const logEl = root.querySelector("[data-chain-log]");
  if (!hwEl || !fwEl || !rdEl || !sysEl || !logEl) return;

  let hwPcbRev = 2.1;
  let fwBuild = 1.42;
  let rdPrototypes = 3;
  let sysDeployed = 2;

  const logTemplates = [
    "[HW] PCB bring-up OK | sensor rail 3V3 stable",
    "[FW] FreeRTOS online | drivers + comm stack loaded",
    "[R&D] bench test PASS | fusion algo v0.3 tuned",
    "[SYS] field unit #2 | telemetry link stable",
    "[HW] BOM lock v2.1 | DFM review complete",
    "[FW] OTA-ready build 1.4.2 | CRC verify OK",
    "[R&D] prototype #3 | IMU + vitals pipeline live",
    "[SYS] integration sign-off | monitoring dashboard up",
  ];
  let logIndex = 0;

  function tickReadouts() {
    hwPcbRev += (Math.random() - 0.5) * 0.04;
    fwBuild += (Math.random() - 0.5) * 0.06;
    if (Math.random() > 0.92) rdPrototypes = Math.min(5, Math.max(1, rdPrototypes + (Math.random() > 0.5 ? 1 : -1)));
    if (Math.random() > 0.96) sysDeployed = Math.min(4, Math.max(1, sysDeployed + (Math.random() > 0.5 ? 1 : -1)));

    hwEl.textContent = `PCB v${hwPcbRev.toFixed(1)}`;
    fwEl.textContent = `v${fwBuild.toFixed(2)}`;
    rdEl.textContent = `${rdPrototypes} active`;
    sysEl.textContent = `${sysDeployed} deployed`;
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

document.addEventListener("DOMContentLoaded", () => {
  loadSections();
  requestAnimationFrame(() => initInteractiveBackground());
});
