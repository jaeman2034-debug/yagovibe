# 🔥 STEP 3: 팀원 관리 UI 검증 가이드

## 📌 목표
팀원 목록이 보이고, admin만 팀원을 추가/관리할 수 있는 UI가 실제로 동작하는 상태

## ✅ 완료된 작업

### 1. MembersManagementPage.tsx 업데이트
- UID 직접 입력 방식으로 팀원 추가 구현
- role 선택 (admin/member)
- admin만 추가 버튼 표시 (권한 체크)
- 팀원 목록 표시 (UID, role, status, joinedAt)
- 검색 기능 (UID/role 기준)

### 2. UI 구조
- **팀원 목록**: 모든 로그인 사용자 읽기 가능
- **팀원 추가 버튼**: admin만 표시
- **팀원 추가 폼**: UID 입력 + role 선택

---

## 🔍 검증 방법

### 1. Admin 계정으로 로그인

#### 확인 사항
- [ ] 팀원 목록이 보임
- [ ] "팀원 추가" 버튼이 보임
- [ ] 팀원 추가 폼이 동작함 (UID 입력 + role 선택)
- [ ] 팀원 추가 성공 (Firestore에 문서 생성)

#### 테스트 시나리오
1. `/association/RAd4wAbqcsjcVBGLeFiw/admin/members` 접속
2. "팀원 추가" 버튼 클릭
3. UID 입력 (예: `test-member-uid-123`)
4. role 선택 (예: `member`)
5. "추가" 버튼 클릭
6. 성공 메시지 확인
7. Firestore Emulator UI에서 `members/test-member-uid-123` 문서 확인

---

### 2. Member 계정으로 로그인 (또는 admin이 아닌 계정)

#### 확인 사항
- [ ] 팀원 목록이 보임 (읽기 가능)
- [ ] "팀원 추가" 버튼이 **보이지 않음**
- [ ] 강제로 write 시도 시 permission-denied 에러

#### 테스트 시나리오
1. admin이 아닌 계정으로 로그인
2. `/association/RAd4wAbqcsjcVBGLeFiw/admin/members` 접속
3. "팀원 추가" 버튼이 없는지 확인
4. 브라우저 콘솔에서 직접 write 시도:
   ```javascript
   // 브라우저 콘솔에서 실행
   import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
   import { db } from '@/lib/firebase';
   
   await setDoc(
     doc(db, 'associations/RAd4wAbqcsjcVBGLeFiw/members/test-uid-456'),
     {
       role: 'member',
       status: 'active',
       joinedAt: serverTimestamp(),
     }
   );
   ```
5. permission-denied 에러 확인

---

### 3. Read 권한 확인 (모두 가능)

#### 확인 사항
- [ ] 로그인 여부와 관계없이 팀원 목록 조회 가능
- [ ] Rules에서 `allow read: if isSignedIn()` 확인

---

## 📊 검증 PASS 기준

아래 3가지를 모두 확인해야 STEP 3 완료:

- [ ] ✅ **검증 1**: Admin 로그인 시 팀원 목록 + 추가 버튼 보임
- [ ] ✅ **검증 2**: Member 로그인 시 목록만 보이고 추가 버튼 없음
- [ ] ❌ **검증 3**: Member로 write 시도 시 Firestore에서 차단 (permission-denied)

---

## 🎯 STEP 3 완료 시 상태

- ✅ 팀원 관리 UI 완성
- ✅ 권한 분기 (admin/member) UI 반영
- ✅ Firestore Rules로 보안 확보
- ✅ 실서비스 배포 준비 완료

---

## 🔄 다음 단계

STEP 3 통과 후:
- **STEP 4**: 실서비스 배포 체크리스트

---

## 📝 검증 결과 보고

검증 완료 후 아래 중 하나로 알려주세요:

1. **"admin/member UI 분기 확인됨"** (간단)
2. **스크린샷 2장** (admin 화면 + member 화면)
3. **검증 결과 상세 리포트** (텍스트)
