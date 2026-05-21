# 🔥 마켓 글쓰기 Draft(임시저장) + 이어쓰기 v1

## ✅ 완료된 작업

### 1. Draft 저장소 설계
- **파일**: `src/services/marketDraftService.ts`
- **구조**: localStorage 기반 (v1)
  - Key: `marketDraft:{uid}:{sport}:{category}`
  - Value: `{ title, price, images, content, updatedAt, ... }`
- **향후 확장**: Firestore로 확장 가능 (멀티 디바이스 지원)

### 2. 폼 자동 저장
- **대상 폼**: `EquipmentForm` (v1)
- **규칙**:
  - 입력 변경 후 1초 debounce 저장
  - 페이지 이탈/뒤로가기 직전에도 저장
  - 사진은 업로드된 URL만 저장

### 3. 이어쓰기 UX
- **write 페이지 진입 시 모달**:
  - Draft 존재 시 `DraftRestoreModal` 표시
  - "작성 중인 글이 있어요. 이어서 작성할까요?"
  - [이어쓰기] / [새로 작성] 버튼
- **FAB 모달 배지**:
  - Draft 존재 시 "작성 중 1" 배지 표시
  - `PostTypeSelectModal`에 통합

### 4. 완료/삭제 처리
- **게시글 등록 성공 시**: Draft 자동 삭제
- **새로 작성 선택 시**: Draft 삭제 옵션 제공

## 📐 구조 설계

### 사용자 플로우

```
사용자가 글 작성 시작
  ↓
입력 변경 (1초 debounce)
  ↓
localStorage에 자동 저장
  ↓
페이지 이탈 시에도 저장
  ↓
다시 write 페이지 진입
  ↓
Draft 존재 확인
  ↓
[옵션 1] 이어쓰기 모달 표시
  → Draft 복원 → 폼에 자동 채움
  ↓
[옵션 2] FAB 모달에서 배지 표시
  → "작성 중 1" 배지
  ↓
게시글 등록 성공
  → Draft 자동 삭제
```

### 컴포넌트 구조

```
MarketWritePage
  ├── Draft 확인 (useEffect)
  ├── DraftRestoreModal (조건부 표시)
  └── EquipmentForm
        ├── initialDraft prop (복원용)
        ├── 자동 저장 (debounce 1초)
        └── 등록 성공 시 Draft 삭제

PostTypeSelectModal
  └── Draft 배지 표시 (hasMarketDraft)
```

## 🎨 UI/UX 특징

### DraftRestoreModal
- **위치**: write 페이지 진입 시 표시
- **스타일**:
  - 중앙 모달
  - Draft 미리보기 (제목 표시)
  - "이어서 작성" / "새로 작성" 버튼
  - 시간 표시 (방금 전, N분 전, N일 전)

### PostTypeSelectModal (개선)
- **배지**: Draft 존재 시 "작성 중 1" 배지
- **위치**: 각 옵션 오른쪽
- **색상**: 주황색 (`bg-orange-500`)

## 🔗 통합 지점

### MarketWritePage
- `getMarketDraft`로 Draft 확인
- `DraftRestoreModal` 조건부 렌더링
- `EquipmentForm`에 `initialDraft` prop 전달

### EquipmentForm
- `initialDraft` prop 받아서 초기값 설정
- `useEffect`로 이미지 복원
- `saveDraft` (debounce 1초) 자동 저장
- `beforeunload` 이벤트로 페이지 이탈 시 저장
- 등록 성공 시 `deleteMarketDraft` 호출

### PostTypeSelectModal
- `hasMarketDraft`로 Draft 존재 확인
- Draft 존재 시 배지 표시

## 🎯 효과

### 사용자 관점

1. **작성 중 이탈 방지**
   - 자동 저장으로 데이터 손실 방지
   - 언제든 이어서 작성 가능

2. **빠른 재진입**
   - write 페이지 진입 시 즉시 Draft 확인
   - 모달로 빠른 선택

3. **시각적 피드백**
   - FAB 모달에서 Draft 배지로 알림
   - "작성 중 1" 배지로 상태 표시

### 개발자 관점

1. **재사용 가능한 서비스**
   - `marketDraftService.ts` 독립 서비스
   - 다른 폼에도 쉽게 확장 가능

2. **확장 가능한 구조**
   - localStorage → Firestore 확장 용이
   - 멀티 디바이스 지원 준비

3. **자동화된 저장**
   - debounce로 성능 최적화
   - 페이지 이탈 시 안전한 저장

## 🚀 사용 예시

### Draft 자동 저장
```
1. 사용자가 제목 입력: "나이키 축구화"
2. 1초 후 자동 저장
3. 가격 입력: "50000"
4. 1초 후 자동 저장
5. 페이지 이탈 시에도 저장
```

### Draft 복원
```
1. 사용자가 write 페이지 진입
2. Draft 존재 확인
3. 모달 표시: "작성 중인 글이 있어요"
4. [이어서 작성] 클릭
5. 폼에 자동 채움 (제목, 가격, 이미지 등)
```

### FAB 모달 배지
```
1. 사용자가 FAB 클릭
2. 모달 표시
3. equipment 옵션에 "작성 중 1" 배지 표시
4. 클릭 시 write 페이지로 이동
5. Draft 복원 모달 표시
```

## 📝 향후 개선 사항

### 추가 가능한 기능

1. **RecruitForm, MatchForm 지원**
   - 현재는 EquipmentForm만 지원
   - 다른 폼에도 동일한 draft 시스템 적용

2. **Firestore 동기화**
   - localStorage → Firestore 확장
   - 멀티 디바이스 지원

3. **Draft 목록 페이지**
   - 모든 Draft 목록 표시
   - Draft 삭제/복원 관리

4. **사진 없이도 등록 가능**
   - "사진 없음" 뱃지
   - 등록 장벽 낮춤

5. **첫 글 작성 보상**
   - 뱃지/포인트 지급
   - "첫 글 작성자" 뱃지

6. **작성 템플릿**
   - 팀 모집/매칭 자동 문구
   - 자주 사용하는 템플릿 저장

## ✅ 검증 체크리스트

- [x] localStorage 기반 draft 저장소 설계
- [x] EquipmentForm 자동 저장 (debounce 1초)
- [x] 페이지 이탈 시 draft 저장
- [x] 이미지 URL만 저장 (업로드된 것만)
- [x] write 페이지 진입 시 Draft 확인
- [x] Draft 복원 모달 표시
- [x] FAB 모달에 Draft 배지 표시
- [x] 게시글 등록 성공 시 Draft 삭제
- [x] 새로 작성 선택 시 Draft 삭제

---

**마켓 글쓰기 Draft(임시저장) + 이어쓰기 v1 완료! 이제 사용자가 안전하게 글을 작성할 수 있습니다.** 🎉
