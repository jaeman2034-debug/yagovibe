/**
 * 🔥 createTeam 전용 배포 파일
 * 
 * 목적: createTeam 함수만 별도 배포하여 타임아웃 방지
 * 
 * 사용법:
 * firebase deploy --only functions:createTeam
 */

// 🔥 Firebase Admin 초기화 (지연 초기화)
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 🔥 팀 생성 Callable 함수만 export
export { createTeam } from "./createTeam";
