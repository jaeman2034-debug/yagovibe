# 🔥 시스템 공지 JSON 스키마 & 생성 트리거 스펙

## 📋 개요

대회 생성 시 자동으로 생성되는 시스템 공지의 JSON 스키마와 생성 트리거 명세입니다.

---

## 1️⃣ 트리거 명세

### Cloud Function: `onTournamentCreated`

**경로**: `functions/src/tournament/onTournamentCreated.ts`

**트리거 조건**:
- 문서 경로: `associations/{associationId}/tournaments/{tournamentId}`
- 트리거 타입: `onDocumentCreated`
- 리전: `asia-northeast3`

**실행 시점**:
- 대회 문서가 Firestore에 생성되는 즉시
- 클라이언트에서 `addDoc()` 완료 후 자동 실행

---

## 2️⃣ 입력 데이터 구조 (대회 문서)

### 실제 저장 필드 (TournamentEditDrawer.tsx 기준)

```typescript
{
  title: string;                    // 대회명 (필수)
  content: string;                  // 대회 내용
  venue: string;                    // 경기장
  dateStart: Timestamp;            // 대회 시작일 (필수)
  dateEnd: Timestamp;              // 대회 종료일 (필수)
  status: "upcoming" | "ongoing" | "ended";
  adminStatus: "draft" | "published";
  registrationPeriod?: {
    startDate: string;             // ISO string 또는 Timestamp
    endDate: string;               // ISO string 또는 Timestamp
  };
  rosterEditPeriod?: {
    startDate: string;
    endDate: string;
  };
  reviewPeriod?: {
    startDate: string;
    endDate: string;
  };
  drawDate?: {
    date: string | Timestamp;      // ISO string 또는 Timestamp
    isPublic: boolean;
  };
  tournamentType?: "OPEN" | "U" | "OVER";
  ageRule?: {
    type: "U" | "OVER" | "OPEN";
    maxBirthYear?: number;
    minBirthYear?: number;
    description: string;
  };
  createdBy: string;               // 생성자 UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 하위 호환성 필드 (타입 정의 기준)

```typescript
{
  name?: string;                   // title의 별칭
  startDate?: string;              // dateStart의 별칭
  endDate?: string;                // dateEnd의 별칭
}
```

---

## 3️⃣ 출력 데이터 구조 (시스템 공지 문서)

### JSON 스키마

```json
{
  "id": "auto-generated-doc-id",
  "title": "[대회 생성] {대회명}",
  "content": "대회 정보 자동 요약 (마크다운 형식)",
  "summary": "{대회명}가 공식 생성되었습니다.",
  "status": "published",
  "publishAt": "Timestamp",
  "publishedAt": "Timestamp",
  "visibleFrom": "Timestamp",
  "visibleUntil": "Timestamp | null",
  "isVisible": true,
  "isPinned": false,
  "label": "대회",
  "level": "normal",
  "isOfficial": true,
  "visibility": "public",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "createdBy": "SYSTEM",
  "isSystemGenerated": true,
  "systemEventType": "TOURNAMENT_CREATED",
  "relatedTournamentId": "tournament-id",
  "viewCount": 0,
  "clickCount": 0
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | string | `[대회 생성] {대회명}` 형식 |
| `content` | string | 마크다운 형식 대회 정보 요약 |
| `summary` | string | 한 줄 요약 (카드 표시용) |
| `status` | string | 항상 `"published"` |
| `isSystemGenerated` | boolean | 항상 `true` |
| `systemEventType` | string | `"TOURNAMENT_CREATED"` |
| `relatedTournamentId` | string | 연결된 대회 ID |
| `createdBy` | string | `"SYSTEM"` 또는 원본 `createdBy` |
| `visibleUntil` | Timestamp \| null | 대회 종료일 (없으면 영구 노출) |

---

## 4️⃣ 생성 트리거 플로우

### 단계별 실행 순서

```
1. 클라이언트: TournamentEditDrawer에서 대회 저장
   └─ addDoc(associations/{id}/tournaments/{id}, {...})
   
2. Firestore: 대회 문서 생성 완료
   
3. Cloud Function: onTournamentCreated 트리거 실행
   └─ 대회 데이터 읽기
   └─ 시스템 공지 데이터 생성
   └─ addDoc(associations/{id}/notices/{id}, {...})
   
4. Firestore: 시스템 공지 문서 생성 완료
   
5. 클라이언트: NoticeSection 자동 새로고침 (실시간 리스너)
   └─ 시스템 공지 표시
```

### 에러 처리

- Cloud Function 실행 실패 시:
  - 대회 생성은 성공 (이미 완료됨)
  - 시스템 공지 생성 실패는 로그에 기록
  - 대회 생성 자체는 롤백되지 않음

---

## 5️⃣ 생성되는 공지 내용 예시

### 제목
```
[대회 생성] 2026 노원구 구청장기 축구대회
```

### 본문 (마크다운)
```
2026 노원구 구청장기 축구대회가 2026년 1월 4일에 공식 생성되었습니다.

**대회 정보**
- 대회 기간: 2026년 3월 15일 ~ 3월 22일
- 참가 신청 기간: 1월 10일 ~ 2월 15일
- 선수 명단 수정 기간: 2월 16일 ~ 2월 28일
- 사무국 검수 기간: 3월 1일 ~ 3월 10일
- 조 추첨일: 3월 12일

**현재 상태**
- 참가 신청 예정

**대회 바로가기**
- [대회 상세 보기](/association/assoc-id/tournaments/tournament-id)

---
본 공지는 시스템에 의해 자동으로 생성되었습니다.
```

---

## 6️⃣ 데이터 안전 처리

### 필드명 호환성

- `title` 우선, 없으면 `name` 사용
- `dateStart` 우선, 없으면 `startDate` 사용
- `dateEnd` 우선, 없으면 `endDate` 사용

### 날짜 파싱 안전 처리

- Timestamp → Date 변환 시 `.toDate()` 우선
- 변환 실패 시 `new Date()` 시도
- 모든 변환 실패 시 "미정" 반환

### visibleUntil 설정

- `dateEnd`가 있으면 Timestamp로 변환
- 변환 실패 시 `null` (영구 노출)

---

## 7️⃣ 테스트 체크리스트

- [x] 대회 생성 시 시스템 공지 자동 생성
- [x] 시스템 공지 제목 형식 확인
- [x] 시스템 공지 내용 요약 확인
- [x] `isSystemGenerated: true` 확인
- [x] `systemEventType: "TOURNAMENT_CREATED"` 확인
- [x] `relatedTournamentId` 연결 확인
- [x] `visibleUntil` 설정 확인
- [ ] NoticeSection에 시스템 공지 표시 확인
- [ ] 시스템 공지에서 대회 바로가기 동작 확인

---

## 8️⃣ 배포 전 확인 사항

1. **Cloud Function 배포**
   ```bash
   firebase deploy --only functions:onTournamentCreated
   ```

2. **Firestore 인덱스 생성**
   - 공지 쿼리용 복합 인덱스 필요
   - 오류 메시지 링크 클릭하여 생성

3. **권한 확인**
   - `associations/{id}/notices` 쓰기 권한 (Functions는 Admin SDK 사용)
   - `associations/{id}/notices` 읽기 권한 (일반 사용자)

---

**이 스키마를 기준으로 실제 구현을 진행합니다.**

