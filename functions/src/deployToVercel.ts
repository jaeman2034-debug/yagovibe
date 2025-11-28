/**
 * 🚀 Vercel 배포 트리거 Cloud Function
 * 
 * 관리자 페이지에서 "배포하기" 버튼을 누르면 Vercel Deploy Hook을 호출하여 배포를 트리거합니다.
 * 
 * 보안:
 * - 관리자 인증 확인
 * - Deploy Hook URL은 환경 변수에 저장 (프론트엔드에 노출하지 않음)
 */

import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Firebase Admin 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Vercel Deploy Hook URL (환경 변수에서 가져오기)
 * 
 * 설정 방법:
 * firebase functions:config:set vercel.deploy_production="https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx"
 * firebase functions:config:set vercel.deploy_dev="https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy"
 */
const getDeployHooks = () => {
  const config = admin.apps[0]?.options as any;
  
  // 환경 변수에서 가져오기 (Vercel Deploy Hook URL)
  const productionHook = process.env.VERCEL_DEPLOY_PRODUCTION_HOOK || 
    config?.vercel?.deploy_production ||
    "";
  
  const devHook = process.env.VERCEL_DEPLOY_DEV_HOOK ||
    config?.vercel?.deploy_dev ||
    "";

  return {
    prod: productionHook,
    dev: devHook,
  };
};

/**
 * 관리자 권한 확인
 */
async function checkAdminAuth(uid: string | undefined): Promise<boolean> {
  if (!uid) {
    return false;
  }

  try {
    const user = await getAuth().getUser(uid);
    
    // Custom Claims에서 role 확인
    const role = user.customClaims?.role;
    if (role === "admin") {
      return true;
    }

    // Firestore users/{uid} 문서에서 role 확인 (fallback)
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    if (userData?.role === "admin") {
      return true;
    }

    return false;
  } catch (error) {
    logger.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

/**
 * Vercel Deploy Hook 호출
 */
async function triggerDeploy(hookUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Vercel 배포 요청 실패: ${response.status} ${errorText}`);
      throw new Error(`Vercel 배포 요청 실패: ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    
    logger.info("✅ Vercel 배포 트리거 성공", { hookUrl, response: data });
    
    return {
      success: true,
      message: "Vercel 배포가 시작되었습니다. 몇 분 후 배포가 완료됩니다.",
    };
  } catch (error: any) {
    logger.error("Vercel 배포 트리거 오류:", error);
    throw new Error(`배포 요청 중 오류 발생: ${error.message || "알 수 없는 오류"}`);
  }
}

/**
 * 배포 이력 Firestore에 저장
 */
async function saveDeployHistory(
  uid: string,
  target: string,
  success: boolean,
  message: string
): Promise<void> {
  try {
    await admin.firestore().collection("deployHistory").add({
      uid,
      target, // 'prod' or 'dev'
      success,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("배포 이력 저장 오류:", error);
    // 이력 저장 실패해도 배포는 계속 진행
  }
}

/**
 * 🚀 Vercel 배포 트리거 Cloud Function
 * 
 * 사용법:
 * const deployFn = httpsCallable(functions, "deployToVercel");
 * const result = await deployFn({ target: "prod" }); // 또는 "dev"
 */
export const deployToVercel = onCall(
  {
    cors: true,
    region: "asia-northeast3",
  },
  async (request) => {
    const { target } = request.data || {};
    const uid = request.auth?.uid;

    // 1) 인증 확인
    if (!uid) {
      throw new Error("로그인이 필요합니다.");
    }

    // 2) 관리자 권한 확인
    const isAdmin = await checkAdminAuth(uid);
    if (!isAdmin) {
      throw new Error("관리자만 배포할 수 있습니다.");
    }

    // 3) target 검증
    if (target !== "prod" && target !== "dev") {
      throw new Error('target은 "prod" 또는 "dev"여야 합니다.');
    }

    // 4) Deploy Hook URL 가져오기
    const hooks = getDeployHooks();
    const hookUrl = hooks[target as "prod" | "dev"];

    if (!hookUrl) {
      logger.error(`Deploy Hook URL이 설정되지 않았습니다: ${target}`);
      throw new Error(`${target === "prod" ? "Production" : "Preview"} 배포 Hook URL이 설정되지 않았습니다.`);
    }

    // 5) Vercel 배포 트리거
    try {
      const result = await triggerDeploy(hookUrl);
      
      // 6) 배포 이력 저장
      await saveDeployHistory(uid, target, true, result.message);
      
      return {
        success: true,
        message: result.message,
        target,
      };
    } catch (error: any) {
      // 배포 실패 이력 저장
      await saveDeployHistory(uid, target, false, error.message || "알 수 없는 오류");
      
      throw error;
    }
  }
);

