# 🔥 실시간 퍼널 테스트 가이드

## ✅ 현재 상태

- ✅ ActivityLog 구독 정상 동작
- ✅ 실시간 업데이트 로그 확인됨
- ⏳ EventLog 인덱스 생성 대기 중
- ❌ FCM 권한 문제 (퍼널과 무관)

---

## 🎯 인덱스 완료 확인

### Firebase Console에서 확인

1. **Firestore Database → Indexes 탭**
2. **eventLogs 인덱스 찾기:**
   - 필드: `eventName` (ASC) → `createdAt` (DESC) → `__name__` (DESC)
3. **상태 확인:**
   - 🟡 **생성 중...** → 대기 중
   - 🟢 **사용 설정됨** → 완료!

---

## 🧪 인덱스 완료 후 테스트

### STEP 1: 브라우저 새로고침

```
Ctrl + Shift + R (강력 새로고침)
```

### STEP 2: 콘솔 확인 (F12)

**정상 동작 시:**
```
✅ [FunnelPanel] EventLog 재연결 성공
✅ [FunnelPanel] 실시간 업데이트: {
  sportSelected: 0,
  storyImpressions: 0,
  storyClicks: 0,
  activationViews: 0,
  teamJoins: 0,
  ctr: "0.0%"
}
```

**에러 없음 확인:**
- ❌ "The query requires an index" 에러 없음
- ✅ 실시간 업데이트 로그만 출력

---

### STEP 3: 테스트 이벤트 생성

#### 유저 창에서 행동 수행

1. **종목 선택**
   - 스포츠 종목 클릭 (축구, 배드민턴 등)
   - 예상: `step1_sportSelected` +1

2. **스토리 노출 (자동)**
   - 스토리존에 스토리가 표시되면 자동으로 `story_impression` 로그 생성
   - 예상: `step2_storyImpression` +1

3. **스토리 클릭**
   - 스토리 카드 클릭
   - 예상: `step3_storyClick` +1

4. **팀 조회**
   - 팀 찾기 → 팀 상세 페이지 진입
   - 예상: `step4_activationViews` +1

5. **팀 가입 (선택)**
   - 팀 가입 버튼 클릭
   - 예상: `step5_teamJoin` +1

---

### STEP 4: 관리자 창에서 확인

**1~2초 내 숫자 업데이트 확인:**

- 종목 선택 → `step1_sportSelected` +1
- 스토리 클릭 → `step3_storyClick` +1
- 팀 조회 → `step4_activationViews` +1

**CTR 자동 계산 확인:**
- `storyClicks / storyImpressions` 자동 계산
- 예: 노출 10, 클릭 3 → CTR 30%

**활성화율 자동 계산 확인:**
- `activationViews / sportSelected` 자동 계산
- 예: 종목 선택 5, 팀 조회 2 → 활성화율 40%

---

## 📊 예상 결과

### 초기 상태 (데이터 없을 때)
```
step1_sportSelected: 0
step2_storyImpression: 0
step3_storyClick: 0
step4_activationViews: 0
step5_teamJoin: 0
ctr: 0%
activationRate: 0%
deepConversion: 0%
```

### 테스트 이벤트 후
```
step1_sportSelected: 1  (+1)
step2_storyImpression: 2  (+2)
step3_storyClick: 1  (+1)
step4_activationViews: 1  (+1)
step5_teamJoin: 0
ctr: 50%  (1/2)
activationRate: 100%  (1/1)
deepConversion: 0%  (0/1)
```

---

## ✅ 검증 체크리스트

인덱스 완료 후:

- [ ] 브라우저 새로고침 (Ctrl+Shift+R)
- [ ] 콘솔에 "The query requires an index" 에러 없음
- [ ] `✅ [FunnelPanel] 실시간 업데이트` 로그 출력
- [ ] FunnelPanel에 숫자 표시 (0이어도 정상)
- [ ] 유저 행동 → 1~2초 내 숫자 업데이트
- [ ] CTR, 활성화율 자동 계산
- [ ] 연결 상태: "실시간 구독 중" (녹색 점)

---

## 🚀 다음 단계

테스트 성공 후:

1. **낮은 CTR 스토리 Top5 확인**
   - 데이터가 충분할 때 자동 표시

2. **시간대별 추이 확인**
   - 오늘 하루 동안의 퍼널 변화

3. **지역별 필터 추가** (선택)
   - region 필터로 지역별 퍼널 분석

---

## 💡 참고

- 인덱스 생성 시간: 1~3분 (소규모), 10~30분 (대규모)
- 인덱스 생성 중에도 다른 쿼리는 정상 작동
- 인덱스는 한 번 생성되면 자동으로 유지됨
