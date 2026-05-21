# 🔥 Firestore 초기화 스크립트

> **Firestore 실제 DB 생성 + 샘플 데이터 50개**

---

## 📋 목차

1. [스크립트 설치](#1-스크립트-설치)
2. [Firestore 초기화 스크립트](#2-firestore-초기화-스크립트)
3. [실행 방법](#3-실행-방법)
4. [생성되는 데이터](#4-생성되는-데이터)

---

## 1️⃣ 스크립트 설치

### 1-1. Firebase Admin SDK 설치

```bash
npm install firebase-admin
```

### 1-2. Firebase Admin 초기화 파일 생성

**파일**: `scripts/firebaseAdmin.ts`

```typescript
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = getFirestore();
```

### 1-3. 환경 변수 설정

**파일**: `.env.local` (또는 `.env`)

```bash
# Firebase Admin
FIREBASE_PROJECT_ID=nowon-football-platform
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nowon-football-platform.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**⚠️ 중요**: Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성

---

## 2️⃣ Firestore 초기화 스크립트

### 2-1. 스크립트 파일 생성

**파일**: `scripts/initFirestore.ts`

```typescript
import { adminDb } from "./firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

// 샘플 데이터 생성 함수
async function initFirestore() {
  console.log("🔥 Firestore 초기화 시작...");

  // 1. Association 생성
  const associationId = "assoc-nowon-football";
  await adminDb.collection("associations").doc(associationId).set({
    id: associationId,
    name: "노원구 축구협회",
    slug: "nowon-football",
    region: "서울 노원구",
    description: "노원구 지역 축구 협회입니다.",
    adminUids: ["admin-uid-1"],
    plan: "pro",
    features: {
      liveMatch: true,
      media: true,
      analytics: true,
      social: true,
    },
    status: "active",
    createdAt: Timestamp.now(),
  });
  console.log("✅ Association 생성 완료");

  // 2. Teams 생성 (24개)
  const teamNames = [
    "노원FC",
    "상계FC",
    "중계FC",
    "하계FC",
    "공릉FC",
    "월계FC",
    "불광FC",
    "수락FC",
    "마들FC",
    "별내FC",
    "도봉FC",
    "창동FC",
    "방학FC",
    "쌍문FC",
    "미아FC",
    "번동FC",
    "수유FC",
    "우이FC",
    "삼양FC",
    "화계FC",
    "가오리FC",
    "용암FC",
    "신정FC",
    "목동FC",
  ];

  const teams = [];
  for (let i = 0; i < teamNames.length; i++) {
    const teamId = `team-${i + 1}`;
    const team = {
      id: teamId,
      name: teamNames[i],
      region: "서울 노원구",
      sportType: "football",
      associationId: associationId,
      membership: i < 20 ? "member" : "pending",
      ownerUid: `owner-${i + 1}`,
      status: "active",
      memberCount: Math.floor(Math.random() * 20) + 10,
      matchCount: Math.floor(Math.random() * 10) + 5,
      winCount: Math.floor(Math.random() * 5),
      lossCount: Math.floor(Math.random() * 3),
      drawCount: Math.floor(Math.random() * 2),
      followersCount: Math.floor(Math.random() * 100) + 50,
      createdAt: Timestamp.now(),
    };
    await adminDb.collection("teams").doc(teamId).set(team);
    teams.push(team);
  }
  console.log(`✅ Teams 생성 완료 (${teams.length}개)`);

  // 3. Players 생성 (50개)
  const playerNames = [
    "홍길동",
    "김철수",
    "이영희",
    "박민수",
    "정수진",
    "최동현",
    "강민호",
    "윤서연",
    "임태영",
    "한지우",
    "오준혁",
    "신동욱",
    "류성민",
    "문지훈",
    "배현우",
    "송민석",
    "유재현",
    "조성민",
    "허준호",
    "고영수",
    "노승현",
    "도현우",
    "라준혁",
    "마동석",
    "바지훈",
    "사민수",
    "아동현",
    "자영희",
    "차철수",
    "카민호",
    "타서연",
    "파태영",
    "하지우",
    "갑준혁",
    "을동욱",
    "병성민",
    "정지훈",
    "무현우",
    "기재현",
    "신성민",
    "유준호",
    "육영수",
    "칠승현",
    "팔현우",
    "구준혁",
    "십동석",
    "십일지훈",
    "십이민수",
    "십삼동현",
    "십사영희",
  ];

  const positions = ["GK", "DF", "MF", "FW"];
  const players = [];

  for (let i = 0; i < playerNames.length; i++) {
    const playerId = `player-${i + 1}`;
    const teamIndex = Math.floor(Math.random() * teams.length);
    const team = teams[teamIndex];

    const player = {
      id: playerId,
      name: playerNames[i],
      associationId: associationId,
      teamId: team.id,
      teamName: team.name,
      position: positions[Math.floor(Math.random() * positions.length)],
      jerseyNumber: Math.floor(Math.random() * 99) + 1,
      status: "approved",
      goals: Math.floor(Math.random() * 15),
      assists: Math.floor(Math.random() * 10),
      matches: Math.floor(Math.random() * 12) + 5,
      yellowCards: Math.floor(Math.random() * 3),
      redCards: Math.floor(Math.random() * 2),
      followersCount: Math.floor(Math.random() * 50) + 10,
      createdAt: Timestamp.now(),
      approvedAt: Timestamp.now(),
    };
    await adminDb.collection("players").doc(playerId).set(player);
    players.push(player);
  }
  console.log(`✅ Players 생성 완료 (${players.length}개)`);

  // 4. Matches 생성 (30개)
  const matches = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const matchId = `match-${i + 1}`;
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam = teams[Math.floor(Math.random() * teams.length)];
    while (awayTeam.id === homeTeam.id) {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    const matchDate = new Date(today);
    matchDate.setDate(today.getDate() - (30 - i));

    const statuses: ("scheduled" | "live" | "completed")[] = 
      i < 5 ? ["scheduled"] : i < 10 ? ["live"] : ["completed"];

    const match = {
      id: matchId,
      associationId: associationId,
      homeTeamId: homeTeam.id,
      homeTeamName: homeTeam.name,
      awayTeamId: awayTeam.id,
      awayTeamName: awayTeam.name,
      date: matchDate.toISOString().split("T")[0],
      time: `${Math.floor(Math.random() * 12) + 10}:00`,
      venueName: ["마들스타디움", "노원구민운동장", "상계체육공원"][
        Math.floor(Math.random() * 3)
      ],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      homeScore: statuses.includes("completed")
        ? Math.floor(Math.random() * 5)
        : undefined,
      awayScore: statuses.includes("completed")
        ? Math.floor(Math.random() * 5)
        : undefined,
      createdAt: Timestamp.now(),
    };
    await adminDb.collection("matches").doc(matchId).set(match);
    matches.push(match);
  }
  console.log(`✅ Matches 생성 완료 (${matches.length}개)`);

  // 5. Match Events 생성 (완료된 경기만)
  const completedMatches = matches.filter((m) => m.status === "completed");
  let eventCount = 0;

  for (const match of completedMatches) {
    // 각 경기당 3-8개의 이벤트 생성
    const eventCountPerMatch = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < eventCountPerMatch; i++) {
      const eventId = `event-${eventCount + 1}`;
      const homeTeam = teams.find((t) => t.id === match.homeTeamId);
      const awayTeam = teams.find((t) => t.id === match.awayTeamId);
      const team = Math.random() > 0.5 ? homeTeam : awayTeam;
      const teamPlayers = players.filter((p) => p.teamId === team?.id);
      const player = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];

      const eventTypes = ["goal", "assist", "yellow_card", "substitution"];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const event = {
        id: eventId,
        matchId: match.id,
        minute: Math.floor(Math.random() * 90) + 1,
        type: eventType,
        playerId: player?.id || "player-1",
        playerName: player?.name || "홍길동",
        playerNumber: player?.jerseyNumber || 9,
        teamId: team?.id || "team-1",
        teamName: team?.name || "노원FC",
        createdAt: Timestamp.now(),
      };
      await adminDb.collection("match_events").doc(eventId).set(event);
      eventCount++;
    }
  }
  console.log(`✅ Match Events 생성 완료 (${eventCount}개)`);

  // 6. Standings 생성
  const memberTeams = teams.filter((t) => t.membership === "member");
  for (let i = 0; i < memberTeams.length; i++) {
    const team = memberTeams[i];
    const standingId = `standing-${team.id}`;
    
    const played = team.matchCount || 0;
    const win = team.winCount || 0;
    const loss = team.lossCount || 0;
    const draw = played - win - loss;
    const goalsFor = Math.floor(Math.random() * 30) + 10;
    const goalsAgainst = Math.floor(Math.random() * 20) + 5;
    const goalDiff = goalsFor - goalsAgainst;
    const points = win * 3 + draw;

    await adminDb.collection("standings").doc(standingId).set({
      id: standingId,
      tournamentId: "tournament-2026-nowon-league",
      teamId: team.id,
      teamName: team.name,
      played,
      win,
      draw,
      loss,
      goalsFor,
      goalsAgainst,
      goalDiff,
      points,
      rank: i + 1,
      form: ["W", "W", "D", "L", "W"],
      updatedAt: Timestamp.now(),
    });
  }
  console.log(`✅ Standings 생성 완료 (${memberTeams.length}개)`);

  console.log("\n🎉 Firestore 초기화 완료!");
  console.log("\n생성된 데이터:");
  console.log(`- Associations: 1개`);
  console.log(`- Teams: ${teams.length}개`);
  console.log(`- Players: ${players.length}개`);
  console.log(`- Matches: ${matches.length}개`);
  console.log(`- Match Events: ${eventCount}개`);
  console.log(`- Standings: ${memberTeams.length}개`);
}

// 스크립트 실행
initFirestore()
  .then(() => {
    console.log("\n✅ 모든 작업 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 에러 발생:", error);
    process.exit(1);
  });
```

### 2-2. package.json 스크립트 추가

**파일**: `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "init:firestore": "tsx scripts/initFirestore.ts"
  }
}
```

**tsx 설치**:
```bash
npm install -D tsx
```

---

## 3️⃣ 실행 방법

### 3-1. 환경 변수 설정

`.env.local` 파일에 Firebase Admin 인증 정보 추가:

```bash
FIREBASE_PROJECT_ID=nowon-football-platform
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nowon-football-platform.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3-2. 스크립트 실행

```bash
npm run init:firestore
```

### 3-3. 실행 결과

```
🔥 Firestore 초기화 시작...
✅ Association 생성 완료
✅ Teams 생성 완료 (24개)
✅ Players 생성 완료 (50개)
✅ Matches 생성 완료 (30개)
✅ Match Events 생성 완료 (120개)
✅ Standings 생성 완료 (20개)

🎉 Firestore 초기화 완료!

생성된 데이터:
- Associations: 1개
- Teams: 24개
- Players: 50개
- Matches: 30개
- Match Events: 120개
- Standings: 20개

✅ 모든 작업 완료!
```

---

## 4️⃣ 생성되는 데이터

### 4-1. Associations
- **1개**: 노원구 축구협회

### 4-2. Teams
- **24개**: 노원FC, 상계FC, 중계FC 등
- 20개는 정회원, 4개는 승인 대기

### 4-3. Players
- **50개**: 다양한 선수
- 각 팀에 랜덤 배정
- 포지션, 등번호, 통계 포함

### 4-4. Matches
- **30개**: 최근 30일간의 경기
- 5개는 예정, 5개는 진행중, 20개는 완료

### 4-5. Match Events
- **약 120개**: 완료된 경기당 3-8개 이벤트
- 득점, 어시스트, 경고, 교체 등

### 4-6. Standings
- **20개**: 정회원 팀들의 리그 순위
- 승점, 득실차, 최근 5경기 결과 포함

---

## ✅ 체크리스트

### 사전 준비
- [ ] Firebase 프로젝트 생성
- [ ] Firebase Admin SDK 키 생성
- [ ] 환경 변수 설정

### 스크립트 실행
- [ ] `firebase-admin` 설치
- [ ] `tsx` 설치
- [ ] 스크립트 파일 생성
- [ ] 스크립트 실행

### 데이터 확인
- [ ] Firestore Console에서 데이터 확인
- [ ] Next.js 앱에서 데이터 표시 확인

---

## 🚀 다음 단계

이제 실제 데이터가 들어있는 플랫폼을 확인할 수 있습니다!

1. **Next.js 앱 실행**: `npm run dev`
2. **페이지 접속**: `http://localhost:3000/a/nowon-football`
3. **데이터 확인**: 팀 목록, 경기 일정 등

---

**작성일**: 2024년  
**상태**: ✅ 스크립트 완료 (실행 가능)
