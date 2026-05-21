/**
 * 📍 Places Search Service
 * 외부 Places API 통합 (Google / Kakao / Naver)
 */

import * as logger from "firebase-functions/logger";
import type { Place } from "./types";
import { PLACES_MAX_RETRIES } from "../config/cost";
import { PLACES_TIMEOUT_MS } from "../config/places";
import { retryWithBackoff } from "../utils/retry";
import { withTimeout } from "../utils/timeout";

/**
 * Google Places 검색
 */
export async function searchGooglePlaces(query: string): Promise<Place[]> {
  const apiKey = process.env.GMAPS_API_KEY;
  if (!apiKey) {
    logger.warn("⚠️ GMAPS_API_KEY not set, skipping Places search");
    return [];
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(query)}` +
      `&language=ko` +
      `&region=kr` +
      `&key=${apiKey}`;

    // Rate Limit 재시도 + 타임아웃
    const res = await withTimeout(
      retryWithBackoff(
        async () => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Places API error: ${response.status}`);
          }
          return response;
        },
        {
          maxRetries: PLACES_MAX_RETRIES,
          baseDelayMs: 500, // Latency 최적화: 1000ms → 500ms
          maxDelayMs: 2000, // Latency 최적화: 5000ms → 2000ms
          shouldRetry: (error: any) => {
            // 429 (Rate Limit) 또는 503 (Service Unavailable)만 재시도
            const status = error?.status || error?.response?.status;
            return status === 429 || status === 503;
          },
        }
      ),
      PLACES_TIMEOUT_MS,
      'Places API timeout'
    );

    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      results?: any[];
    };

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      logger.error("❌ Places API 오류:", json.status, json.error_message);
      return [];
    }

    return (json.results || []).slice(0, 5).map((p: any) => ({
      name: p.name,
      address: p.formatted_address || p.vicinity || "",
      rating: p.rating ?? 0,
      openNow: p.opening_hours?.open_now ?? null,
      lat: p.geometry?.location?.lat || 0,
      lng: p.geometry?.location?.lng || 0,
      placeId: p.place_id || null,
    }));
  } catch (error: any) {
    logger.error("❌ Places 검색 오류:", error);
    return [];
  }
}
