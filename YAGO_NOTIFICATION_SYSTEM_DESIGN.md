# 🔔 YAGO 알림 시스템 설계 문서

## 📊 현재 상태 진단

### ✅ 이미 구현된 것
1. **기본 인프라**
   - Firebase Firestore `notifications` 컬렉션
   - FCM 토큰 등록 (`registerFcmToken`)
   - 알림 페이지 (`/notifications`)
   - 읽음 처리 (`markNotificationAsRead`)
   - 미읽음 개수 조회 (`useUnreadNotificationCount`)

2. **현재 알림 타입** (팀/협회 중심)
   - `TEAM_JOIN_APPROVED`
   - `TEAM_JOIN_REJECTED`
   - `TEAM_CAPTAIN_DELEGATED`
   - `ASSOCIATION_JOINED`
   - `TOURNAMENT_APPLIED`
   - 등등...

3. **서버 측**
   - Firebase Functions에서 FCM 발송 (`sendUserNotification`)
   - 채팅 메시지 알림 (`notifyNewMessage`)

### ❌ 부족한 것
1. **채팅/거래 도메인 알림 타입 없음**
2. **딥링크 구조 미정의** (`target.screen` 개념 없음)
3. **우선순위 시스템 없음** (`priority` 필드 없음)
4. **알림 생성 유틸리티 없음** (각 파일에서 직접 생성)
5. **실시간 업데이트 제한적** (30초 폴링)

---

## 🎯 제안: YAGO 전용 알림 시스템 설계

### 1. 알림 타입 확장

```typescript
// src/types/notification.ts

export type NotificationType =
  // 기존 (팀/협회)
  | "TEAM_JOIN_APPROVED"
  | "TEAM_JOIN_REJECTED"
  | "TEAM_CAPTAIN_DELEGATED"
  | "ASSOCIATION_JOINED"
  | "TOURNAMENT_APPLIED"
  | "TOURNAMENT_APPROVED"
  | "TOURNAMENT_REJECTED"
  
  // 🔥 신규: 채팅 도메인
  | "CHAT_MESSAGE"              // 새 메시지
  | "CHAT_LOCATION_SHARED"      // 위치 공유
  | "CHAT_VOICE_SUMMARY"        // 음성 요약 완료
  
  // 🔥 신규: 거래 도메인
  | "TRADE_PRICE_OFFER"         // 가격 제안
  | "TRADE_RESERVED"            // 예약됨
  | "TRADE_COMPLETED"           // 거래 완료
  | "TRADE_CANCELLED"           // 거래 취소
  
  // 🔥 신규: 안전 도메인
  | "SAFETY_REPORT_RESULT"      // 신고 결과
  | "SAFETY_WARNING"            // 비매너 경고
  | "SAFETY_FRAUD_ALERT"        // 사기 의심
  
  // 🔥 신규: 시스템 도메인
  | "SYSTEM_POLICY_UPDATE"      // 정책 업데이트
  | "SYSTEM_VERIFICATION"       // 인증 요청
  | "SYSTEM_NOTICE";            // 공지사항
```

### 2. 데이터 모델 확장

```typescript
// src/types/notification.ts

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // 🔥 딥링크 구조
  target: {
    screen: 'chat' | 'item' | 'trade' | 'profile' | 'team' | 'tournament' | 'home';
    id?: string; // chatRoomId, productId, tradeId 등
    params?: Record<string, string>; // 추가 파라미터
  };
  
  // 🔥 우선순위
  priority: 'high' | 'normal' | 'low';
  
  // 기존
  link?: string; // 하위 호환성 (deprecated)
  isRead: boolean;
  createdAt: any; // Timestamp
  
  // 🔥 페이로드 (타입별 추가 데이터)
  payload?: {
    chatRoomId?: string;
    productId?: string;
    tradeId?: string;
    senderId?: string;
    [key: string]: any;
  };
}
```

### 3. 알림 생성 유틸리티

```typescript
// src/lib/notifications/createNotification.ts

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  target: Notification['target'];
  priority?: 'high' | 'normal' | 'low';
  payload?: Record<string, any>;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<string> {
  const notificationRef = collection(db, "notifications");
  
  const notification: Omit<Notification, 'id'> = {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    target: params.target,
    priority: params.priority || 'normal',
    isRead: false,
    createdAt: serverTimestamp(),
    ...(params.payload && { payload: params.payload }),
  };
  
  const docRef = await addDoc(notificationRef, notification);
  
  console.log(`✅ [createNotification] 알림 생성: ${docRef.id}`, {
    type: params.type,
    userId: params.userId,
  });
  
  return docRef.id;
}
```

### 4. 딥링크 라우팅

```typescript
// src/lib/notifications/navigateFromNotification.ts

import { NavigateFunction } from "react-router-dom";
import type { Notification } from "@/types/notification";

export function navigateFromNotification(
  notification: Notification,
  navigate: NavigateFunction
): void {
  const { target } = notification;
  
  switch (target.screen) {
    case 'chat':
      if (target.id) {
        navigate(`/app/chat/${target.id}`);
      } else {
        navigate('/app/chat');
      }
      break;
      
    case 'item':
      if (target.id) {
        navigate(`/app/market/${target.id}`);
      } else {
        navigate('/app/market');
      }
      break;
      
    case 'trade':
      if (target.id) {
        navigate(`/app/trade/${target.id}`);
      } else {
        navigate('/app/market');
      }
      break;
      
    case 'profile':
      navigate('/me');
      break;
      
    case 'team':
      if (target.id) {
        navigate(`/teams/${target.id}`);
      } else {
        navigate('/me');
      }
      break;
      
    case 'tournament':
      if (target.id) {
        navigate(`/tournaments/${target.id}`);
      } else {
        navigate('/sports-hub');
      }
      break;
      
    case 'home':
    default:
      navigate('/home');
      break;
  }
}
```

---

## 🚀 실행 플랜

### Phase 1: MVP (오늘 가능)
1. ✅ 알림 타입 확장
2. ✅ 데이터 모델 확장
3. ✅ 알림 생성 유틸리티
4. ✅ 딥링크 라우팅
5. ✅ 채팅 메시지 알림 연동

### Phase 2: 거래 도메인
1. 가격 제안 알림
2. 예약 알림
3. 거래 완료 알림

### Phase 3: 안전 + 마케팅
1. 신고 결과 알림
2. 공지사항 알림

---

## 📋 다음 단계

사용자 질문에 답변 후:
1. 알림 타입 확장 코드 작성
2. 알림 생성 유틸리티 구현
3. 딥링크 라우팅 구현
4. 채팅 메시지 알림 연동
5. 실시간 업데이트 (onSnapshot)
