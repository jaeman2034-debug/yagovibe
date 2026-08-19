import { useEffect } from "react";
import {
  getProfileDescription,
  getSlogan,
  getTeamCoverPhotoUrl,
} from "@/lib/team/resolveTeamPublicProfile";
import { resolveTeamPublicUrlKey } from "@/lib/team/createTeamResultParse";

function ensureMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureCanonical(href: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Sprint 2-1 — document title + Open Graph for Team Public Home.
 * Mirrors FederationHomePage pattern (no react-helmet dependency).
 */
export function useTeamPublicSeo(opts: {
  team: Record<string, unknown> | null | undefined;
  teamId: string;
  enabled?: boolean;
}) {
  const { team, teamId, enabled = true } = opts;

  useEffect(() => {
    if (!enabled || !team || typeof window === "undefined") return;

    const teamName = String(team.name ?? "").trim() || "팀";
    const title = `${teamName} | 야고 팀`;
    const slogan = getSlogan(team).trim();
    const intro = getProfileDescription(team).trim();
    const description = (slogan || intro || "팀 소개와 일정을 확인해 보세요.")
      .replace(/\s+/g, " ")
      .slice(0, 140);

    const cover = getTeamCoverPhotoUrl(team);
    const logo = typeof team.logoUrl === "string" ? team.logoUrl.trim() : "";
    const imageRaw = cover || logo || "/icons/icon-maskable-512.png";
    const imageUrl = imageRaw.startsWith("http")
      ? imageRaw
      : `${window.location.origin}${imageRaw.startsWith("/") ? "" : "/"}${imageRaw}`;

    const slug = typeof team.slug === "string" ? team.slug.trim() : "";
    const urlKey = resolveTeamPublicUrlKey(teamId, slug || null);
    const canonicalUrl = `${window.location.origin}/team/${encodeURIComponent(urlKey)}/public`;

    document.title = title;
    ensureMeta("name", "description", description);
    ensureMeta("property", "og:type", "website");
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:description", description);
    ensureMeta("property", "og:image", imageUrl);
    ensureMeta("property", "og:url", canonicalUrl);
    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "twitter:title", title);
    ensureMeta("name", "twitter:description", description);
    ensureMeta("name", "twitter:image", imageUrl);
    ensureCanonical(canonicalUrl);
  }, [team, teamId, enabled]);
}
