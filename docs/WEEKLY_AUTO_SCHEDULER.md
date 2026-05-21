# ⏱ 주간 자동 기록 생성 스케줄러 설계

## 목적

활동이 있었을 때만 기록을 남기고, 없었으면 완전히 침묵

- ❌ 억지 생성
- ❌ 빈 글
- ❌ "이번 주는 쉬었습니다" 같은 문구

---

## 1️⃣ 전체 구조

```
[Scheduler]
   ↓ (주 1회)
[Cloud Function]
   ↓
[활동 데이터 체크]
   ↓
[있음] → AI 생성 → 트랜잭션 저장
[없음] → 즉시 종료 (로그만)
```

---

## 2️⃣ 스케줄 주기

**주 1회**

- 요일: 팀 활동 다음날
- 예: 일요일 경기 → 월요일 새벽 3시
- 시간: 트래픽 없는 시간

**설정**:
```
매주 월요일 03:00 (KST)
Frequency: 0 3 * * 1
Timezone: Asia/Seoul
```

---

## 3️⃣ 스케줄러 설정 (Firebase 기준)

**Cloud Scheduler**:
- Frequency: `0 3 * * 1`
- Timezone: `Asia/Seoul`
- Target: HTTP / PubSub → Cloud Function

---

## 4️⃣ 서버 함수 핵심 로직

```typescript
export const weeklyTeamBlogJob = async () => {
  const teams = await getActiveTeams();

  for (const team of teams) {
    const activity = await getTeamActivity(team.id, last7Days);

    // 🔴 핵심 규칙
    if (!activity.exists) {
      continue; // 아무 것도 하지 않음
    }

    // AI 생성
    const content = await generateWeeklyBlog({
      team,
      activity,
    });

    if (!content) {
      continue; // 실패 시 저장 안 함
    }

    // 트랜잭션 저장
    await saveWeeklyPostTransaction({
      team,
      content,
    });
  }
};
```

---

## 5️⃣ "활동 있음" 판단 기준

**최소 조건** (하나만 충족해도 OK):
- ✅ 출석 기록 1건 이상
- ✅ 경기/모임 로그 1건 이상
- ✅ 관리자 수동 입력 1건 이상

**제외 사항**:
- ❌ 조회수
- ❌ 공유
- ❌ 로그인

---

## 6️⃣ 주간 기록 글 프롬프트

```
지난 1주일간 팀 활동을 정리하세요.

규칙:
- 있었던 사실만
- 일정이 없으면 글을 쓰지 마세요
- 평가, 감정, 홍보 표현 금지

구성:
1문단: 이번 주 활동 여부
2문단: 진행 방식
3문단: 다음 활동 일정(있으면만)
```

**👉 "활동 없음"이면 생성 자체를 안 함**

---

## 7️⃣ 중복 생성 방지

**Firestore 체크**:
```typescript
where("teamId", "==", teamId)
where("postType", "==", "weekly")
where("weekKey", "==", "2025-W03")
```

**weekKey 형식**: `YYYY-WNN` (예: `2025-W03`)

**👉 있으면 무조건 skip**

---

## 8️⃣ 실패·예외 처리 원칙

- **AI 실패** → 로그만
- **Firestore 실패** → 재시도 ❌
- **한 팀 실패** → 전체 중단 ❌

**조용히 실패하고, 다음 주에 다시 시도**

---

## 9️⃣ 로그 정책 (운영자용)

**[WEEKLY_JOB]**
- 실행 시각
- 처리 팀 수
- 생성된 기록 수

**제외 사항**:
- ❌ 팀별 상세 로그
- ❌ 실패 알림 폭탄

---

## 🔟 구현 위치

- `functions/src/generateTeamBlogPost.ts`
  - `autoWeeklyTeamPost` - 스케줄러 함수
  - `getWeekNumber()` - 주차 번호 계산
  - `generateBlogPostContent()` - AI 생성 (activityData 파라미터 추가)

---

## 1️⃣1️⃣ 이 설계가 중요한 이유

- ✅ 기록이 과잉 생산되지 않는다
- ✅ "AI가 매주 글 쓰네?" 인상 ❌
- ✅ 실제 활동과 1:1 대응
- ✅ 기록은 신뢰를 쌓아야지, 존재감을 주장하면 안 된다

---

**마지막 업데이트**: 2025-01-XX

