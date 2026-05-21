# 🔥 CTR 정상화 테스트 체크리스트

## ✅ 패치 완료 사항

1. ✅ 이벤트 이름 변환: `click` → `story_click`, `impression` → `story_impression`
2. ✅ API 경로 수정: `/api/story/log/bulk` → `/api/logs/story/bulk`
3. ✅ region 필드 추가: `story.region || "seoul"`
4. ✅ 백엔드 안전장치: `event` → `eventName` 자동 변환

---

## 🧪 테스트 단계

### 1단계: 브라우저 콘솔 확인

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 선택
3. 스토리 페이지 접속 (`/sports-hub`)
4. 다음 로그 확인:

```
[STORY_LOG] {
  eventName: "story_impression",
  region: "seoul",
  storyId: "...",
  ...
}
```

✅ **성공 기준**: `eventName`이 `story_impression` 또는 `story_click`으로 표시

---

### 2단계: 네트워크 요청 확인

1. 개발자 도구 → Network 탭
2. 스토리 클릭 5~10회
3. 다음 요청 확인:

```
POST /api/logs/story/bulk
Status: 200 OK
```

✅ **성공 기준**: 200 응답, 요청 본문에 `eventName` 필드 포함

---

### 3단계: API 응답 확인

브라우저 콘솔에서 실행:

```javascript
// 30초 후 실행
setTimeout(async () => {
  const res = await fetch('/api/admin/dashboard/summary?region=seoul');
  const data = await res.json();
  console.log('📊 CTR 결과:', {
    currentCtr: data.risk?.currentCtr,
    isLowCtr: data.risk?.isLowCtr,
    impressions: data.risk?.impressions,
    clicks: data.risk?.clicks
  });
}, 30000);
```

또는 직접 API 호출:

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/admin/dashboard/summary?region=seoul" | Select-Object -ExpandProperty Content
```

✅ **성공 기준**: `currentCtr > 0` (클릭한 경우)

---

## 🔍 예상 결과

### 정상 작동 시

```json
{
  "risk": {
    "currentCtr": 0.05,  // 5% CTR (예시)
    "isLowCtr": false,
    "apiError": 0
  },
  "timestamp": "2026-02-03T..."
}
```

### 아직 데이터 없을 때

```json
{
  "risk": {
    "currentCtr": 0,
    "isLowCtr": true,
    "apiError": 0
  }
}
```

➡ 이 경우 스토리를 더 클릭하고 1분 후 다시 확인

---

## 🐛 문제 해결

### 문제 1: 콘솔에 로그가 안 보임

- **원인**: 스토리 페이지 접속 안 함
- **해결**: `/sports-hub` 접속 후 스토리 카드 확인

### 문제 2: 네트워크 404 에러

- **원인**: API 경로 불일치
- **해결**: 백엔드 서버 재시작 확인

### 문제 3: CTR 여전히 0%

- **원인**: 데이터 수집 시간 부족
- **해결**: 스토리 10회 이상 클릭 후 1분 대기

---

## 📝 테스트 결과 기록

테스트 후 아래 정보를 공유해주세요:

1. 콘솔 로그 확인 여부: ✅ / ❌
2. 네트워크 요청 상태: 200 / 404 / 기타
3. CTR 값: `currentCtr = ?`
4. 에러 메시지 (있는 경우)
