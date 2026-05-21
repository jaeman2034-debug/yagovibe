# 🔧 빠른 수정 코드 스니펫

## 1. getAddressFromLatLng.ts - httpsCallable로 변경

**파일**: `src/utils/getAddressFromLatLng.ts`

**현재 코드** (16-77번 줄):
```typescript
async function getAddressFromLatLngViaFunctions(
  lat: number,
  lng: number
): Promise<AddressResult | null> {
  try {
    const { GEOCODE_LOCATION_ENDPOINT } = await import("@/config/env");
    const url = `${GEOCODE_LOCATION_ENDPOINT}?latitude=${lat}&longitude=${lng}`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    // ...
  }
}
```

**수정 후**:
```typescript
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

async function getAddressFromLatLngViaFunctions(
  lat: number,
  lng: number
): Promise<AddressResult | null> {
  try {
    // 🔥 region 강제 설정
    const functions = getFunctions(app, "asia-northeast3");
    const geocodeLocation = httpsCallable<{ latitude: number; longitude: number }, {
      success: boolean;
      locationText?: string;
      addressShort?: string;
      region1?: string;
      region2?: string;
      region3?: string;
      error?: string;
    }>(functions, "geocodeLocation");
    
    console.log("🌐 [Firebase Functions] Geocoding 호출 시도:", { lat, lng });
    
    const result = await geocodeLocation({ latitude: lat, longitude: lng });
    const data = result.data;
    
    console.log("📦 [Firebase Functions] 응답 데이터:", data);
    
    if (!data.success) {
      console.warn("⚠️ [Firebase Functions] Geocoding 실패:", data.error || data);
      return null;
    }
    
    // Firebase Functions 응답 형식: region1(시/도), region2(구/군), region3(동/읍/면)
    const si = data.region1 || "";
    const gu = data.region2 || "";
    const dong = data.region3 || "";
    
    const full = data.locationText || `${si} ${gu} ${dong}`.trim();
    const short = data.addressShort || dong || gu || si || "";
    
    console.log("✅ [Firebase Functions] 추출된 주소:", { si, gu, dong, short, full });
    
    return {
      full,
      short,
      si,
      gu,
      dong,
    };
  } catch (e) {
    console.error("❌ [Firebase Functions] Geocoding 예외 발생:", e);
    if (e instanceof Error) {
      console.error("   에러 메시지:", e.message);
      console.error("   스택:", e.stack);
    }
    return null;
  }
}
```

---

## 2. startActivity.ts - 주소 변환 실패 허용

**파일**: `src/features/activity/startActivity.ts`

**현재 코드** (83-94번 줄):
```typescript
console.log("🔍 [startActivity] 행정동 변환 중...");
const dong = await getAddressFromLatLngDetailed(
  finalLocation.lat,
  finalLocation.lng
);
console.log("✅ [startActivity] 행정동 변환 완료:", dong);
```

**수정 후**:
```typescript
console.log("🔍 [startActivity] 행정동 변환 중...");
let dong: string | null = null;
try {
  const addressResult = await getAddressFromLatLngDetailed(
    finalLocation.lat,
    finalLocation.lng
  );
  dong = addressResult?.dong || null;
  console.log("✅ [startActivity] 행정동 변환 완료:", dong);
} catch (error) {
  console.warn("⚠️ [startActivity] 행정동 변환 실패 (계속 진행):", error);
  // 주소 변환 실패해도 활동 시작은 계속 진행
  dong = null;
}

// 🔥 세션 생성 (주소 없어도 OK)
const sessionData: ActivitySession = {
  // ... 기타 필드
  dong: dong || null, // null 허용
};

// ... 세션 저장 로직

// 🔥 주소가 나중에 변환되면 비동기 업데이트
if (!dong) {
  getAddressFromLatLngDetailed(finalLocation.lat, finalLocation.lng)
    .then((addressResult) => {
      if (addressResult?.dong) {
        updateDoc(doc(db, "activitySessions", sessionId), {
          dong: addressResult.dong,
        }).catch((err) => {
          console.warn("⚠️ [startActivity] 주소 업데이트 실패 (무시):", err);
        });
      }
    })
    .catch(() => {
      // 실패해도 무시
    });
}
```

---

## 3. TeamCreateForm.tsx - teamId null 체크 강화

**파일**: `src/pages/team/TeamCreateForm.tsx`

**현재 코드** (134번 줄):
```typescript
const { teamId, success, message } = result.data;
```

**수정 후**:
```typescript
const { teamId, success, message } = result.data;

// 🔥 teamId null 체크 강화
if (!success || !teamId) {
  console.error("❌ [TeamCreateForm] teamId가 없습니다:", {
    success,
    teamId,
    message,
    fullResponse: result.data,
  });
  throw new Error(message || "팀 생성에 실패했습니다. teamId를 받지 못했습니다.");
}

// 🔥 teamId 타입 확인
if (typeof teamId !== "string" || teamId.trim() === "") {
  console.error("❌ [TeamCreateForm] teamId가 유효하지 않습니다:", teamId);
  throw new Error("팀 ID가 유효하지 않습니다.");
}

console.log("✅ [TeamCreateForm] 팀 생성 성공:", {
  teamId,
  teamIdType: typeof teamId,
  teamIdLength: teamId.length,
});
```

---

## 4. MapPickerModal.tsx - 추가 가드 강화 (선택사항)

**파일**: `src/components/schedule/MapPickerModal.tsx`

**현재 코드**는 이미 잘 되어 있지만, 추가 강화 가능:

```typescript
// reverseGeocode 함수 내부 (39번 줄)
const reverseGeocode = useCallback(async (lat: number, lng: number) => {
  // 🔥 Google Maps API 로드 확인 (더 명확하게)
  if (!window.google?.maps?.Geocoder) {
    console.error("❌ [MapPickerModal] Google Maps Geocoder가 로드되지 않았습니다.");
    setSelectedLocation({
      lat,
      lng,
      name: `위치 (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
    });
    return;
  }
  
  // ... 나머지 코드
}, []);
```

---

## ✅ 적용 순서

1. **getAddressFromLatLng.ts** - httpsCallable로 변경 (가장 중요)
2. **startActivity.ts** - 주소 변환 실패 허용
3. **TeamCreateForm.tsx** - teamId null 체크 강화
4. **MapPickerModal.tsx** - 추가 가드 (선택사항)

---

**작성일**: 2025-01-XX  
**버전**: v1.0
