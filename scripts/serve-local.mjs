import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import centreFunction from "../api/centre.mjs";
import directoriFunction from "../api/directori.mjs";
import homeFunction from "../api/home.mjs";
import sitemapFunction from "../api/sitemap.mjs";

const port = Number(process.env.PORT || 3000);
const webRoot = join(process.cwd(), "web");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

async function sendResponse(nodeResponse, webResponse, headOnly = false) {
  nodeResponse.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => nodeResponse.setHeader(key, value));
  if (headOnly || !webResponse.body) {
    nodeResponse.end();
    return;
  }
  nodeResponse.end(Buffer.from(await webResponse.arrayBuffer()));
}

function permanentRedirect(response, location) {
  response.writeHead(301, { Location: location });
  response.end();
}

async function serveStatic(pathname, response, headOnly) {
  const relative = normalize(pathname).replace(/^[/\\]+/, "");
  const filePath = join(webRoot, relative);
  if (!filePath.startsWith(`${webRoot}/`)) return false;
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream" });
    response.end(headOnly ? undefined : body);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);
  const pathname = url.pathname;
  const headOnly = request.method === "HEAD";
  try {
    if (pathname === "/") {
      await sendResponse(response, await homeFunction.fetch(), headOnly);
      return;
    }
    if (pathname === "/sitemap.xml") {
      await sendResponse(response, await sitemapFunction.fetch(), headOnly);
      return;
    }
    if (pathname === "/centres") {
      permanentRedirect(response, "/centres/");
      return;
    }
    if (pathname === "/municipis") {
      permanentRedirect(response, "/municipis/");
      return;
    }
    if (pathname === "/municipis/") {
      await sendResponse(response, await directoriFunction.fetch(new Request("http://localhost/api/directori?view=municipis")), headOnly);
      return;
    }
    const municipalityMatch = pathname.match(/^\/centres\/([^/]+)\/([^/]+)\/?$/);
    if (municipalityMatch) {
      if (!pathname.endsWith("/")) {
        permanentRedirect(response, `${pathname}/`);
        return;
      }
      const internalUrl = new URL("http://localhost/api/directori");
      internalUrl.searchParams.set("area", municipalityMatch[1]);
      internalUrl.searchParams.set("municipi", municipalityMatch[2]);
      await sendResponse(response, await directoriFunction.fetch(new Request(internalUrl)), headOnly);
      return;
    }
    const areaMatch = pathname.match(/^\/centres\/([^/]+)\/?$/);
    if (areaMatch) {
      if (!pathname.endsWith("/")) {
        permanentRedirect(response, `${pathname}/`);
        return;
      }
      const internalUrl = new URL("http://localhost/api/directori");
      internalUrl.searchParams.set("area", areaMatch[1]);
      await sendResponse(response, await directoriFunction.fetch(new Request(internalUrl)), headOnly);
      return;
    }
    if (pathname === "/centres/") {
      await sendResponse(response, await directoriFunction.fetch(new Request("http://localhost/api/directori")), headOnly);
      return;
    }
    const centreMatch = pathname.match(/^\/centre\/([^/]+)\/?$/);
    if (centreMatch) {
      if (!pathname.endsWith("/")) {
        permanentRedirect(response, `${pathname}/`);
        return;
      }
      const internalUrl = new URL("http://localhost/api/centre");
      internalUrl.searchParams.set("centre", centreMatch[1]);
      const centreResponse = await centreFunction.fetch(new Request(internalUrl));
      const location = centreResponse.headers.get("location");
      if (location?.startsWith("https://fitxa-centres.vercel.app/")) {
        centreResponse.headers.set("location", new URL(location).pathname);
      }
      await sendResponse(response, centreResponse, headOnly);
      return;
    }
    if (await serveStatic(pathname, response, headOnly)) return;
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("No s’ha trobat la pàgina.");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Error intern.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Fitxa Centres disponible a http://127.0.0.1:${port}`);
});
