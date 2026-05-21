# BFF 서버 가이드

## 📋 개요

BFF (Backend For Frontend) 서버는 ESPN API를 크롤링하여 프론트엔드에 제공하는 프록시 서버입니다.

## 🚀 시작하기

### 1. 서버 실행

```bash
# BFF 서버만 실행
npm run dev:bff

# 프론트엔드와 BFF 서버 동시 실행 (concurrently 필요)
npm run dev:all
```

### 2. 서버 확인

브라우저에서 `http://localhost:4000/health` 접속하여 서버 상태 확인

## 📡 API 엔드포인트

### 경기 일정 조회
```
GET /api/games?date=2025-12-04&league=MLB
```

**응답:**
```json
{
  "games": [
    {
      "id": "401570123",
      "league": "MLB",
      "sport": "baseball",
      "homeTeam": "Dodgers",
      "awayTeam": "Yankees",
      "startTime": "2025-12-04T18:00:00Z",
      "status": "scheduled",
      "homeScore": undefined,
      "awayScore": undefined,
      "venue": "Dodger Stadium"
    }
  ]
}
```

### 리그 순위 조회
```
GET /api/standings?league=MLB
```

**응답:**
```json
{
  "standings": [
    {
      "league": "MLB",
      "team": "Los Angeles Dodgers",
      "rank": 1,
      "wins": 85,
      "losses": 45,
      "draws": 0
    }
  ]
}
```

### 팀별 경기 조회
```
GET /api/team-games?team=Dodgers&league=MLB&date=2025-12-04
```

**응답:**
```json
{
  "games": [...]
}
```

## 🎯 지원 리그

- **MLB**: 메이저리그 (baseball/mlb)
- **NBA**: NBA (basketball/nba)
- **NFL**: NFL (football/nfl)
- **EPL**: 프리미어리그 (soccer/eng.1)
- **KBO**: 한국 프로야구 (baseball/kbo) - ESPN 지원 여부 확인 필요
- **KLeague**: K리그 (soccer/kor.1)
- **NPB**: 일본 프로야구 (baseball/jpn.1)
- **UCL**: 챔피언스리그 (soccer/uefa.champions)

## ⚙️ 환경 변수 설정

### `.env.local` (로컬 개발)
```env
VITE_SPORTS_API_BASE_URL=http://localhost:4000
VITE_ENABLE_MOCK=false  # BFF 서버 사용 시 false
```

### `.env.production` (프로덕션)
```env
VITE_SPORTS_API_BASE_URL=https://your-bff-server.com
VITE_ENABLE_MOCK=false
```

## 🔧 프론트엔드 연결

프론트엔드의 `src/services/sportsApi.ts`는 자동으로 BFF 서버를 호출합니다:

```typescript
// BFF 서버 URL 자동 감지
const BFF_BASE_URL = import.meta.env.VITE_SPORTS_API_BASE_URL || "http://localhost:4000";

// API 호출 예시
const games = await fetchGamesByDate({ 
  date: "2025-12-04", 
  league: "MLB" 
});
```

## ✨ 장점

1. **완전 무료**: ESPN API는 무료로 사용 가능
2. **CORS 해결**: 서버에서 프록시하므로 CORS 문제 없음
3. **API 키 불필요**: ESPN API는 인증 없이 사용 가능
4. **실시간 데이터**: ESPN의 실시간 스코어 지원
5. **광범위한 커버리지**: MLB, NBA, NFL, EPL 등 주요 리그 지원

## 🐛 문제 해결

### 서버가 시작되지 않을 때
```bash
# 포트 4000이 사용 중인지 확인
netstat -ano | findstr :4000

# 다른 포트 사용
PORT=4001 node server/index.js
```

### ESPN API 응답이 없을 때
- ESPN API가 해당 리그를 지원하는지 확인
- 날짜 형식이 올바른지 확인 (YYYY-MM-DD)
- 네트워크 연결 확인

## 📚 관련 파일

- `server/index.js`: BFF 서버 메인 파일
- `src/services/sportsApi.ts`: 프론트엔드 API 클라이언트
- `.env.local`: 로컬 개발 환경 변수
- `.env.production`: 프로덕션 환경 변수

