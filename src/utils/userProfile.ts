/**
 * 🔥 전화번호 인증 후 유저 프로필 자동 생성/업데이트 (업서트)
 * 
 * SMS 인증 성공 시 Firestore에 사용자 프로필을 자동으로 생성합니다.
 * 중복 생성 방지 및 기본 필드 설정을 포함합니다.
 * 
 * 🔥 핵심: merge:true로 여러 번 호출돼도 안전 (idempotent)
 */

import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";
import { ensureInviteCode } from "@/lib/inviteCode";
import { assignOnboardingExperiment } from "@/lib/assignExperiment";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";

// 🔥 UserProfile 타입은 src/types/user.ts에서 정의
// 호환성을 위해 export 유지
export type { UserProfile } from "@/types/user";

/**
 * 🔥 전화번호 기반 사용자 프로필 생성/업데이트
 * 
 * 로그인 성공 = 회원 생성
 * 이게 "서비스"와 "프로토타입"의 차이다.
 * 
 * @param user - Firebase Auth User 객체
 * @returns 생성/업데이트된 프로필 데이터
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  
  // 🔥 핵심 수정: getDoc 실패해도 계속 진행 (권한 오류 무시)
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (readError: any) {
    // 권한 오류인 경우 문서가 없다고 가정하고 생성 진행
    if (readError?.code === "permission-denied") {
      console.warn("⚠️ [userProfile] users 문서 읽기 권한 오류, 문서 생성 시도:", user.uid);
      userSnap = null as any; // exists()가 false를 반환하도록
    } else {
      throw readError; // 다른 오류는 그대로 throw
    }
  }

  const phoneNumber = user.phoneNumber || null;
  const displayName = user.displayName || phoneNumber?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3") || "사용자";

  const baseProfile: Partial<UserProfile> = {
    uid: user.uid,
    phone: phoneNumber,
    phoneNumber: phoneNumber || undefined, // 호환성
    displayName,
    photoURL: user.photoURL || undefined,
    provider: "phone",
    role: "USER", // 🔥 v1: 대문자로 통일 (user → USER)
    status: "active", // 🔥 신규/기존 모두 active
    isProfileComplete: false, // 🔥 프로필 완성도 플래그 (온보딩 필요)
    onboardingCompleted: false, // 🔥 온보딩 미완료
    onboardingStep: 0, // 🔥 온보딩 시작 단계
    onboarding: {}, // 🔥 온보딩 입력 데이터
    aiProfile: true,
    updatedAt: serverTimestamp(),
  };

  if (!userSnap || !userSnap.exists()) {
    // 🔥 신규 유저: 프로필 생성 (회원 가입)
    const newProfile: UserProfile = {
      ...baseProfile,
      createdAt: serverTimestamp(),
    } as UserProfile;

    // 🔥 setDoc + merge: true로 안전하게 생성/업데이트
    await setDoc(userRef, cleanFirestoreData(newProfile), { merge: true });
    console.log("✅ 신규 전화번호 유저 생성 완료");

    // 🔥 초대 코드 생성 (비동기, 실패해도 프로필 생성은 완료)
    ensureInviteCode(user.uid).catch((error) => {
      console.warn("⚠️ [userProfile] 초대 코드 생성 실패 (무시):", error);
    });

    // 🔥 A/B 실험군 할당 (비동기, 실패해도 프로필 생성은 완료)
    assignOnboardingExperiment(user.uid).catch((error) => {
      console.warn("⚠️ [userProfile] 실험군 할당 실패 (무시):", error);
    });

    return newProfile as UserProfile;
  } else {
    // 🔥 기존 유저: 프로필 업데이트 (재로그인)
    const existingData = userSnap.data() as Partial<UserProfile>;
    const updatedProfile: Partial<UserProfile> = {
      ...existingData,
      ...baseProfile,
      // createdAt은 유지 (가입일 보존)
      createdAt: existingData.createdAt || serverTimestamp(),
      // status는 기존 값 유지 (suspended 등 상태 보존)
      status: existingData.status || "active",
      // isProfileComplete는 기존 값 유지 (온보딩 완료 여부 보존)
      isProfileComplete: existingData.isProfileComplete ?? false,
    };

    await setDoc(userRef, cleanFirestoreData(updatedProfile), { merge: true });
    console.log("🔁 [userProfile] 기존 유저 로그인 (프로필 업데이트):", {
      uid: user.uid,
      phone: phoneNumber,
      status: updatedProfile.status,
    });

    return updatedProfile as UserProfile;
  }
}

/**
 * 이메일 기반 사용자 프로필 생성/업데이트 (호환성)
 */
export async function ensureEmailUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  
  // 🔥 핵심 수정: getDoc 실패해도 계속 진행 (권한 오류 무시)
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (readError: any) {
    // 권한 오류인 경우 문서가 없다고 가정하고 생성 진행
    if (readError?.code === "permission-denied") {
      console.warn("⚠️ [userProfile] users 문서 읽기 권한 오류, 문서 생성 시도:", user.uid);
      userSnap = null as any; // exists()가 false를 반환하도록
    } else {
      throw readError; // 다른 오류는 그대로 throw
    }
  }

  const baseProfile: Partial<UserProfile> = {
    uid: user.uid,
    phone: null,
    email: user.email || undefined,
    displayName: user.displayName || user.email?.split("@")[0] || "사용자",
    photoURL: user.photoURL || undefined,
    provider: "email",
    role: "USER", // 🔥 v1: 대문자로 통일 (user → USER)
    status: "active", // 🔥 신규/기존 모두 active
    isProfileComplete: false, // 🔥 프로필 완성도 플래그 (온보딩 필요)
    onboardingCompleted: false, // 🔥 온보딩 미완료
    onboardingStep: 0, // 🔥 온보딩 시작 단계
    onboarding: {}, // 🔥 온보딩 입력 데이터
    aiProfile: true,
    updatedAt: serverTimestamp(),
  };

  if (!userSnap || !userSnap.exists()) {
    const newProfile: UserProfile = {
      ...baseProfile,
      createdAt: serverTimestamp(),
    } as UserProfile;

    // 🔥 setDoc + merge: true로 안전하게 생성/업데이트
    await setDoc(userRef, cleanFirestoreData(newProfile), { merge: true });
    console.log("✅ [userProfile] 신규 이메일 유저 프로필 생성:", user.uid);
    return newProfile as UserProfile;
  } else {
    // 🔥 기존 유저: 프로필 업데이트 (재로그인)
    const existingData = userSnap.data() as Partial<UserProfile>;
    const updatedProfile: Partial<UserProfile> = {
      ...existingData,
      ...baseProfile,
      // createdAt은 유지 (가입일 보존)
      createdAt: existingData.createdAt || serverTimestamp(),
      // status는 기존 값 유지 (suspended 등 상태 보존)
      status: existingData.status || "active",
      // isProfileComplete는 기존 값 유지 (온보딩 완료 여부 보존)
      isProfileComplete: existingData.isProfileComplete ?? false,
      // onboardingCompleted는 기존 값 유지 (온보딩 완료 여부 보존)
      onboardingCompleted: existingData.onboardingCompleted ?? false,
      // onboardingStep은 기존 값 유지 (진행 중인 단계 보존)
      onboardingStep: existingData.onboardingStep ?? 0,
    };

    await setDoc(userRef, cleanFirestoreData(updatedProfile), { merge: true });
    console.log("✅ [userProfile] 기존 이메일 유저 프로필 업데이트:", user.uid);
    return updatedProfile as UserProfile;
  }
}
