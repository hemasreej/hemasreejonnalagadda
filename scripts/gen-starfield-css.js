const fs = require("fs");
const path = require("path");

function build(count, maxOpacity, seed) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const g = [];
  for (let i = 0; i < count; i++) {
    const x = rnd() * 100;
    const y = rnd() * 100;
    const size = 0.8 + rnd() * 1.6;
    const opacity = (0.65 + rnd() * 0.35) * maxOpacity;
    const t = rnd();
    const color =
      t < 0.82
        ? `rgba(255,255,255,${opacity})`
        : t < 0.94
          ? `rgba(255,236,210,${opacity})`
          : `rgba(230,228,245,${opacity * 0.9})`;
    g.push(
      `radial-gradient(${size}px ${size}px at ${x}% ${y}%, ${color}, transparent 68%)`
    );
  }
  return g.join(",");
}

const data = {
  far: build(220, 0.9, 101),
  mid: build(300, 1, 202),
  near: build(220, 1, 303),
};

const outPath = path.join(__dirname, "..", "js", "starfield-css-data.js");
const body = `window.STARFIELD_CSS=${JSON.stringify(data)};`;
fs.writeFileSync(outPath, body);
console.log("wrote", outPath, "bytes", fs.statSync(outPath).size);
