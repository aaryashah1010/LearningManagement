// Regenerates docs/screenshots/03-teacher.png — the "teacher" panel montage —
// against a running dev server. Run `npm run dev` first, then:
//   node scripts/capture-screenshots.mjs
//
// Other screenshot files (login, admin, student, dark mode, sidebar) aren't
// touched here; nothing about those screens changed.

import { chromium } from "playwright";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_FILE = path.join(ROOT, "docs/screenshots/03-teacher.png");

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 1150;
const COLUMNS = 3;
const GAP = 28;
const PADDING = 48;

const PANELS = [
  {
    file: "dashboard.png",
    title: "Dashboard",
    subtitle: "MY CLASSES, WEAK TOPICS",
    path: "/teacher/dashboard",
  },
  {
    file: "tests.png",
    title: "Tests",
    subtitle: "UPLOAD SHEETS PER TEST, PUBLISH-GATED",
    path: "/teacher/tests",
  },
  {
    file: "test-review.png",
    title: "Test review",
    subtitle: "AI MAPPING, MARKSHEET UPLOAD & REVIEW",
    path: "/teacher/tests/test-1",
    async interact(page) {
      await page.getByRole("button", { name: "Upload OMR sheets" }).click();
      await page.getByRole("button", { name: "Generate report" }).waitFor({ timeout: 10000 });
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    file: "submission-review.png",
    title: "Submission review",
    subtitle: "CONFIRM A FLAGGED READ, JUMP TO FULL REPORT",
    path: "/teacher/submissions/sub-2",
  },
  {
    file: "reports.png",
    title: "Reports",
    subtitle: "CUMULATIVE TREND + STUDENT DIRECTORY",
    path: "/teacher/reports",
  },
  {
    file: "student-report.png",
    title: "Student report",
    subtitle: "ANY STUDENT, INDIVIDUALLY",
    path: "/teacher/students/c1-s2/report",
  },
];

function montageHtml(imageDataUris) {
  const cells = PANELS.map(
    (panel, i) => `
      <figure>
        <img src="${imageDataUris[i]}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" />
        <figcaption>
          <strong>${panel.title}</strong>
          <span>${panel.subtitle}</span>
        </figcaption>
      </figure>`
  ).join("\n");

  const totalWidth = PADDING * 2 + PANEL_WIDTH * COLUMNS + GAP * (COLUMNS - 1);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${totalWidth}px;
    background: #faf6ec;
    padding: ${PADDING}px;
    font-family: -apple-system, "Segoe UI", sans-serif;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(${COLUMNS}, ${PANEL_WIDTH}px);
    gap: ${GAP}px;
  }
  figure { display: flex; flex-direction: column; gap: 14px; }
  img {
    display: block;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(30, 42, 47, 0.12), 0 8px 24px rgba(30, 42, 47, 0.10);
  }
  figcaption { display: flex; flex-direction: column; gap: 4px; }
  figcaption strong {
    font-size: 15px;
    color: #1e2a2f;
  }
  figcaption span {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(30, 42, 47, 0.45);
  }
</style>
</head>
<body>
  <div class="grid">
    ${cells}
  </div>
</body>
</html>`;
}

async function main() {
  const browser = await chromium.launch();
  const tmp = await mkdtemp(path.join(tmpdir(), "tangent-screenshots-"));

  try {
    const page = await browser.newPage({ viewport: { width: PANEL_WIDTH, height: PANEL_HEIGHT } });
    await page.setViewportSize({ width: PANEL_WIDTH, height: PANEL_HEIGHT });

    const dataUris = [];
    for (const panel of PANELS) {
      await page.goto(`${BASE_URL}${panel.path}`, { waitUntil: "networkidle" });
      if (panel.interact) await panel.interact(page);
      const buffer = await page.screenshot();
      dataUris.push(`data:image/png;base64,${buffer.toString("base64")}`);
    }

    await page.close();

    const montagePage = await browser.newPage();
    const htmlPath = path.join(tmp, "montage.html");
    await writeFile(htmlPath, montageHtml(dataUris));
    await montagePage.goto(`file://${htmlPath}`);
    const body = await montagePage.$("body");
    await body.screenshot({ path: OUT_FILE });

    console.log(`Wrote ${OUT_FILE}`);
  } finally {
    await browser.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
