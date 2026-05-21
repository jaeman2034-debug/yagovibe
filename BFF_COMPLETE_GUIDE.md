# 🚀 ESPN BFF 서버 완성 가이드

## ✅ 완료된 작업

### 1. BFF 서버 확장 (`server/index.js`)
- ✅ 경기 일정 조회 (`/api/games`)
- ✅ 리그 순위 조회 (`/api/standings`)
- ✅ 팀별 경기 조회 (`/api/team-games`)
- ✅ 팀 정보 조회 (`/api/team`, `/api/team/:id`)
- ✅ 선수 정보 조회 (`/api/player`, `/api/player/:id`)
- ✅ 통합 검색 (`/api/search`)
- ✅ 하이라이트 조회 (`/api/highlights`)
- ✅ 지원 리그 목록 (`/api/leagues`)
- ✅ 헬스 체크 (`/health`)

### 2. 리그 매핑 자동화 (`src/utils/leagueMapper.ts`)
- ✅ 팀 이름 → 리그 자동 추론
- ✅ 선수 이름 → 리그 자동 추론
- ✅ 스포츠 종목 → 기본 리그 추론
- ✅ 음성 명령 → 리그 자동 추론 (통합)
- ✅ 완전 통합 테이블 (MLB, KBO, EPL, NBA, KLeague 등)

### 3. 프론트엔드 업데이트 (`src/services/sportsApi.ts`)
- ✅ BFF 서버 호출 함수 (`callBFF`)
- ✅ 모든 API 함수 BFF 서버 연동
- ✅ 자동 리그 추론 통합
- ✅ Mock 모드 fallback 유지

### 4. Voice Intent 자동 매핑 (`src/utils/voiceIntentParser.ts`)
- ✅ 팀 경기 요청 시 자동 리그 추론
- ✅ 선수 경기 요청 시 자동 리그 추론
- ✅ 음성 명령 → ESPN 데이터 자동 매핑

## 🎯 사용 예시

### 음성 명령 → 자동 리그 추론

```
🗣 "다저스 경기 보여줘"
→ 팀: "다저스" 추출
→ 리그 자동 추론: "MLB"
→ BFF: GET /api/team-games?team=Dodgers&league=MLB
→ ESPN: baseball/mlb/scoreboard
→ 응답: 다저스 경기 목록
```

```
🗣 "손흥민 경기 보여줘"
→ 선수: "손흥민" 추출
→ 리그 자동 추론: "EPL"
→ BFF: GET /api/player-games?player=손흥민&league=EPL
→ ESPN: soccer/eng.1/scoreboard
→ 응답: 토트넘 경기 목록
```

```
🗣 "농구 오늘 경기"
→ 스포츠: "농구" 추출
→ 리그 자동 추론: "NBA"
→ BFF: GET /api/games?date=2025-12-04&league=NBA
→ ESPN: basketball/nba/scoreboard
→ 응답: NBA 오늘 경기 목록
```

## 📡 API 엔드포인트

### 경기 일정
```bash
GET /api/games?date=2025-12-04&league=MLB
```

### 리그 순위
```bash
GET /api/standings?league=MLB
```

### 팀별 경기
```bash
GET /api/team-games?team=Dodgers&league=MLB&date=2025-12-04
```

### 검색
```bash
GET /api/search?query=손흥민
```

### 지원 리그 목록
```bash
GET /api/leagues
```

## 🎮 실행 방법

### 1. BFF 서버 실행
```bash
npm run dev:bff
```

### 2. 프론트엔드와 함께 실행
```bash
npm run dev:all
```

### 3. 테스트
```bash
# 헬스 체크
curl http://localhost:4000/health

# 경기 조회
curl "http://localhost:4000/api/games?date=2025-12-04&league=MLB"

# 리그 순위
curl "http://localhost:4000/api/standings?league=MLB"
```

## 🔧 환경 변수

### `.env.local`
```env
VITE_SPORTS_API_BASE_URL=http://localhost:4000
VITE_ENABLE_MOCK=false
```

### `.env.production`
```env
VITE_SPORTS_API_BASE_URL=https://your-bff-server.com
VITE_ENABLE_MOCK=false
```

## 📊 지원 리그

### 야구
- MLB (메이저리그)
- KBO (한국 프로야구)
- NPB (일본 프로야구)

### 농구
- NBA
- KBL (한국 프로농구)
- WKBL (한국 여자 프로농구)

### 축구
- EPL (프리미어리그)
- KLeague (K리그)
- UCL (챔피언스리그)
- LaLiga (라리가)
- SerieA (세리에A)
- Bundesliga (분데스리가)
- Ligue1 (리그앙)

### 기타
- NFL (미식축구)
- NHL (하키)
- VLeague (배구)

## 🎯 자동 리그 추론 예시

### 팀 이름
- "다저스" → MLB
- "토트넘" → EPL
- "LG" → KBO
- "레이커스" → NBA

### 선수 이름
- "손흥민" → EPL
- "류현진" → MLB
- "오타니" → MLB
- "르브론" → NBA

### 스포츠 종목
- "야구" → KBO (기본값)
- "축구" → EPL (기본값)
- "농구" → NBA (기본값)

## ✨ 장점

1. **완전 무료**: ESPN API 무료 사용
2. **자동 매핑**: 음성 명령에서 자동으로 리그 추론
3. **CORS 해결**: 서버 프록시로 CORS 문제 없음
4. **API 키 불필요**: ESPN API는 인증 없이 사용 가능
5. **실시간 데이터**: ESPN의 실시간 스코어 지원
6. **광범위한 커버리지**: MLB, NBA, NFL, EPL 등 주요 리그 지원

## 🚀 다음 단계 (선택)

### Cloudflare Worker 배포
- 완전 무료 서버 배포
- 도메인 없이도 배포 가능
- 전 세계 CDN 지원

### YouTube API 연동
- 하이라이트 영상 자동 검색
- 선수별 하이라이트 제공

### 캐싱 최적화
- Redis 캐싱
- 응답 속도 향상

## 📚 관련 파일

- `server/index.js`: BFF 서버 메인 파일
- `src/services/sportsApi.ts`: 프론트엔드 API 클라이언트
- `src/utils/leagueMapper.ts`: 리그 매핑 유틸리티
- `src/utils/voiceIntentParser.ts`: Voice Intent 파서
- `src/utils/extractEntities.ts`: 엔티티 추출 엔진

