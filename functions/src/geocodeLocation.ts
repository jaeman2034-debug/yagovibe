/**
 * 🔥 Geocoding API Cloud Function
 * 
 * 좌표(latitude, longitude)를 행정동 주소로 변환
 * 
 * - Geocoding Server Key 사용 (프론트엔드 노출 금지)
 * - Google Maps Geocoding API 호출
 * - 행정동 추출 및 반환
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { parseAddressComponents, type ParsedAddress } from "./utils/parseAddressComponents";

/**
 * Geocoding API 엔드포인트
 * 
 * @param req - HTTP 요청
 *   - query.latitude: 위도 (number)
 *   - query.longitude: 경도 (number)
 * 
 * @param res - HTTP 응답
 *   - 200: 성공
 *     {
 *       success: true,
 *       locationText: "서울특별시 노원구 상계동",
 *       addressShort: "상계동",
 *       region1: "서울특별시",
 *       region2: "노원구",
 *       region3: "상계동"
 *     }
 *   - 400: 잘못된 요청 (lat/lng 누락)
 *   - 500: 서버 오류
 */
export const geocodeLocation = onRequest(
  {
    region: "asia-northeast3",
    maxInstances: 10,
    cors: true, // CORS 허용
    secrets: ["GOOGLE_GEOCODING_API_KEY"], // 🔥 Secret Manager에서 API 키 가져오기
  },
  async (req, res) => {
    // 🔥 CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // 🔥 요청 파라미터 검증
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        logger.warn("❌ [geocodeLocation] Invalid lat/lng:", {
          latitude: req.query.latitude,
          longitude: req.query.longitude,
        });
        res.status(400).json({
          success: false,
          error: "latitude와 longitude가 필요합니다.",
        });
        return;
      }

      // 🔥 좌표 범위 검증
      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        logger.warn("❌ [geocodeLocation] Out of range:", {
          latitude,
          longitude,
        });
        res.status(400).json({
          success: false,
          error: "유효하지 않은 좌표 범위입니다.",
        });
        return;
      }

      // 🔥 Geocoding Server Key (환경 변수에서 가져오기)
      // Firebase Functions Secrets 사용 권장
      const geocodingApiKey =
        process.env.GOOGLE_GEOCODING_API_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        "";

      if (!geocodingApiKey) {
        logger.error("❌ [geocodeLocation] API Key not found");
        res.status(500).json({
          success: false,
          error: "Geocoding API 키가 설정되지 않았습니다.",
        });
        return;
      }

      // 🔥 Google Maps Geocoding API 호출
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${geocodingApiKey}&language=ko`;

      logger.info("🔍 [geocodeLocation] Calling Geocoding API:", {
        latitude,
        longitude,
      });

      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = (await geocodeResponse.json()) as {
        status: string;
        error_message?: string;
        results?: Array<{
          address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
          formatted_address?: string;
        }>;
      };

      // 🔥 API 응답 검증
      if (geocodeData.status !== "OK") {
        logger.warn("❌ [geocodeLocation] Geocoding API error:", {
          status: geocodeData.status,
          error_message: geocodeData.error_message,
        });
        res.status(500).json({
          success: false,
          error: geocodeData.error_message || "Geocoding API 오류",
          status: geocodeData.status,
        });
        return;
      }

      // 🔥 결과가 없으면 오류
      if (!geocodeData.results || geocodeData.results.length === 0) {
        logger.warn("❌ [geocodeLocation] No results:", {
          latitude,
          longitude,
        });
        res.status(404).json({
          success: false,
          error: "주소를 찾을 수 없습니다.",
        });
        return;
      }

      // 🔥 첫 번째 결과에서 address_components 추출
      const firstResult = geocodeData.results[0];
      const components = firstResult.address_components || [];

      // 🔥 행정동 파싱
      const parsed: ParsedAddress = parseAddressComponents(components);

      // 🔥 결과 반환
      if (parsed.locationText) {
        logger.info("✅ [geocodeLocation] Success:", {
          latitude,
          longitude,
          locationText: parsed.locationText,
        });

        res.status(200).json({
          success: true,
          locationText: parsed.locationText,
          addressShort: parsed.addressShort,
          region1: parsed.region1,
          region2: parsed.region2,
          region3: parsed.region3,
        });
      } else {
        // 🔥 파싱 실패 시 formatted_address 사용
        logger.warn("⚠️ [geocodeLocation] Parsing failed, using formatted_address:", {
          latitude,
          longitude,
          formatted_address: firstResult.formatted_address,
        });

        res.status(200).json({
          success: true,
          locationText: firstResult.formatted_address || null,
          addressShort: null,
          region1: null,
          region2: null,
          region3: null,
        });
      }
    } catch (error: any) {
      logger.error("❌ [geocodeLocation] Unexpected error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "서버 오류가 발생했습니다.",
      });
    }
  }
);

