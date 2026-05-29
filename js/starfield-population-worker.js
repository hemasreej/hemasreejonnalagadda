/* Builds WebGL star buffers off the main thread. */
const STRIDE = 12;

function starCounts(width, height, lite) {
  const area = width * height;
  let scale = 1;
  if (lite) scale = 0.32;
  else if (width < 1024) scale = 0.55;
  const dustCount = Math.floor(
    Math.min(1400, Math.max(500, Math.floor(area / 520))) * scale
  );
  const mainCount = Math.floor(
    Math.min(420, Math.max(160, Math.floor(area / 1800))) * scale
  );
  return {
    dustCount: Math.max(lite ? 120 : 280, dustCount),
    mainCount: Math.max(lite ? 40 : 80, mainCount),
  };
}

function pushStar(data, offset, star) {
  let i = offset;
  data[i++] = star.x;
  data[i++] = star.y;
  data[i++] = star.radius;
  data[i++] = star.phase;
  data[i++] = star.speed;
  data[i++] = star.sharpness;
  data[i++] = star.minAlpha;
  data[i++] = star.maxAlpha;
  data[i++] = star.brightness;
  data[i++] = star.tint;
  data[i++] = star.dust ? 1 : 0;
  data[i++] = star.spikes ? 1 : 0;
  return i;
}

function buildPopulation(width, height, lite) {
  const { dustCount, mainCount } = starCounts(width, height, lite);
  const total = dustCount + mainCount;
  const data = new Float32Array(total * STRIDE);
  let offset = 0;

  for (let i = 0; i < dustCount; i += 1) {
    offset = pushStar(data, offset, {
      x: Math.random() * width,
      y: Math.random() * height,
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
    offset = pushStar(data, offset, {
      x: Math.random() * width,
      y: Math.random() * height,
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

  return { data, count: total };
}

self.onmessage = (event) => {
  const { width, height, lite } = event.data || {};
  if (!width || !height) return;
  const packed = buildPopulation(width, height, !!lite);
  self.postMessage(packed, [packed.data.buffer]);
};
