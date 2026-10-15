#!/usr/bin/env node
// Long and large media benchmark: peak memory and tab survival for import,
// playback start, export and .cutline save/open in headless Chromium.
//
//   vp dev --port 5199            (in another terminal)
//   node bench/long-media.mjs --minutes 10,30,60 --large --out bench/results/after.json
//
// Media is generated in the page (Mediabunny → OPFS) and cached in a
// persistent profile under node_modules/.cache, so only the first run pays
// for it. CHROMIUM=/path/to/chrome picks the browser binary.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values: args } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:5199" },
    minutes: { type: "string", default: "10,30,60" },
    large: { type: "boolean", default: false },
    steps: { type: "string", default: "import,play,export,project" },
    out: { type: "string" },
    headed: { type: "boolean", default: false },
    profile: { type: "string", default: "node_modules/.cache/cutline-bench/profile" },
  },
});

const PROFILE = resolve(args.profile);
const SAMPLE_MS = 200;
const MB = 1024 * 1024;

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const dir of dirs) {
    const app = join(
      cache,
      dir,
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    );
    const linux = join(cache, dir, "chrome-linux/chrome");
    if (existsSync(app)) return app;
    if (existsSync(linux)) return linux;
  }
  return undefined;
}

/** Resident memory of this profile's renderer processes, in MB (the largest one is the tab). */
function rendererRss() {
  try {
    const out = execFileSync("ps", ["-axo", "pid=,rss=,command="], {
      encoding: "utf8",
      maxBuffer: 64 * MB,
    });
    let max = 0;
    for (const line of out.split("\n")) {
      if (!line.includes(PROFILE) || !line.includes("--type=renderer")) continue;
      const rss = Number(line.trim().split(/\s+/)[1]) / 1024;
      max = Math.max(max, rss);
    }
    return max;
  } catch {
    return 0;
  }
}

/** Samples JS heap (CDP) and renderer RSS while `work` runs; returns its result plus the peaks. */
async function measured(cdp, page, label, work) {
  const peak = { heapMB: 0, rssMB: 0 };
  let crashed = false;
  const onCrash = () => (crashed = true);
  page.once("crash", onCrash);
  const sample = async () => {
    try {
      const { metrics } = await cdp.send("Performance.getMetrics");
      const heap = metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0;
      peak.heapMB = Math.max(peak.heapMB, heap / MB);
    } catch {
      // The page may be mid-crash.
    }
    peak.rssMB = Math.max(peak.rssMB, rendererRss());
  };
  const timer = setInterval(sample, SAMPLE_MS);
  const started = Date.now();
  let result;
  let error = null;
  try {
    result = await work();
  } catch (e) {
    error = crashed ? "tab crashed" : String(e?.message ?? e).split("\n")[0];
  } finally {
    clearInterval(timer);
    page.off("crash", onCrash);
  }
  await sample();
  const entry = {
    step: label,
    survived: !crashed,
    ok: !error,
    error,
    wallSeconds: (Date.now() - started) / 1000,
    peakHeapMB: Math.round(peak.heapMB),
    peakRendererRssMB: Math.round(peak.rssMB),
    ...result,
  };
  console.log(JSON.stringify(entry));
  return entry;
}

async function openEditor(context) {
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("[page]", e.message));
  page.on("console", (m) => m.type() === "error" && console.error("[console]", m.text()));
  await page.goto(`${args.url}/?perf`);
  await page.waitForFunction(() => document.querySelector("#root")?.childElementCount > 0);
  await page.evaluate(() => import("/bench/page.js"));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  return { page, cdp };
}

const call = (page, fn, ...params) =>
  page.evaluate(
    async ([fn, params]) => (await import("/bench/page.js"))[fn](...params),
    [fn, params],
  );

async function clearSiteData(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  // Keep OPFS (the generated media cache); drop the editor's saved session.
  await cdp.send("Storage.clearDataForOrigin", { origin: args.url, storageTypes: "indexeddb" });
  await page.close();
}

async function runScenario(context, spec, steps) {
  const results = [];
  await clearSiteData(context);
  let { page, cdp } = await openEditor(context);
  const generated = await call(page, "generate", spec);
  console.log(
    `# ${spec.name}: ${(generated.size / MB).toFixed(0)} MB${generated.cached ? " (cached)" : ""}`,
  );
  const timeout = Math.max(600_000, spec.seconds * 1000 * 4);
  const record = (entry) =>
    results.push({
      media: spec.name,
      minutes: spec.seconds / 60,
      mediaMB: Math.round(generated.size / MB),
      ...entry,
    });

  // Start every step from a fresh tab so one step's garbage doesn't count against the next.
  await page.close();
  ({ page, cdp } = await openEditor(context));
  if (steps.includes("import")) {
    record(
      await measured(cdp, page, "import", () => call(page, "importMedia", spec.name, timeout)),
    );
  }
  if (!page.isClosed() && steps.includes("play")) {
    record(await measured(cdp, page, "play", () => call(page, "playMiddle", 5)));
  }
  if (!page.isClosed() && steps.includes("mix-check")) {
    record(await measured(cdp, page, "mix-check", () => call(page, "mixCheck")));
  }
  if (!page.isClosed() && steps.includes("export")) {
    await call(page, "clearOutputs", ["bench-export.mp4"]);
    record(
      await measured(cdp, page, "export", () => call(page, "exportTimeline", "bench-export.mp4")),
    );
    await call(page, "clearOutputs", ["bench-export.mp4"]).catch(() => {});
  }
  if (!page.isClosed() && steps.includes("project")) {
    const saved = join(tmpdir(), `cutline-bench-${spec.name}.cutline`);
    rmSync(saved, { force: true });
    record(
      await measured(cdp, page, "project-save", async () => {
        const download = page.waitForEvent("download", { timeout });
        await call(page, "saveProject");
        await (await download).saveAs(saved);
        return { bytes: statSync(saved).size };
      }),
    );
    if (existsSync(saved)) {
      await page.close();
      ({ page, cdp } = await openEditor(context));
      await page.evaluate(() => {
        const input = Object.assign(document.createElement("input"), {
          type: "file",
          id: "bench-open",
        });
        document.body.append(input);
      });
      await page.setInputFiles("#bench-open", saved);
      record(
        await measured(cdp, page, "project-open", () =>
          call(page, "openProject", "#bench-open", timeout),
        ),
      );
      rmSync(saved, { force: true });
    }
  }
  if (!page.isClosed()) record({ step: "storage", ...(await call(page, "storage")) });
  await page.close().catch(() => {});
  return results;
}

const minutes = args.minutes ? args.minutes.split(",").filter(Boolean).map(Number) : [];
const steps = args.steps.split(",");
const specs = [
  ...minutes.map((m) => ({
    name: `long-${m}min.mp4`,
    seconds: m * 60,
    width: 256,
    height: 144,
    fps: 15,
    bitrate: 150_000,
    noise: false,
  })),
  ...(args.large
    ? [
        {
          name: "large-720p.mp4",
          seconds: 300,
          width: 1280,
          height: 720,
          fps: 30,
          bitrate: 40_000_000,
          noise: true,
        },
      ]
    : []),
];

mkdirSync(PROFILE, { recursive: true });
const context = await chromium.launchPersistentContext(PROFILE, {
  executablePath: findChromium(),
  headless: !args.headed,
  acceptDownloads: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--enable-precise-memory-info"],
});
const all = [];
try {
  for (const spec of specs) {
    // A large file's steps run without the long-file export, which the long files cover.
    const scenarioSteps = spec.noise ? steps.filter((s) => s !== "export") : steps;
    all.push(...(await runScenario(context, spec, scenarioSteps)));
  }
} finally {
  await context.close();
}
if (args.out) {
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(
    args.out,
    JSON.stringify({ date: new Date().toISOString(), results: all }, null, 2) + "\n",
  );
}
