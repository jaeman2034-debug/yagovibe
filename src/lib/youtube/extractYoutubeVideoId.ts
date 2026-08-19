const YOUTUBE_ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{6,}$/;

function normalizeYoutubeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseIdFromPath(pathname: string): string | null {
  const embed = pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/i);
  if (embed?.[1] && VIDEO_ID_RE.test(embed[1])) return embed[1];

  const shorts = pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (shorts?.[1] && VIDEO_ID_RE.test(shorts[1])) return shorts[1];

  const live = pathname.match(/\/live\/([a-zA-Z0-9_-]+)/i);
  if (live?.[1] && VIDEO_ID_RE.test(live[1])) return live[1];

  return null;
}

/**
 * YouTube URL → videoId (API 키 없음).
 * watch, youtu.be, /embed/, /shorts/ 지원.
 */
export function extractYoutubeVideoId(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const normalized = normalizeYoutubeInput(raw);

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0]?.trim() ?? "";
      return VIDEO_ID_RE.test(id) ? id : null;
    }

    if (YOUTUBE_ALLOWED_HOSTS.has(host) || host.endsWith(".youtube.com")) {
      const fromQuery = parsed.searchParams.get("v")?.trim() ?? "";
      if (VIDEO_ID_RE.test(fromQuery)) return fromQuery;

      const fromPath = parseIdFromPath(parsed.pathname);
      if (fromPath) return fromPath;
    }
  } catch {
    // fall through to regex
  }

  const match = raw.match(
    /(?:v=|\/vi\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{6,})/i,
  );
  const id = match?.[1]?.trim() ?? "";
  return VIDEO_ID_RE.test(id) ? id : null;
}

export function youtubeThumbnailUrl(
  videoId: string,
  quality: "hqdefault" | "mqdefault" | "sddefault" = "hqdefault",
): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
}

export function youtubeEmbedUrl(videoId: string, origin?: string): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (origin) params.set("origin", origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}
