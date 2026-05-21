# 💬 30분 부스트 사용자 문구 모음

**목적**: 일관된 사용자 경험을 위한 표준 문구  
**사용 위치**: 게시물 등록, 카드, 알림 등

---

## 🎯 게시물 등록 완료 화면

### 부스트 적용 시

```tsx
<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
  <p className="text-sm font-medium text-orange-800">
    🚀 신상품 부스트가 적용되었습니다!
  </p>
  <p className="text-xs text-orange-600 mt-1">
    30분 동안 추천 피드 상단에 노출됩니다.
  </p>
</div>
```

**표시 조건**: `imageQuality >= 90`  
**표시 위치**: 게시물 등록 완료 화면

---

### 부스트 미적용 시 (이미지 품질 미달)

```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 신상품 부스트 미적용
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    이미지 품질이 90점 미만입니다. 더 선명한 사진을 올려주세요.
  </p>
</div>
```

**표시 조건**: `imageQuality < 90`  
**표시 위치**: 게시물 등록 완료 화면

---

### 부스트 미적용 시 (이미지 없음)

```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 신상품 부스트 미적용
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    이미지가 없어 부스트가 적용되지 않습니다. 최소 1장의 이미지를 업로드해주세요.
  </p>
</div>
```

**표시 조건**: `images.length === 0`  
**표시 위치**: 게시물 등록 완료 화면

---

## 🏷️ 게시물 카드 배지

### 부스트 활성 (채팅 없음)

```
신상품 부스트 • 25분 30초 남음
```

**표시 조건**: `boostActive === true && boostChatCount === 0`  
**표시 위치**: 게시물 카드 상단

---

### 부스트 활성 (채팅 발생)

```
신상품 부스트 • 20분 15초 남음 • 채팅 1회
```

**표시 조건**: `boostActive === true && boostChatCount > 0`  
**표시 위치**: 게시물 카드 상단

---

### 부스트 만료 (선택적)

```
부스트 종료
```

**표시 조건**: `boostActive === false && boostEndTime < now`  
**표시 위치**: 게시물 카드 상단 (선택적, 일반적으로 표시하지 않음)

---

## 📱 푸시 알림 (선택적)

### 부스트 적용 알림

```
제목: 신상품 부스트 적용됨
내용: 게시물이 30분 동안 추천 피드 상단에 노출됩니다.
```

**발송 조건**: 부스트 적용 시 (선택적)  
**발송 위치**: FCM 푸시 알림

---

## 🔔 인앱 알림 (선택적)

### 부스트 적용 알림

```json
{
  "type": "BOOST_APPLIED",
  "title": "신상품 부스트 적용됨",
  "body": "게시물이 30분 동안 추천 피드 상단에 노출됩니다.",
  "postId": "market_123"
}
```

**발송 조건**: 부스트 적용 시 (선택적)  
**발송 위치**: 인앱 알림 센터

---

## 📊 통계 화면 (관리자)

### 부스트 통계 카드

```tsx
<div className="p-4 bg-white rounded-lg shadow">
  <h3 className="text-lg font-semibold mb-2">30분 부스트 통계</h3>
  <div className="space-y-2">
    <p className="text-sm">
      활성 부스트: <span className="font-medium">{activeBoosts}</span>개
    </p>
    <p className="text-sm">
      24시간 채팅 발생률: <span className="font-medium">{chatRate}%</span>
    </p>
    <p className="text-sm">
      부스트 적용률: <span className="font-medium">{boostRate}%</span>
    </p>
  </div>
</div>
```

**표시 위치**: 관리자 대시보드

---

## 🎨 UI 컴포넌트 코드

### BoostBadge 컴포넌트

```tsx
import BoostBadge from "@/components/market/BoostBadge";

// 사용 예시
<BoostBadge
  boostActive={post.boostActive}
  boostEndTime={post.boostEndTime?.toDate()}
  boostChatCount={post.boostChatCount}
/>
```

---

### 게시물 등록 완료 화면 통합

```tsx
// EquipmentForm.tsx 또는 MatchForm.tsx에서
{imageQuality >= 90 ? (
  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
    <p className="text-sm font-medium text-orange-800">
      🚀 신상품 부스트가 적용되었습니다!
    </p>
    <p className="text-xs text-orange-600 mt-1">
      30분 동안 추천 피드 상단에 노출됩니다.
    </p>
  </div>
) : (
  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-sm font-medium text-yellow-800">
      ⚠️ 신상품 부스트 미적용
    </p>
    <p className="text-xs text-yellow-600 mt-1">
      이미지 품질이 90점 미만입니다. 더 선명한 사진을 올려주세요.
    </p>
  </div>
)}
```

---

## 📝 문구 변경 가이드

### 부스트 지속 시간 변경 시

```
30분 동안 → 60분 동안 (BOOST_DURATION_MS 변경 시)
```

---

### 부스트 가중치 변경 시

```
추천 피드 상단에 노출됩니다. → 추천 피드 상단에 강조 노출됩니다. (BOOST_WEIGHT 증가 시)
```

---

### 이미지 품질 임계값 변경 시

```
90점 미만 → 85점 미만 (MIN_IMAGE_QUALITY 변경 시)
```

---

**30분 부스트 사용자 문구 모음 완성**
