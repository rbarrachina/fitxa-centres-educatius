import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  renderArea,
  renderCatalunya,
  renderMunicipality,
  renderMunicipalityIndex,
} from "../api/directori.mjs";
import { compareNames, getCurrentCentres, slugify } from "../api/seo-utils.mjs";

export const GITHUB_PAGES_BASE = "/fitxa-centres-educatius";

export function rewriteForGitHubPages(html) {
  return String(html)
    .replace(/href="\/centre\/(\d{8})[^\"]*"/g, `href="${GITHUB_PAGES_BASE}/?codi=$1"`)
    .replace(/\b(href|action)="\/(?!(?:\/|fitxa-centres-educatius(?:\/|")))/g, `$1="${GITHUB_PAGES_BASE}/`);
}

async function writePage(outputRoot, relativePath, html) {
  const target = join(outputRoot, relativePath, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, rewriteForGitHubPages(html), "utf8");
}

async function validateInternalLinks(outputRoot) {
  const files = await readdir(outputRoot, { recursive: true });
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const missing = [];
  for (const file of htmlFiles) {
    const html = await readFile(join(outputRoot, file), "utf8");
    const links = html.matchAll(/\b(?:href|action)="([^\"]+)"/g);
    for (const [, value] of links) {
      if (!value.startsWith(`${GITHUB_PAGES_BASE}/`)) continue;
      const url = new URL(value, "https://example.test");
      const relative = url.pathname.slice(GITHUB_PAGES_BASE.length + 1);
      const target = relative && !url.pathname.endsWith("/") ? relative : join(relative, "index.html");
      try {
        await access(join(outputRoot, target));
      } catch {
        missing.push(`${file} -> ${value}`);
      }
    }
  }
  if (missing.length) throw new Error(`Enllaços interns inexistents:\n${missing.slice(0, 20).join("\n")}`);
}

export async function buildGitHubPages({ outputRoot, centres }) {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(join(process.cwd(), "web"), outputRoot, { recursive: true });

  const homePath = join(outputRoot, "index.html");
  const home = await readFile(homePath, "utf8");
  await writeFile(homePath, rewriteForGitHubPages(home), "utf8");

  await writePage(outputRoot, "centres", renderCatalunya(centres));
  await writePage(outputRoot, "municipis", renderMunicipalityIndex(centres));

  const areas = Array.from(new Set(centres.map((row) => String(row.nom_delegaci ?? "").trim()).filter(Boolean)))
    .sort(compareNames);
  const jobs = [];
  for (const area of areas) {
    jobs.push(writePage(outputRoot, join("centres", slugify(area)), renderArea(centres, area)));
    const municipalities = Array.from(new Set(
      centres
        .filter((row) => String(row.nom_delegaci ?? "").trim() === area)
        .map((row) => String(row.nom_municipi ?? "").trim())
        .filter(Boolean),
    )).sort(compareNames);
    for (const municipality of municipalities) {
      jobs.push(writePage(
        outputRoot,
        join("centres", slugify(area), slugify(municipality)),
        renderMunicipality(centres, area, municipality),
      ));
    }
  }
  await Promise.all(jobs);
  await validateInternalLinks(outputRoot);
  return { areas: areas.length, municipalities: jobs.length - areas.length, centres: centres.length };
}

async function main() {
  const outputRoot = join(process.cwd(), "dist", "github-pages");
  const centres = await getCurrentCentres();
  const totals = await buildGitHubPages({ outputRoot, centres });
  console.log(`GitHub Pages: ${totals.areas} àrees, ${totals.municipalities} municipis i ${totals.centres} centres.`);
}

const executedFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedFile) await main();
