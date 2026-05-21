# 🔥 Firestore Rules 배포 가이드 (즉시 해결)

**현재 상태**: 프로필 저장 실패 (permission-denied)  
**원인**: Firestore Rules가 배포되지 않음  
**해결**: Rules 배포 (5분 컷)

---

## ✅ STEP 1. 프로젝트 ID 확인 (완료)

**확인된 프로젝트 ID**: `yago-vibe-spt`

```typescript
// src/lib/firebase.ts
projectId: "yago-vibe-spt"
```

---

## ✅ STEP 2. Firestore 콘솔 이동

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/firestore
   ```

2. **상단 프로젝트명 확인**
   - 반드시 `yago-vibe-spt`인지 확인
   - 다른 프로젝트면 드롭다운에서 `yago-vibe-spt` 선택

---

## ✅ STEP 3. Rules 탭 이동

1. **Firestore Database** → **Rules** 탭 클릭
2. 현재 Rules 확인

---

## ✅ STEP 4. Rules 수정 (정답 Rules)

아래 Rules를 **전체 교체**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(associationId) {
      return isSignedIn()
        && exists(/databases/$(database)/documents/associations/$(associationId))
        && get(/databases/$(database)/documents/associations/$(associationId))
           .data.ownerUid == request.auth.uid;
    }

    function isAdmin(associationId) {
      let isMemberAdmin = isSignedIn()
        && exists(/databases/$(database)/documents/associations/$(associationId)/members/$(request.auth.uid))
        && get(/databases/$(database)/documents/associations/$(associationId)/members/$(request.auth.uid))
           .data.role == "admin";
      
      let isAdminUid = isSignedIn()
        && exists(/databases/$(database)/documents/associations/$(associationId))
        && get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list
        && request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
      
      return isMemberAdmin || isAdminUid;
    }

    function isAssociationAdmin(associationId) {
      return isOwner(associationId) || isAdmin(associationId);
    }

    function isGlobalAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }

    /* 🔥 Users (프로필 저장 필수) */
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    /* Stories */
    match /stories/{storyId} {
      allow read: if true;
      allow write: if isSignedIn();
    }

    /* Tournaments */
    match /tournaments/{tournamentId} {
      allow read: if true;
      allow write: if isSignedIn();
    }

    /* Market Products */
    match /marketProducts/{productId} {
      allow read: if true;
      allow write: if isSignedIn();
    }

    /* Team Members */
    match /team_members/{memberId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    /* Notifications */
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if false;
      allow delete: if false;
    }

    /* Activity Logs */
    match /activityLogs/{logId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    /* Tournament Results */
    match /tournamentResults/{resultId} {
      allow read: if isSignedIn();
      allow create, update: if isGlobalAdmin() || isSignedIn();
      allow delete: if false;
    }

    /* Team Join Requests */
    match /teamJoinRequests/{requestId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if false;
    }

    /* Teams */
    match /teams/{teamId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.ownerUid == request.auth.uid ||
        request.auth.uid in resource.data.get('owners', [])
      );
      allow delete: if false;
      
      match /members/{memberId} {
        allow read: if isSignedIn();
        allow create: if false;
        allow update: if isSignedIn() && (
          get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid ||
          request.auth.uid == memberId
        );
        allow delete: if isSignedIn() && 
          get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid;
      }
      
      match /events/{eventId} {
        allow read: if isSignedIn();
        allow write: if isSignedIn();
      }
    }

    /* Association root */
    match /associations/{associationId} {
      allow read: if isSignedIn();
      allow write: if isAssociationAdmin(associationId);

      match /members/{userId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn() && (
          request.auth.uid == userId ||
          isAssociationAdmin(associationId)
        );
        allow update: if isSignedIn() && (
          request.auth.uid == userId ||
          isAssociationAdmin(associationId)
        );
        allow delete: if isSignedIn() && isAssociationAdmin(associationId);
      }

      match /notices/{noticeId} {
        allow read: if true;
        allow write: if isAssociationAdmin(associationId);
      }

      match /teams/{teamId} {
        allow read: if isSignedIn();
        allow write: if isAssociationAdmin(associationId);
      }

      match /tournaments/{tournamentId} {
        allow read: if 
          resource.data.adminStatus == "published" || 
          isAssociationAdmin(associationId);
        
        allow create: if isSignedIn() && (
          request.resource.data.adminStatus == "draft" ||
          (request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId))
        );
        
        allow update: if isSignedIn() && (
          (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "draft" && resource.data.createdBy == request.auth.uid) ||
          (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
          (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
          (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "draft" && isAssociationAdmin(associationId))
        );
        
        allow delete: if isAssociationAdmin(associationId);

        match /applications/{applicationId} {
          allow create: if isSignedIn();
          allow read: if isSignedIn() && (
            resource.data.createdBy == request.auth.uid ||
            resource.data.userId == request.auth.uid ||
            isAssociationAdmin(associationId)
          );
          allow update, delete: if isAssociationAdmin(associationId);
        }
        
        match /teams/{teamId} {
          allow read: if isAssociationAdmin(associationId);
          allow create: if isAssociationAdmin(associationId);
          allow update: if isAssociationAdmin(associationId);
          allow delete: if isAssociationAdmin(associationId);
          
          match /players/{playerId} {
            allow read: if isSignedIn() && (
              resource.data.createdBy == request.auth.uid ||
              get(/databases/$(database)/documents/associations/$(associationId)/tournaments/$(tournamentId)/teams/$(teamId)).data.captainUid == request.auth.uid ||
              isAssociationAdmin(associationId)
            );
            allow write: if false;
          }
        }
        
        match /stats/{statId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /phaseEvents/{eventId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /divisions/{divisionId} {
          allow read: if isSignedIn();
          allow write: if false;
        }
        
        match /drawLogs/{logId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /test_drawLogs/{logId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /test_groups/{groupId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /venues/{venueId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /matches/{matchId} {
          allow read: if isSignedIn();
          allow write: if false;
          
          match /rosters/{rosterId} {
            allow read: if isAssociationAdmin(associationId);
            allow write: if false;
          }
          
          match /checkins/{checkinId} {
            allow read: if isAssociationAdmin(associationId);
            allow write: if false;
          }
          
          match /cards/{cardId} {
            allow read: if isAssociationAdmin(associationId);
            allow write: if false;
          }
          
          match /memos/{memoId} {
            allow read: if isAssociationAdmin(associationId);
            allow write: if false;
          }
        }
        
        match /rounds/{roundId} {
          allow read: if isSignedIn();
          allow write: if false;
        }
        
        match /logs/{logId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /opsLogs/{logId} {
          allow read: if isAssociationAdmin(associationId);
          allow write: if false;
        }
        
        match /teamsSnapshot/{teamId} {
          allow read: if isSignedIn();
          allow write: if false;
        }
      }
    }
  }
}
```

---

## ✅ STEP 5. Rules 저장 및 배포

1. **Rules 편집기에서 위 Rules 붙여넣기**
2. **"게시" (Publish) 버튼 클릭**
3. **배포 완료 대기 (30~60초)**

---

## ✅ STEP 6. 강력 새로고침

1. **브라우저에서 Ctrl + Shift + R** (Hard Reload)
2. 또는 **시크릿 모드에서 테스트**

---

## ✅ STEP 7. 재시도 플로우

1. `/profile/setup` 진입
2. 종목 / 지역 / 소개 입력
3. [완료] 클릭
4. 팝업 없이 저장 성공
5. `/teams/find` 자동 이동
6. [팀 만들기] 클릭
7. 팀 생성 성공
8. `/me`에서 Persona P3 (팀장) 확인

---

## 🔥 핵심 포인트

**프로젝트 ID**: `yago-vibe-spt` (확인 완료)  
**에뮬레이터**: 사용 안 함 (확인 완료)  
**Rules 배포**: Firebase Console에서 Publish 필수

---

## ❗ 만약 여전히 안 되면

1. **Firebase Console → Firestore → Rules 탭**
2. **Rules가 정말 저장되었는지 확인**
3. **콘솔에 에러 메시지 확인**
4. **브라우저 개발자 도구 → Network 탭에서 Firestore 요청 확인**

---

**Rules 배포 후 바로 동작합니다!**
