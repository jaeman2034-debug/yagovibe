/**
 * 🔥 Region Middleware - 지역 미들웨어
 * 
 * Week7 핵심: 모든 요청에 지역 컨텍스트 자동 주입
 */

import { Request, Response, NextFunction } from "express";

/**
 * 지역 정보를 요청 객체에 주입
 * 
 * 우선순위:
 * 1. URL 파라미터 (/r/:region)
 * 2. 쿼리 파라미터 (?region=seoul)
 * 3. 헤더 (x-region)
 * 4. 기본값 (seoul)
 */
export function regionMiddleware(
  req: Request & { region?: string },
  res: Response,
  next: NextFunction
): void {
  const region =
    (req.params.region as string) ||
    (req.query.region as string) ||
    (req.headers["x-region"] as string) ||
    "seoul";

  // 유효한 지역인지 검증
  const validRegions = [
    "seoul",
    "busan",
    "daegu",
    "incheon",
    "gwangju",
    "daejeon",
    "ulsan",
    "gyeonggi",
    "gangwon",
    "jeju",
  ];

  if (!validRegions.includes(region)) {
    req.region = "seoul"; // 기본값으로 폴백
  } else {
    req.region = region;
  }

  next();
}
