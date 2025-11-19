# 📊 Firestore Emulator 테스트 데이터 추가 가이드

## 🎯 현재 상황
현재 홈 대시보드에서 **"리포트를 준비 중입니다..."** 메시지가 표시되는 이유는 Firestore Emulator에 데이터가 없기 때문입니다.

## ✅ 해결 방법

### 방법 1: Firebase Emulator UI에서 수동 추가 (가장 간단)

1. **에뮬레이터 UI 열기**
   - 브라우저에서 http://localhost:4000 접속
   - 또는 Firebase Emulator 실행 중 콘솔에 표시된 UI URL 클릭

2. **Firestore 탭 클릭**
   - 좌측 사이드바에서 "Firestore" 선택

3. **Collection + Document 생성**
   
   #### 첫 번째 문서: `reports/weekly/data/summary`
   - "Start collection" 클릭
   - Collection ID: `reports`
   - Document ID: `weekly` (자동 ID 사용 안 함 체크)
   - `weekly` 문서 안에서 "Start subcollection" 클릭
   - Subcollection ID: `data`
   - Subcollection 안에서 "Add document" 클릭
   - Document ID: `summary` (자동 ID 사용 안 함 체크)
   - 다음 필드 추가:
   ```json
   {
     "newUsers": 24 (Number),
     "activeUsers": 89 (Number),
     "growthRate": "27%" (String),
     "highlight": "주간 활동량 증가" (String),
     "recommendation": "AI 추천: 사용자 리텐션 강화 캠페인" (String),
     "updatedAt": "2025-11-02T12:00:00.000Z" (String)
   }
   ```

   #### 두 번째 문서: `reports/weekly/data/analytics`
   - 같은 `data` subcollection 안에서 "Add document" 클릭
   - Document ID: `analytics`
   - 다음 필드 추가:
   ```json
   {
     "labels": ["1주차", "2주차", "3주차", "4주차"] (Array),
     "newUsers": [12, 18, 14, 24] (Array),
     "activeUsers": [20, 24, 22, 89] (Array),
     "generatedAt": "2025-11-02T12:00:00.000Z" (String)
   }
   ```

4. **완료!**
   - 홈 대시보드 새로고침 → 리포트 표시 확인 ✅

---

### 방법 2: Firebase Functions HTTP 트리거 사용 (자동)

에뮬레이터가 실행 중일 때 PowerShell에서:

```powershell
Invoke-RestMethod -Uri "http://localhost:5003/yago-vibe-spt/asia-northeast3/generateWeeklyReportAPI" -Method GET
```

이 명령은 `generateWeeklyReportAPI` 함수를 실행하여 자동으로 데이터를 생성합니다.

---

### 방법 3: 프로덕션 Firestore에 배포 후 사용

1. **Functions 배포**
   ```bash
   cd functions
   firebase deploy --only functions:generateWeeklyReportAPI
   ```

2. **Function URL 호출**
   ```powershell
   Invoke-RestMethod -Uri "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateWeeklyReportAPI" -Method GET
   ```

---

## 📂 Firestore 경로 구조

```
reports/
  └── weekly/
      └── data/
          ├── summary (Document)
          │   ├── newUsers: 24
          │   ├── activeUsers: 89
          │   ├── growthRate: "27%"
          │   ├── highlight: "주간 활동량 증가"
          │   ├── recommendation: "AI 추천: ..."
          │   └── updatedAt: "2025-11-02T12:00:00.000Z"
          │
          └── analytics (Document)
              ├── labels: ["1주차", "2주차", "3주차", "4주차"]
              ├── newUsers: [12, 18, 14, 24]
              ├── activeUsers: [20, 24, 22, 89]
              └── generatedAt: "2025-11-02T12:00:00.000Z"
```

---

## 🎯 다음 단계

데이터 추가 후 홈 대시보드에서:
1. ✅ **AI 요약 리포트** 카드가 표시되는지 확인
2. ✅ **📈 주간 통계 그래프**가 렌더링되는지 확인
3. ✅ **🎙️ 리포트 듣기** 버튼으로 TTS 테스트
4. ✅ **📄 PDF 생성** 버튼으로 PDF 다운로드 테스트

---

## 💡 트러블슈팅

### "리포트를 준비 중입니다..." 메시지가 계속 나오는 경우

1. 브라우저 개발자 도구(F12) → Console 탭 확인
2. Firestore 연결 오류 있는지 확인
3. Emulator UI에서 데이터가 정확히 생성되었는지 확인
4. `AIWeeklySummary.tsx`의 경로가 정확한지 확인:
   ```typescript
   doc(db, "reports/weekly/data/summary")
   ```

### Emulator가 실행되지 않는 경우

```bash
firebase emulators:start --only firestore,auth,functions
```

---

**🎉 데이터 추가 완료 후 모든 AI 리포트 기능을 사용할 수 있습니다!**

