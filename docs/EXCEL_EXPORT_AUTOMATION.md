# 📊 엑셀 Export 자동화 (v1.1)

## 📋 개요

대회 참가팀 요약 및 선수 명단을 엑셀 파일로 자동 생성하고 다운로드할 수 있는 기능입니다.

**핵심 목표:**
- 운영자: 버튼 1번 → 엑셀 다운로드
- 대회 전날/당일 현장 혼란 0
- 데이터는 항상 최신 + 신뢰 가능

---

## 🎯 엑셀 파일 구성

### 시트 1: 참가팀 요약

| 팀명 | 신청자 | 연락처 | 팀 수 | 상태 | 선수 수 | 명단 상태 |
|------|--------|--------|-------|------|---------|-----------|
| 불암FC | 홍길동 | 010-1234-5678 | 3팀 | 승인 | 11명 | 제출 완료 |

### 시트 2: 선수 명단

| 팀명 | 선수명 | 생년월일 | 포지션 | 연락처 |
|------|--------|----------|--------|--------|
| 불암FC | 김철수 | 1998-03-12 | FW | 010-1111-1111 |
| 불암FC | 이영희 | 2000-11-02 | MF | 010-2222-2222 |

---

## 🏗️ 아키텍처

### 파일 구조

```
functions/src/tournament/
└── exportCompetitionExcel.ts  # 엑셀 Export Cloud Function

src/components/tournament/
└── RosterStatusList.tsx        # 엑셀 다운로드 버튼 (어드민 화면)
```

### 데이터 흐름

```
1. 운영자: 엑셀 다운로드 버튼 클릭
   ↓
2. 프론트: exportCompetitionExcel Callable Function 호출
   ↓
3. Cloud Function:
   → 관리자 권한 확인
   → 승인된 참가 신청 조회 (applications, status == "approved")
   → 각 신청의 선수 명단 조회 (rosters/{applicationId}/players)
   → 엑셀 워크북 생성 (exceljs)
   → Storage 업로드
   → Signed URL 생성 (10분 유효)
   ↓
4. 프론트: Signed URL로 다운로드
```

---

## 🚀 배포

### 1. 함수 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:exportCompetitionExcel
```

### 2. Storage 버킷 확인

Cloud Function에서 사용하는 Storage 버킷이 설정되어 있어야 합니다:

- 기본값: `{GCLOUD_PROJECT}.appspot.com`
- 환경 변수: `STORAGE_BUCKET` (선택)

---

## 📊 사용 방법

### 운영자 화면

**위치:** 대회 관리 → 선수 명단 탭

**버튼:** "엑셀 다운로드"

**동작:**
1. 버튼 클릭
2. 로딩 표시 ("엑셀 파일 생성 중...")
3. 완료 토스트: "엑셀 파일이 생성되었습니다. 팀: X팀, 선수: Y명"
4. 새 창에서 다운로드 시작

---

## 🔧 커스터마이징

### 파일명 변경

`functions/src/tournament/exportCompetitionExcel.ts`:

```typescript
const fileName = `${competitionYear}_${competitionName.replace(/\s+/g, "_")}_선수명단.xlsx`;
```

### Signed URL 유효 시간 변경

`functions/src/tournament/exportCompetitionExcel.ts`:

```typescript
expires: Date.now() + 1000 * 60 * 30, // 30분
```

### 시트 구조 변경

`functions/src/tournament/exportCompetitionExcel.ts`에서 시트 컬럼 정의를 수정:

```typescript
teamSheet.columns = [
  { header: "팀명", key: "teamName", width: 20 },
  // 추가 컬럼...
];
```

---

## ⚠️ 주의사항

1. **관리자 권한 필수:** 엑셀 Export는 협회 관리자만 가능합니다.

2. **승인된 신청만 포함:** `status == "approved"`인 신청만 포함됩니다.

3. **Storage 비용:** 엑셀 파일이 Storage에 저장됩니다. 필요시 자동 삭제 스케줄러 추가 권장.

4. **Signed URL 유효 시간:** 기본 10분입니다. 파일 크기가 크면 다운로드 시간이 오래 걸릴 수 있습니다.

5. **대용량 데이터:** 선수 명단이 많은 경우 (1000명 이상) Cloud Function 타임아웃(60초)에 걸릴 수 있습니다.

---

## 🎯 다음 단계 (v1.2)

1. **자동 삭제 스케줄러** (Storage 파일 정리)
2. **엑셀 템플릿 커스터마이징** (협회별 다른 형식)
3. **엑셀 Import 기능** (선수 명단 일괄 등록)
4. **다양한 Export 형식** (PDF, CSV 등)

---

## 📝 체크리스트

배포 전 확인:

- [ ] `exportCompetitionExcel` 함수 배포
- [ ] Storage 버킷 설정 확인
- [ ] 테스트: 어드민 계정으로 엑셀 다운로드
- [ ] 테스트: 엑셀 파일 내용 확인 (시트 2개, 데이터 정확성)
- [ ] 테스트: Signed URL 다운로드 확인

---

**🔥 이 기능이 완성되면 운영자는 버튼 1번으로 대회 현장에서 필요한 모든 데이터를 얻을 수 있습니다.**
