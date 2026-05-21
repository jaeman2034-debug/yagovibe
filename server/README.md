# 🚀 축구 허브 API 서버 (Week1~2 Stub)

## 설치

```bash
npm install
npx prisma generate
```

## 데이터베이스 설정

```bash
# SQLite DB 생성 (Week1~2)
npx prisma db push

# 초기 데이터 삽입
npm run db:seed
```

## 실행

```bash
# 개발 모드 (watch)
npm run dev

# 빌드
npm run build

# 프로덕션
npm start
```

## Week3 Postgres 전환

1. `.env` 파일 수정:
```
DATABASE_URL="postgresql://user:password@localhost:5432/sport_hub"
```

2. `prisma/schema.prisma` 수정:
```prisma
provider = "postgresql"
```

3. 마이그레이션 실행:
```bash
npx prisma migrate dev --name init
```

## 엔드포인트

### Health Check
```
GET /health
```

### Stories
```
GET /api/stories?region=seoul
POST /api/stories
PATCH /api/stories/:id
PATCH /api/stories/:id/priority
PATCH /api/stories/:id/extend
```

### Leagues
```
GET /api/leagues?region=seoul
```

### Logs
```
POST /api/logs/story
POST /api/logs/story/bulk
POST /api/logs/analytics/events
```

### Experiments
```
POST /api/experiments/log
GET /api/experiments/:key/analytics
```

## 테스트

```bash
# 스토리 목록 조회
curl http://localhost:3001/api/stories?region=seoul

# 스토리 생성
curl -X POST http://localhost:3001/api/stories \
  -H "Content-Type: application/json" \
  -d '{
    "region": "seoul",
    "title": "테스트 스토리",
    "subtitle": "테스트 서브타이틀",
    "category": "대회",
    "source": "운영"
  }'
```

## Week3 전환 계획

- [ ] 메모리 스토어 → DB 전환
- [ ] Prisma ORM 도입
- [ ] 마이그레이션 스크립트
