import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

let cached: Bucket | null = null;

/** 모듈 로드 시점이 아니라 첫 사용 시 Storage 기본 버킷을 연결합니다(배포·로컬 코드 로드 시 예외 방지). */
export function getDefaultStorageBucket(): Bucket {
  if (!cached) {
    cached = getStorage().bucket();
  }
  return cached;
}
