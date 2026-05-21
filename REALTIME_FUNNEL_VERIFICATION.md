# 🔥 실시간 퍼널 검증 가이드

## ✅ 인덱스 생성 완료 확인

다음 인덱스가 생성되었는지 확인:

### 1. eventLogs 인덱스
- `createdAt` (ASC)
- `eventName` (ASC)
- `__name__` (자동)

### 2. activityLogs 인덱스
- `createdAt` (ASC)
- `event` (ASC)
- `__name__` (자동)

---

## 🧪 실시간 동작 검증 체크리스트

### STEP 1: 브라우저 콘솔 확인

1. **Admin Dashboard 접속**
   - `http://localhost:5173/admin/dashboard`

2. **개발자 도구 열기** (F12)

3. **콘솔 탭 확인**

   ✅ 정상 동작 시:
   ```
   ✅ [FunnelPanel] 실시간 업데이트: {
     sportSelected: 5,
     storyImpressions: 10,
     storyClicks: 3,
     activationViews: 2,
     teamJoins: 1,
     ctr: "11.1%"
   }
   ```

   ❌ 에러 발생 시:
   ```
   ❌ [FunnelPanel] ActivityLog 구독 실패: ...
   ❌ [FunnelPanel] EventLog 구독 실패: ...
   FirebaseError: The query requires an index
   ```

---

### STEP 2: 실시간 업데이트 테스트

#### 테스트 시나리오

1. **유저 창 준비**
   - 새 브라우저 창 또는 시크릿 모드
   - `http://localhost:5173` 접속

2. **관리자 창 준비**
   - 기존 브라우저 창
   - `http://localhost:5173/admin/dashboard` 접속
   - FunnelPanel 확인

3. **유저 행동 수행** (유저 창에서)

   **액션 1: 종목 선택**
   - 스포츠 종목 클릭 (축구, 배드민턴 등)
   - 예상: `step1_sportSelected` +1

   **액션 2: 스토리 클릭**
   - 스토리존의 스토리 카드 클릭
   - 예상: `step3_storyClick` +1

   **액션 3: 팀 조회**
   - 팀 찾기 → 팀 상세 페이지 진입
   - 예상: `step4_activationViews` +1

4. **관리자 창 확인** (1~2초 내)

   ✅ 정상 동작:
   - 숫자가 즉시 업데이트됨
   - CTR, 활성화율 자동 재계산
   - "실시간 구독 중" 표시 (녹색 점)

   ❌ 문제 발생:
   - 숫자가 변하지 않음
   - "연결 끊김" 표시 (빨간색 점)
   - 콘솔에 에러 메시지

---

### STEP 3: 연결 상태 확인

FunnelPanel 하단에 연결 상태 표시:

- 🟢 **실시간 구독 중** (녹색 점)
  - 정상 동작 중

- 🟠 **연결 중...** (주황색 점)
  - 초기 연결 중 또는 재연결 시도 중

- 🔴 **연결 끊김** (빨간색 점)
  - 연결 실패 또는 재연결 시도 초과

---

## 🔍 문제 해결

### 문제 1: "The query requires an index" 에러

**원인:**
- 인덱스가 아직 생성 중이거나 누락됨

**해결:**
1. Firebase Console → Firestore → Indexes 확인
2. 인덱스 상태가 "사용 가능"인지 확인
3. 인덱스 생성 중이면 대기 (1~3분)

---

### 문제 2: 숫자가 업데이트되지 않음

**원인:**
- Firestore에 데이터가 저장되지 않음
- Firebase Admin SDK 인증 실패

**해결:**
1. BFF 서버 콘솔 확인:
   ```
   ✅ [Firestore Admin] 초기화 완료
   ```
   이 메시지가 없으면 인증 설정 필요

2. BFF 서버 콘솔에서 로그 확인:
   ```
   [ACTIVITY_LOG_BULK] ✅ Saved X/Y events to Prisma, Z/Y to Firestore
   ```
   Firestore 저장 수가 0이면 dual write 실패

3. Firebase Admin SDK 인증 설정:
   - `server/FIREBASE_ADMIN_SETUP.md` 참고

---

### 문제 3: "연결 끊김" 표시

**원인:**
- Firestore 권한 문제
- 네트워크 문제

**해결:**
1. Firestore Rules 확인:
   ```javascript
   match /activityLogs/{logId} {
     allow read: if request.auth != null && 
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
   }
   ```

2. Admin 권한 확인:
   - Firebase Console → Firestore → users/{uid}
   - `role: "ADMIN"` 확인

3. 브라우저 콘솔에서 에러 메시지 확인

---

## 📊 예상 동작

### 초기 로드 시

```
[FunnelPanel] 실시간 업데이트: {
  sportSelected: 0,
  storyImpressions: 0,
  storyClicks: 0,
  activationViews: 0,
  teamJoins: 0,
  ctr: "0.0%"
}
```

### 유저 행동 후 (1~2초 내)

```
[FunnelPanel] 실시간 업데이트: {
  sportSelected: 1,  // +1
  storyImpressions: 2,  // +2
  storyClicks: 1,  // +1
  activationViews: 1,  // +1
  teamJoins: 0,
  ctr: "50.0%"  // 자동 계산
}
```

---

## ✅ 검증 완료 기준

- [ ] 콘솔에 "The query requires an index" 에러 없음
- [ ] 콘솔에 "✅ [FunnelPanel] 실시간 업데이트" 로그 출력
- [ ] 유저 행동 → 1~2초 내 숫자 업데이트
- [ ] 연결 상태: "실시간 구독 중" (녹색 점)
- [ ] CTR, 활성화율 자동 계산 정상
- [ ] 낮은 CTR 스토리 Top5 표시 (데이터 있을 때)

---

## 🚀 다음 단계

검증 완료 후:
1. 지역별 필터 추가 (region 인덱스 활용)
2. 시간대별 추이 그래프
3. 알림 임계치 설정
