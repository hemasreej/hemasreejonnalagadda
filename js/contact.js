/* =========================
   CONTACT FORM LOGIC
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const statusText = document.getElementById("form-status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      statusText.textContent = "⚠️ Please fill all fields.";
      statusText.style.color = "#ff4d4d";
      return;
    }

    statusText.textContent = "⏳ Sending...";
    statusText.style.color = "#ffd700";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
      });

      if (response.ok) {
        statusText.textContent = "✅ Message sent successfully!";
        statusText.style.color = "#7CFC00";
        form.reset();
      } else {
        statusText.textContent = "❌ Failed to send message. Try again.";
        statusText.style.color = "#ff4d4d";
      }
    } catch (error) {
      statusText.textContent = "⚠️ Network error, please retry.";
      statusText.style.color = "#ff4d4d";
    }
  });
});
