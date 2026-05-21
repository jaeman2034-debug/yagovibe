/**
 * 🔥 startActivity - Presence Engine Entry Point
 * 
 * 역할:
 * - YAGO의 "존재 선언 API"
 * - 사용자 상태 전환: IDLE → ACTIVE
 * - 세션 생성 + Firestore 저장
 * - ActivityFeed 노출 시작
 * 
 * 이 함수 하나로:
 * ✔ 사용자 활동 상태 생성
 * ✔ Firestore 세션 생성
 * ✔ ActivityFeed 노출 가능
 * ✔ 지도 표시 가능
 * ✔ 매칭 가능
 * 
 * 즉: YAGO LIVE MODE ON
 */

import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCurrentPosition } from "@/services/LocationService";
import { getAddressFromLatLngDetailed, type AddressResult } from "@/utils/getAddressFromLatLng";
import { cleanFirestoreData, emptyStringToNull } from "@/utils/firestoreHelpers";
import type { SportId } from "@/constants/sports";

/**
 * 🔥 startActivity - 활동 시작 엔진
 * 
 * 실행 파이프라인:
 * 1. 위치 확보
 * 2. 행정동 변환
 * 3. 세션 생성
 * 4. Firestore 저장
 * 5. 사용자 상태 업데이트
 * 
 * @param params
 * @param params.userId 사용자 ID
 * @param params.sport 스포츠 종목
 * @param params.location 위치 정보 (선택, 없으면 GPS 사용)
 * @returns 생성된 세션 ID
 */
export async function startActivity({
  userId,
  sport,
  location,
}: {
  userId: string;
  sport: SportId;
  location?: { lat: number; lng: number };
}): Promise<string> {
  console.log("🔥 [startActivity] Presence Engine 시작:", { userId, sport, location });

  // 🔥 입력 파라미터 검증 로그
  if (!userId) {
    throw new Error("userId가 필요합니다.");
  }
  if (!sport) {
    throw new Error("sport가 필요합니다.");
  }

  try {
    // 🔥 1️⃣ 위치 확보
    let finalLocation = location;
    if (!finalLocation) {
      console.log("📍 [startActivity] GPS 위치 가져오기...");
      finalLocation = await getCurrentPosition();
    }

    if (!finalLocation) {
      throw new Error("위치 정보를 가져올 수 없습니다.");
    }

    console.log("✅ [startActivity] 위치 확보 완료:", finalLocation);

    // 🔥 2️⃣ 행정동 변환 (실패해도 계속 진행)
    console.log("🔍 [startActivity] 행정동 변환 중...");
    let addressInfo: AddressResult | null = null;
    try {
      addressInfo = await getAddressFromLatLngDetailed(
        finalLocation.lat,
        finalLocation.lng
      );
    } catch (error) {
      console.warn("⚠️ [startActivity] 행정동 변환 실패 (계속 진행):", error);
      // 주소 변환 실패해도 활동 시작은 계속 진행
      addressInfo = null;
    }

    const dong = addressInfo?.dong || addressInfo?.short || null;
    if (dong) {
      console.log("✅ [startActivity] 행정동 변환 완료:", dong);
    } else {
      console.warn("⚠️ [startActivity] 행정동 변환 실패, 주소 없이 진행");
    }

    // 🔥 3️⃣ 세션 객체 생성 (Rules 요구 필드만 포함)
    // 🔥 Rules 검증: uid, status, sport, location, startedAt
    const session = {
      uid: userId, // 🔥 Firebase 표준: uid 필드 사용 (Rules 필수)
      sport, // 🔥 Rules 필수: sport is string
      status: "active", // 🔥 Rules 필수: status == "active"
      startedAt: serverTimestamp(), // 🔥 Rules 필수: startedAt is timestamp
      createdAt: serverTimestamp(), // 🔥 메타데이터 (Rules에서 명시적 검증 없지만 포함)
      updatedAt: serverTimestamp(), // 🔥 메타데이터
      location: {
        lat: finalLocation.lat,
        lng: finalLocation.lng,
        dong, // location.dong (Rules: location is map)
        gu: addressInfo ? emptyStringToNull(addressInfo.gu) : null, // undefined/빈 문자열 → null
        si: addressInfo ? emptyStringToNull(addressInfo.si) : null, // undefined/빈 문자열 → null
      },
      participants: [userId], // 🔥 참여자 목록 (Rules에서 명시적 검증 없지만 포함)
      visibilityRadius: 1500, // 🔥 가시성 반경 (Rules에서 명시적 검증 없지만 포함)
      // 🔥 dong 필드는 location.dong으로만 사용 (중복 제거)
    };

    console.log("💾 [startActivity] 세션 객체 생성 완료:", {
      userId,
      sport,
      dong,
      location: session.location,
      status: session.status,
    });

    // 🔥 4️⃣ Firestore 저장 - sessions 컬렉션
    console.log("📝 [startActivity] Firestore에 세션 저장 시도...");
    
    // 🔥 undefined 필드 제거 (Firestore는 undefined 허용 안 함)
    const cleanedSession = cleanFirestoreData(session);
    
    // 🔥 Firestore Rules 디버깅: 실제 저장 데이터 확인 (디버그 필드 제외)
    console.log("🔍 [startActivity] SESSION WRITE DATA:", {
      uid: cleanedSession.uid,
      sport: cleanedSession.sport,
      status: cleanedSession.status,
      location: cleanedSession.location,
      hasStartedAt: !!cleanedSession.startedAt,
      hasCreatedAt: !!cleanedSession.createdAt,
      hasUpdatedAt: !!cleanedSession.updatedAt,
      keys: Object.keys(cleanedSession), // 🔥 실제 저장되는 키 목록만 확인
    });
    
    // 🔥 Auth 상태 확인
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    console.log("🔍 [startActivity] AUTH UID:", auth.currentUser?.uid);
    console.log("🔍 [startActivity] AUTH STATE:", {
      isAuthenticated: !!auth.currentUser,
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    });
    
    let sessionRef;
    let sessionId: string;
    
    try {
      sessionRef = await addDoc(collection(db, "sessions"), cleanedSession);
      sessionId = sessionRef.id;
      console.log("✅ [startActivity] 세션 저장 완료:", sessionId);
    } catch (writeError: any) {
      console.error("❌ [startActivity] Firestore 세션 저장 실패:", {
        code: writeError.code,
        message: writeError.message,
        stack: writeError.stack,
        name: writeError.name,
      });
      throw writeError;
    }

    // 🔥 5️⃣ ActivityFeed 엔트리 생성 (검색용 캐시)
    const feedEntry = {
      id: sessionId, // sessionId를 id로도 저장
      sessionId,
      uid: userId, // 🔥 Firebase 표준: uid 필드 사용
      type: "sport_start",
      sport,
      dong: dong || null,
      gu: addressInfo ? emptyStringToNull(addressInfo.gu) : null, // undefined/빈 문자열 → null
      si: addressInfo ? emptyStringToNull(addressInfo.si) : null, // undefined/빈 문자열 → null
      location: {
        lat: finalLocation.lat,
        lng: finalLocation.lng,
      },
      status: "active",
      createdAt: serverTimestamp(),
    };

    try {
      // 🔥 undefined 필드 제거
      const cleanedFeedEntry = cleanFirestoreData(feedEntry);
      await addDoc(collection(db, "activityFeed"), cleanedFeedEntry);
      console.log("✅ [startActivity] ActivityFeed 엔트리 생성 완료");
    } catch (feedError: any) {
      console.error("❌ [startActivity] ActivityFeed 저장 실패:", {
        code: feedError.code,
        message: feedError.message,
      });
      // ActivityFeed 실패는 치명적이지 않으므로 계속 진행
    }

    // 🔥 6️⃣ 사용자 상태 업데이트
    try {
      await updateDoc(doc(db, "users", userId), {
        currentSessionId: sessionId,
        status: "active",
        lastDong: dong || null,
        updatedAt: serverTimestamp(),
      });
      console.log("✅ [startActivity] 사용자 상태 업데이트 완료");
    } catch (userError: any) {
      console.error("❌ [startActivity] 사용자 상태 업데이트 실패:", {
        code: userError.code,
        message: userError.message,
      });
      // 사용자 업데이트 실패는 치명적이지 않으므로 계속 진행
    }

    console.log("🎉 [startActivity] YAGO LIVE MODE ON:", sessionId);
    
    // 🔥 주소가 나중에 변환되면 비동기 업데이트
    if (!dong && addressInfo === null) {
      getAddressFromLatLngDetailed(finalLocation.lat, finalLocation.lng)
        .then((updatedAddressInfo) => {
          if (updatedAddressInfo?.dong) {
            const updateData: any = {
              "location.dong": updatedAddressInfo.dong,
            };
            if (updatedAddressInfo.gu) {
              updateData["location.gu"] = updatedAddressInfo.gu;
            }
            if (updatedAddressInfo.si) {
              updateData["location.si"] = updatedAddressInfo.si;
            }
            
            updateDoc(doc(db, "sessions", sessionId), updateData)
              .then(() => {
                console.log("✅ [startActivity] 주소 비동기 업데이트 완료:", updatedAddressInfo.dong);
                
                // 사용자 상태도 업데이트
                updateDoc(doc(db, "users", userId), {
                  lastDong: updatedAddressInfo.dong,
                }).catch(() => {
                  // 실패해도 무시
                });
              })
              .catch((err) => {
                console.warn("⚠️ [startActivity] 주소 업데이트 실패 (무시):", err);
              });
          }
        })
        .catch(() => {
          // 실패해도 무시
        });
    }
    
    return sessionId;
  } catch (err: any) {
    console.error("❌ [startActivity] 오류 발생:", {
      error: err,
      code: err.code,
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    
    // 🔥 Firestore 권한 오류인 경우 더 명확한 메시지
    if (err.code === "permission-denied") {
      throw new Error("Firestore 권한이 없습니다. Firestore Rules를 확인해주세요.");
    }
    
    throw new Error(`활동 시작 실패: ${err.message || "알 수 없는 오류"}`);
  }
}
