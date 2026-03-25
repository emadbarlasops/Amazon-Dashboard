const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function prettyJson(value) {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function renderSection(title, bodyHtml) {
  return `
    <section class="section">
      <h2 class="h2">${escapeHtml(title)}</h2>
      <div class="body">${bodyHtml}</div>
    </section>
  `;
}

function toList(items) {
  if (!Array.isArray(items) || items.length === 0) return `<div class="muted">None</div>`;
  return `<ul class="ul">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function toObjectList(items) {
  if (!Array.isArray(items) || items.length === 0) return `<div class="muted">None</div>`;
  return `
    <div class="cardgrid">
      ${items
        .map((it) => {
          const json = prettyJson(it);
          return `<pre class="pre">${json}</pre>`;
        })
        .join("")}
    </div>
  `;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      "Usage: node export-report-pdf.js <path-to-results/analysis_*.json> [outputPath]"
    );
    process.exit(1);
  }

  const outArg = process.argv[3];
  const resolvedInput = path.resolve(inputPath);
  const outputPath =
    outArg ||
    resolvedInput.replace(/\.json$/i, "") + ".pdf";

  const raw = fs.readFileSync(resolvedInput, "utf8");
  const report = JSON.parse(raw);

  const meta = report.meta ?? {};
  const claude = report.claude_analysis ?? report.claudeAnalysis ?? {};

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Amazon Dashboard Analysis Report</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 28px; color: #111; }
          .title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
          .subtitle { color: #444; margin-bottom: 16px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
          .meta .box { border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px 12px; }
          .k { color: #666; font-size: 12px; }
          .v { font-size: 14px; font-weight: 600; word-break: break-word; }
          .section { margin-top: 16px; page-break-inside: avoid; }
          .h2 { font-size: 14px; margin-bottom: 6px; }
          .body { font-size: 12.5px; line-height: 1.45; color: #111; }
          .ul { margin: 0; padding-left: 18px; }
          .muted { color: #666; }
          .pre { background: #fafafa; border: 1px solid #eee; border-radius: 10px; padding: 10px; overflow: hidden; }
          .cardgrid { display: grid; grid-template-columns: 1fr; gap: 10px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="title">Amazon Dashboard Analysis Report</div>
        <div class="subtitle">Generated from <span class="muted">${escapeHtml(path.basename(resolvedInput))}</span></div>

        <div class="meta">
          <div class="box"><div class="k">Client ASIN</div><div class="v">${escapeHtml(meta.client_asin ?? meta.clientAsin ?? "—")}</div></div>
          <div class="box"><div class="k">Category</div><div class="v">${escapeHtml(meta.category ?? "—")}</div></div>
          <div class="box"><div class="k">Run date</div><div class="v">${escapeHtml(meta.run_date ?? meta.runDate ?? "—")}</div></div>
          <div class="box"><div class="k">Competitors found</div><div class="v">${Array.isArray(meta.competitor_asins) ? meta.competitor_asins.length : "—"}</div></div>
        </div>

        ${renderSection("Top claims", toList(claude.top_claims))}
        ${renderSection("Emotional triggers", toList(claude.emotional_triggers))}
        ${renderSection("Common objections", toList(claude.common_objections))}
        ${renderSection("Feature gaps", toList(claude.feature_gaps))}
        ${renderSection("Power words", toList(claude.power_words))}

        ${renderSection(
          "Keyword themes",
          `<pre class="pre">${prettyJson(claude.keyword_themes)}</pre>`
        )}

        ${renderSection(
          "Competitor summary",
          `<pre class="pre">${prettyJson(claude.competitor_summary)}</pre>`
        )}

        ${renderSection(
          "Recommended positioning",
          `<div style="white-space: pre-wrap;">${escapeHtml(claude.recommended_positioning ?? "")}</div>`
        )}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", right: "12mm", bottom: "20mm", left: "12mm" },
  });

  await browser.close();

  console.log(`✅ PDF saved: ${outputPath}`);
}

main().catch((err) => {
  console.error("❌ Failed to export PDF:", err?.message || err);
  process.exit(1);
});

