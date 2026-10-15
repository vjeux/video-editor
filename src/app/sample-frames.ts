const WIDTH = 480;
const HEIGHT = 270;

function paint(draw: (ctx: OffscreenCanvasRenderingContext2D) => void): OffscreenCanvas {
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a sample canvas");
  draw(ctx);
  return canvas;
}

const sunset = () =>
  paint((ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.6);
    sky.addColorStop(0, "#2b1055");
    sky.addColorStop(0.5, "#d53369");
    sky.addColorStop(1, "#ffb36b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffe3a3";
    ctx.beginPath();
    ctx.arc(WIDTH * 0.62, HEIGHT * 0.52, 34, 0, Math.PI * 2);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, HEIGHT * 0.6, 0, HEIGHT);
    sea.addColorStop(0, "#5a2a6e");
    sea.addColorStop(1, "#140d2a");
    ctx.fillStyle = sea;
    ctx.fillRect(0, HEIGHT * 0.6, WIDTH, HEIGHT * 0.4);
    ctx.fillStyle = "rgba(255, 200, 140, 0.35)";
    for (let i = 0; i < 14; i++)
      ctx.fillRect(WIDTH * 0.62 - 60 + ((i * 37) % 120), HEIGHT * 0.64 + i * 6, 40 - i, 2);
  });

const hills = () =>
  paint((ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#7fb2d8");
    sky.addColorStop(1, "#e8eef2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const layers = [
      ["#5d7a8c", 0.55, 50],
      ["#3f5a4a", 0.68, 40],
      ["#1b2612", 0.82, 30],
    ] as const;
    layers.forEach(([color, top, amp], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT);
      for (let x = 0; x <= WIDTH; x += 10)
        ctx.lineTo(x, HEIGHT * top - Math.abs(Math.sin(x / (90 - i * 12) + i * 2)) * amp);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.fill();
    });
  });

let cached: [OffscreenCanvas, OffscreenCanvas] | null = null;

/** Two pleasant sample frames for effect thumbnails and the studio preview (from, to). */
export function sampleFrames(): [OffscreenCanvas, OffscreenCanvas] {
  cached ??= [sunset(), hills()];
  return cached;
}
