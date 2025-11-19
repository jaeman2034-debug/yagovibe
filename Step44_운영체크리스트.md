# Step 44: 팀별 통합 대시보드 + 실시간 알람 운영 체크리스트

## ✅ 1. 환경 변수 설정

### Firebase Functions 환경 변수

```bash
# Slack Webhook
firebase functions:config:set slack.webhook_url="<SLACK_WEBHOOK_URL>"

# Gmail SMTP
firebase functions:config:set smtp.user="your-email@gmail.com"
firebase functions:config:set smtp.pass="your-app-password"

# 알림 수신 대상
firebase functions:config:set alert.email_to="admin@yago-vibe.com"

# Twilio SMS (선택적)
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your-auth-token"
firebase functions:config:set twilio.from_phone="+1234567890"
firebase functions:config:set alert.phone="+1234567890"
```

### 환경 변수 확인

```bash
firebase functions:config:get
```

### Gmail App Password 생성

1. Google 계정 설정 > 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 비밀번호를 `smtp.pass`에 설정

### Twilio 설정 (선택적)

1. Twilio 계정 생성: https://www.twilio.com
2. Account SID 및 Auth Token 확인
3. 전화번호 구매 또는 Trial 번호 사용
4. 환경 변수에 설정

## ✅ 2. Firestore Security Rules

### 보안 규칙 설정

Firebase Console > Firestore Database > Rules에서 다음 규칙 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 팀 문서: 팀 멤버만 읽기 가능, Owner만 쓰기 가능
    match /teams/{teamId} {
      // 읽기: 팀 멤버 (owners, coaches, members)
      allow read: if request.auth != null && (
        request.auth.uid in resource.data.get('owners', []) ||
        request.auth.uid in resource.data.get('coaches', []) ||
        request.auth.uid in resource.data.get('members', []) ||
        request.auth.token.email.matches('.*@yagovibe\\.com$') ||
        request.auth.token.email.matches('.*admin.*')
      );
      
      // 쓰기: Owner만 가능
      allow write: if request.auth != null && 
                     request.auth.uid in resource.data.get('owners', []);
      
      // 팀 리포트
      match /reports/{reportId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
                       request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []);
        
        // 품질 리포트
        match /qualityReports/{qualityReportId} {
          allow read: if request.auth != null;
          allow create: if request.auth != null;
          allow update, delete: if false; // Functions에서만 관리
        }
      }
      
      // 역할 관리
      match /roles/{userId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && 
                           request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []);
      }
      
      // 알림 로그: Owner 및 관리자만 읽기 가능
      match /alerts/{alertId} {
        allow read: if request.auth != null && (
          request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
          request.auth.token.email.matches('.*@yagovibe\\.com$') ||
          request.auth.token.email.matches('.*admin.*')
        );
        allow write: if false; // Functions에서만 쓰기
      }
    }
  }
}
```

### 보안 규칙 테스트

1. Firebase Console > Firestore Database > Rules
2. "Rules Playground"에서 테스트:
   - Owner: 읽기/쓰기 가능
   - Coach: 읽기만 가능
   - Member: 읽기만 가능
   - 비멤버: 접근 불가

## ✅ 3. Collection Group 인덱스 생성

### 필요한 인덱스

`qualityReports` collection group 쿼리를 위해 다음 인덱스가 필요합니다:

#### 인덱스 1: 최근 24시간 품질 리포트

```
컬렉션 ID: qualityReports (collection group)
필드: createdAt (오름차순)
```

#### 인덱스 2: 최근 7일 품질 리포트

```
컬렉션 ID: qualityReports (collection group)
필드: createdAt (오름차순)
```

### 인덱스 생성 방법

#### 방법 1: Firebase Console에서 자동 생성

1. Firebase Console > Firestore Database > Indexes
2. Functions 실행 시 오류 메시지에서 인덱스 생성 링크 클릭
3. "Create Index" 버튼 클릭

#### 방법 2: 수동 생성

1. Firebase Console > Firestore Database > Indexes
2. "Create Index" 클릭
3. 설정:
   - Collection ID: `qualityReports` (Collection Group)
   - Fields:
     - `createdAt` (Ascending)
   - Query scope: Collection group
4. "Create" 클릭

#### 방법 3: firebase.json에 정의

```json
{
  "firestore": {
    "indexes": "firestore.indexes.json"
  }
}
```

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "qualityReports",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

배포:
```bash
firebase deploy --only firestore:indexes
```

### 인덱스 생성 상태 확인

```bash
firebase firestore:indexes
```

## ✅ 4. 스케줄러 점검

### Cloud Scheduler 설정 확인

`hourlyTeamRollupAndAlert` 함수는 Cloud Scheduler로 자동 실행됩니다.

#### 확인 방법

1. Firebase Console > Functions > Schedules
2. `hourlyTeamRollupAndAlert` 스케줄 확인:
   - Schedule: `every 1 hours`
   - Time Zone: `Asia/Seoul`
   - Status: Enabled

#### 수동 실행 테스트

```bash
# Firebase Console에서 수동 실행
# 또는 curl로 테스트
curl -X POST \
  https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/hourlyTeamRollupAndAlert \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

### 스케줄러 상태 모니터링

1. Firebase Console > Functions > Logs
2. `hourlyTeamRollupAndAlert` 실행 로그 확인
3. 오류 발생 시 알림 설정

## ✅ 5. 팀 문서 초기 설정

### 팀 문서 생성 예시

```typescript
// Cloud Function 또는 Admin SDK에서
import * as admin from "firebase-admin";

const teamId = "SOHEUL_FC";
await admin.firestore().collection("teams").doc(teamId).set({
  name: "소흘 FC",
  owners: ["owner1@example.com"],
  coaches: ["coach1@example.com"],
  members: ["member1@example.com"],
  
  // 임계치 설정
  thresholds: {
    scoreDrop: 0.1,      // 점수 급락 임계치
    coverageMin: 0.9,   // 커버리지 최소값
    gapMax: 10,         // Gaps 최대값
    overlapMax: 8,      // Overlaps 최대값
  },
  
  // 알림 수신 대상
  alertTargets: {
    emails: ["admin@yago-vibe.com", "coach1@example.com"],
    phones: ["+821012345678"], // Twilio 사용 시
  },
  
  // 초기 메트릭
  metrics: {
    lastScore: 0,
    lastCoverage: 0,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
});
```

## ✅ 6. 리포트를 팀에 연결

### 기존 리포트 마이그레이션

기존 `reports` 컬렉션의 리포트를 팀 구조로 마이그레이션:

```typescript
// Cloud Function 또는 Admin SDK에서
import * as admin from "firebase-admin";

async function migrateReportsToTeam(teamId: string) {
  const reports = await admin.firestore().collection("reports")
    .where("teamId", "==", teamId)
    .get();
  
  for (const reportDoc of reports.docs) {
    const reportData = reportDoc.data();
    const reportId = reportDoc.id;
    
    // 팀 리포트로 복사
    await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("reports").doc(reportId)
      .set(reportData);
    
    // 품질 리포트도 복사
    const qualityReports = await admin.firestore()
      .collection("reports").doc(reportId)
      .collection("qualityReports")
      .get();
    
    const batch = admin.firestore().batch();
    qualityReports.forEach((qrDoc) => {
      const ref = admin.firestore()
        .collection("teams").doc(teamId)
        .collection("reports").doc(reportId)
        .collection("qualityReports").doc(qrDoc.id);
      batch.set(ref, qrDoc.data());
    });
    await batch.commit();
  }
}
```

## ✅ 7. 모니터링 및 알림

### Functions 로그 모니터링

```bash
# 실시간 로그 확인
firebase functions:log

# 특정 함수 로그만 확인
firebase functions:log --only onTeamQualityCreated
firebase functions:log --only hourlyTeamRollupAndAlert
```

### 알림 발송 확인

1. **Slack**: Slack 채널에서 메시지 확인
2. **Email**: 수신자 이메일 확인
3. **SMS**: Twilio Console > Logs에서 확인

### 오류 처리

1. Functions 로그에서 오류 확인
2. 알림 발송 실패 시 재시도 로직 확인
3. Firestore 데이터 무결성 확인

## ✅ 8. 성능 최적화

### Collection Group 쿼리 최적화

- 인덱스가 올바르게 생성되었는지 확인
- 불필요한 쿼리 최소화
- 데이터 범위 제한 (최근 24시간, 7일)

### 배치 처리

- 여러 알림을 한 번에 발송
- Firestore 배치 쓰기 사용

## ✅ 9. 테스트 체크리스트

### 단위 테스트

- [ ] 팀 문서 생성 테스트
- [ ] 품질 리포트 생성 시 집계 테스트
- [ ] 임계치 위반 알림 테스트
- [ ] Slack/Email/SMS 발송 테스트

### 통합 테스트

- [ ] 팀 대시보드 로드 테스트
- [ ] 실시간 데이터 업데이트 테스트
- [ ] 권한 체크 테스트
- [ ] 알림 로그 기록 테스트

## ✅ 10. 배포 체크리스트

### 배포 전 확인

- [ ] 환경 변수 설정 완료
- [ ] Firestore Security Rules 배포
- [ ] Collection Group 인덱스 생성
- [ ] Functions 코드 검토
- [ ] 테스트 완료

### 배포 명령

```bash
# Functions 배포
firebase deploy --only functions:onTeamQualityCreated,hourlyTeamRollupAndAlert

# Security Rules 배포
firebase deploy --only firestore:rules

# 인덱스 배포
firebase deploy --only firestore:indexes
```

### 배포 후 확인

- [ ] Functions 정상 실행 확인
- [ ] 스케줄러 활성화 확인
- [ ] 알림 발송 테스트
- [ ] 대시보드 접근 테스트

## 📚 참고 문서

- [Firebase Functions 환경 변수](https://firebase.google.com/docs/functions/config-env)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Collection Group 쿼리](https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)

