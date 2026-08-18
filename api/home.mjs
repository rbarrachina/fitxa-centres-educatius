import { readFileSync } from "node:fs";
import { join } from "node:path";

const template = readFileSync(join(process.cwd(), "web", "index.html"), "utf8");

function renderExplorer() {
  return `<nav class="home-explore-links" aria-label="Explora els centres educatius"><a href="/centres/">Explora per àrea territorial</a><a href="/municipis/">Explora per municipi</a></nav>`;
}

function renderHome() {
  return template.replace('      <div id="message" class="message"></div>', `      ${renderExplorer()}\n\n      <div id="message" class="message"></div>`);
}

export default {
  async fetch() {
    return new Response(renderHome(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  },
};
