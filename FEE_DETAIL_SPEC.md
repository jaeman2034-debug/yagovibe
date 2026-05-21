# 📋 월별 회비 상세 화면 – 개발 명세서

## 🎯 목표

요약 화면은 숫자만 보여주고,  
**'월별 상세 화면'에서 사람을 조작한다.**

---

## 1️⃣ 입구: 요약 화면 버튼

### 위치
- 화면: `회비 / 회계` (요약 페이지)
- 파일: `src/pages/team/TeamAccountingPage.tsx`

### UI

```tsx
<div 
  onClick={() => navigate(`/team/${teamId}/fee-detail?month=${selectedMonth}`)}
  className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg"
>
  <div className="flex items-center justify-between mb-4">
    <h2>이번 달 회비</h2>
    <div className="flex items-center gap-2 text-blue-600">
      <span>이번 달 상세 보기</span>
      <span>▶</span>
    </div>
  </div>
  <p className="text-xs text-gray-500 mb-4">회원별 납부 현황 보기</p>
  {/* 요약 통계 */}
</div>
```

**핵심**:
- ✅ 카드 전체 클릭 가능
- ✅ 우측 상단 링크 텍스트 병행
- ✅ hover 효과

---

## 2️⃣ 월별 회비 상세 화면

### 라우팅

**경로**: `/team/:teamId/fee-detail?month=YYYY-MM`

**규칙**:
- `month` 없으면 현재 월로 자동 세팅
- `month` 변경 시 URL 동기화 (replace)

### 페이지 구조

#### 상단

```
← 회비 / 회계로 돌아가기

2025년 7월 회비 상세
회원별 납부 현황

[2025-07 (month input)]
```

#### 테이블

| 이름 | 상태 | 회비 | 납부 여부 | 액션 |
|------|------|------|----------|------|
| 홍길동 | 재원 | 20,000원 | 미납 | [납부 완료] |
| 김철수 | 재원 | 20,000원 | 완납 | ✔ 완료 |

---

## 3️⃣ 데이터 구조

### Fee 문서 키 (새 구조)

```
teams/{teamId}/fees/{YYYY-MM}/items/{memberId}
```

**예시**:
```
teams/team1/fees/2025-07/items/hong
```

**장점**:
- 월 단위 쿼리 쉬움
- 한 달치만 가져오기 쉬움
- 확장성 (부분납, 여러번 납부 등)

### Fee 문서 구조

```typescript
{
  teamId: string,
  memberId: string,
  memberName: string,
  month: "YYYY-MM",
  amount: number,
  paid: boolean,
  paidAt: Timestamp,
  processedBy: string,  // OWNER uid
  createdBy: string,
  updatedBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

## 4️⃣ API Payload (확정)

### 요청

```json
{
  "teamId": "team1",
  "memberId": "hong",
  "month": "2025-12",
  "amount": 20000
}
```

### 서버 처리 순서 (고정)

1. **관리자 권한 확인**
   ```typescript
   if (!owners.includes(ownerId)) {
     throw new Error("OWNER 권한이 필요합니다.");
   }
   ```

2. **team.plan === 'PRO' 확인** (아니면 403)
   ```typescript
   if (teamData.plan !== "PRO") {
     throw new Error("PRO_REQUIRED: ...");
   }
   ```

3. **fee upsert**
   ```typescript
   const feeRef = db
     .collection("teams")
     .doc(teamId)
     .collection("fees")
     .doc(month)
     .collection("items")
     .doc(memberId);
   
   await feeRef.set({
     paid: true,
     paidAt: serverTimestamp(),
     // ... 기타 필드
   }, { merge: true });
   ```

### 응답

```json
{
  "success": true
}
```

---

## 5️⃣ UX 흐름

### PRO 팀

1. 테이블에서 `[납부 완료]` 버튼 클릭
2. 확인 모달 표시
3. `[확인]` 클릭
4. 서버 요청
5. **즉시 row 업데이트**:
   - 납부 여부: `미납` → `완납`
   - 액션: `[납부 완료]` → `✔ 완료`
   - 배경: 흰색 → 초록색

### FREE 팀

1. 테이블에서 `[🔒 납부 완료]` 버튼 (비활성)
2. 클릭 시 업그레이드 모달 표시
3. `[업그레이드]` → 결제 페이지로 이동

---

## 6️⃣ month input + URL 동기화

### 구현

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const monthParam = searchParams.get("month") || currentMonth;
const [selectedMonth, setSelectedMonth] = useState(monthParam);

const handleMonthChange = (newMonth: string) => {
  setSelectedMonth(newMonth);
  // URL query 업데이트
  setSearchParams({ month: newMonth }, { replace: true });
  // 데이터 재조회 (useEffect에서 자동)
};
```

**핵심**:
- month 변경 → URL 업데이트
- URL 변경 → 데이터 재조회
- 새로고침해도 상태 유지

---

## 7️⃣ 완료 기준

✅ 요약 화면에서 상세 화면으로 진입 가능  
✅ 월별 회비 상세 화면에서 회원별 납부 처리 가능  
✅ PRO/FREE 분기 명확  
✅ fee 기록 저장 (새 구조)  
✅ 모든 화면 자동 반영  
✅ month input + URL 동기화  

---

## 🔑 한 문장 요약

**요약 화면은 숫자만 보여주고, '월별 상세 화면'에서 사람을 조작한다.**

