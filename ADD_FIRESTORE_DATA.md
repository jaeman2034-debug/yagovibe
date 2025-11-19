# 🔥 Firestore Emulator에 테스트 데이터 추가하기

## ✅ 에뮬레이터가 실행 중인 상태!

현재 다음 에뮬레이터가 실행 중입니다:
- ✅ Authentication (포트 9099)
- ✅ Firestore (포트 8080)
- ✅ Functions (포트 5003)

---

## 📊 Firestore UI에서 데이터 추가

### 1단계: Firestore UI 접속

**브라우저**에서:
1. Firebase Emulator UI: http://localhost:4000
2. 상단 메뉴에서 **"Firestore"** 클릭

---

### 2단계: Collection & Document 생성

#### 📂 Collection: `reports`

1. **"Start collection"** 버튼 클릭
2. Collection ID 입력: `reports`
3. **"Next"** 클릭

---

#### 📄 Document: `weekly`

1. Document ID: `weekly` (자동 ID 체크 해제!)
2. **"Save"** 클릭

---

#### 📂 Subcollection: `data`

1. `weekly` 문서가 선택된 상태에서
2. **"+ Subcollection"** 버튼 클릭
3. Subcollection ID: `data`
4. **"Start"** 클릭

---

#### 📄 Document 1: `summary`

1. Subcollection `data` 안에서
2. **"Add document"** 클릭
3. Document ID: `summary` (자동 ID 체크 해제!)
4. 다음 **필드**들을 하나씩 추가:

| Field ID | Type | Value |
|----------|------|-------|
| `newUsers` | number | `24` |
| `activeUsers` | number | `89` |
| `growthRate` | string | `27%` |
| `highlight` | string | `주간 활동량 증가` |
| `recommendation` | string | `AI 추천: 사용자 리텐션 강화 캠페인` |
| `updatedAt` | string | `2025-11-02T12:00:00.000Z` |

5. **"Save"** 클릭

---

#### 📄 Document 2: `analytics`

1. 같은 Subcollection `data` 안에서
2. **"Add document"** 클릭  
3. Document ID: `analytics` (자동 ID 체크 해제!)
4. 다음 **필드**들을 하나씩 추가:

| Field ID | Type | Value |
|----------|------|-------|
| `labels` | array | 첫 번째 항목: `1주차`, 두 번째: `2주차`, 세 번째: `3주차`, 네 번째: `4주차` |
| `newUsers` | array | 첫 번째: `12`, 두 번째: `18`, 세 번째: `14`, 네 번째: `24` |
| `activeUsers` | array | 첫 번째: `20`, 두 번째: `24`, 세 번째: `22`, 네 번째: `89` |
| `generatedAt` | string | `2025-11-02T12:00:00.000Z` |

5. **"Save"** 클릭

---

## ✅ 완료!

이제 브라우저에서 **http://localhost:5173/home** 접속하면:

- ✅ AI 요약 리포트가 표시됩니다
- ✅ 주간 통계 그래프가 렌더링됩니다
- ✅ PDF 생성 버튼이 작동합니다
- ✅ 음성 읽기 버튼이 작동합니다

---

## 📂 최종 Firestore 구조

```
reports/                    ← Collection
  └── weekly/               ← Document
      └── data/             ← Subcollection
          ├── summary       ← Document 1
          └── analytics     ← Document 2
```

---

## 🆘 문제 발생 시

### Array 필드 추가 방법

1. 필드 타입을 **"array"** 선택
2. **"+ Add item"** 버튼으로 항목 하나씩 추가
3. 값 입력 후 **"Done"** 클릭
4. 다음 항목 추가 계속...

---

**🎉 이제 홈 페이지에서 모든 기능을 테스트할 수 있습니다!**

