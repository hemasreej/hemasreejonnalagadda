const sectionFiles = [
  "sections/hero.html",
  "sections/about.html",
  "sections/exprience.html",
  "sections/projects.html",
  "sections/contact.html",
  "sections/footer.html",
];

async function loadSections() {
  const container = document.getElementById("page-sections");
  if (!container) return;

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

  initScrollSpy();
}

function initScrollSpy() {
  const navLinks = document.querySelectorAll(".site-nav a");
  const sections = document.querySelectorAll("section[id]");
  const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;

  function updateActiveLink() {
    const scrollPosition = window.scrollY + headerHeight + 40;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const isActive = scrollPosition >= sectionTop && scrollPosition < sectionBottom;

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${section.id}` && isActive);
      });
    });
  }

  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();
}

document.addEventListener("DOMContentLoaded", loadSections);
