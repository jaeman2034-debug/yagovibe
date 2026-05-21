import type { MarketProduct } from "@/types/market";

export type MapQueryBounds = { north: number; south: number; east: number; west: number };

export function serializeMapBounds(b: MapQueryBounds): string {
  return `${b.north.toFixed(5)},${b.south.toFixed(5)},${b.east.toFixed(5)},${b.west.toFixed(5)}`;
}

export function parseMapBoundsParam(raw: string | null): MapQueryBounds | null {
  if (raw == null || raw === "") return null;
  const parts = raw.split(",").map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { north: parts[0], south: parts[1], east: parts[2], west: parts[3] };
}

function lngInBounds(lng: number, west: number, east: number): boolean {
  if (west <= east) return lng >= west && lng <= east;
  return lng >= west || lng <= east;
}

function productLatLng(p: MarketProduct): { lat: number; lng: number } | null {
  const latRaw = p.latitude ?? (p as { lat?: unknown }).lat;
  const lngRaw = p.longitude ?? (p as { lng?: unknown }).lng;
  const lat = typeof latRaw === "string" ? Number(String(latRaw).replace(/[^\d.-]/g, "")) : Number(latRaw);
  const lng = typeof lngRaw === "string" ? Number(String(lngRaw).replace(/[^\d.-]/g, "")) : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function marketProductInMapBounds(p: MarketProduct, b: MapQueryBounds): boolean {
  const pos = productLatLng(p);
  if (!pos) return false;
  if (pos.lat < b.south || pos.lat > b.north) return false;
  return lngInBounds(pos.lng, b.west, b.east);
}
