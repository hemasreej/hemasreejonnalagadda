/* Bakes sparse star sky off the main thread (prevents "page unresponsive"). */
self.onmessage = async function onStarfieldWorkerMessage(event) {
  const { width, height, count, seed } = event.data;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    self.postMessage({ error: "no-canvas" });
    return;
  }

  let state = seed >>> 0;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    const x = rnd() * width;
    const y = rnd() * height;
    const core = 0.45 + rnd() * 1.35;
    const halo = core * (2.4 + rnd() * 2.2);
    const alpha = 0.32 + rnd() * 0.48;
    const tint = rnd();
    let r = 255;
    let g = 255;
    let b = 255;
    if (tint > 0.82 && tint < 0.94) {
      g = 236;
      b = 210;
    } else if (tint >= 0.94) {
      r = 230;
      g = 228;
      b = 245;
    }

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, halo);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    gradient.addColorStop(0.12, `rgba(${r},${g},${b},${alpha * 0.55})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, halo, 0, Math.PI * 2);
    ctx.fill();
  }

  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.84 });
  self.postMessage({ blob });
};
