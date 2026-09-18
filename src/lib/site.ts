/**
 * Single source of truth for the public origin.
 *
 * The site ships on its Vercel domain. If a custom domain is registered
 * later, set NEXT_PUBLIC_SITE_URL in the Vercel project and every
 * canonical URL, OG tag, JSON-LD id, sitemap entry and robots.txt line
 * moves with it — no code change.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://arechon-site.vercel.app";

/** Host only ("arechon-site.vercel.app") for display in the OG card. */
export const SITE_HOST = new URL(SITE_URL).host;

/**
 * Public source repository. The site links to it as the primary proof:
 * the agent definitions, the design spec and this page's own code all
 * live there. Requires the repository to be public on GitHub.
 */
export const REPO_URL = "https://github.com/abejin0515-oss/arechon-site";
