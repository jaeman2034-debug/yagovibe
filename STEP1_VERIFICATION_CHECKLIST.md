# ✅ STEP 1: 팀 생성 검증 체크리스트

## 📌 기준 정보

- **associationId**: `RAd4wAbqcsjcVBGLeFiw`
- **경로**: `/association/RAd4wAbqcsjcVBGLeFiw/admin/teams`
- **Firestore 경로**: `associations/RAd4wAbqcsjcVBGLeFiw/teams/{teamId}`

---

## 🎯 검증 항목

### 1️⃣ Firestore 실서비스 콘솔 확인

- [ ] Firebase Console 접속
- [ ] Firestore Database → Data 탭
- [ ] 경로: `associations/RAd4wAbqcsjcVBGLeFiw/teams`
- [ ] 팀 문서 1개 이상 생성 확인
- [ ] 필드 구조 확인 (name, managerName, phone, status, createdAt)

### 2️⃣ 실서비스 URL에서 팀 리스트 확인

- [ ] 실서비스 URL 접속: `https://yago-vibe-spt.web.app`
- [ ] 관리자 계정으로 로그인
- [ ] `/association/RAd4wAbqcsjcVBGLeFiw/admin/teams` 접속
- [ ] 팀 리스트 노출 확인
- [ ] 생성한 팀 정보 표시 확인 (팀명, 감독, 연락처)

### 3️⃣ Member 계정 권한 확인

- [ ] 일반 계정(member)으로 로그인
- [ ] `/association/RAd4wAbqcsjcVBGLeFiw/admin/teams` 접속
- [ ] "팀 추가" 버튼 숨김 확인
- [ ] 팀 리스트는 조회 가능 확인

---

## 📊 PASS 조건

**증거 1개만 보내도 PASS**:
- ✅ Firestore 콘솔 스크린샷 (teams 문서 생성 확인)
- ✅ 실서비스 URL 스크린샷 (팀 리스트 표시)
- ✅ 또는 "teams 문서 생성 확인" 텍스트

---

## 🔜 다음 단계

**PASS 확인 시 → STEP 2: 대진표 자동 생성**
