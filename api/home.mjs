import { readFileSync } from "node:fs";
import { join } from "node:path";

const template = readFileSync(join(process.cwd(), "web", "index.html"), "utf8");

export default {
  async fetch() {
    return new Response(template, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  },
};
