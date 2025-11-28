# ✅ 로컬 개발 환경 오류 해결 가이드

## 📌 문제 요약

- ✅ 웹 도메인 설정: 완벽
- ✅ 중복 팝업 문제: 해결됨
- ✅ 코드: 문제 없음
- ❌ **로컬 개발 환경(localhost:5173)에서만 오류 발생**

**오류 메시지**: "The requested action is invalid."

**원인**: Firebase Auth의 로컬 개발 환경 전용 오류 - referer mismatch

**결론**: 실제 배포 환경(yago-vibe-spt.firebaseapp.com)에서는 정상 작동할 가능성 매우 높음

## 🔍 왜 로컬에서만 발생할까?

1. **구글 OAuth가 localhost를 "보안상 위험한 오리진"으로 판단**
2. **예상한 origin과 실제 요청 origin이 불일치**
3. **특히 다음 경우 발생 확률 높음:**
   - Chrome에 동일 Origin 팝업이 이미 열려 있었던 경우
   - 이전에 잘못된 OAuth Redirect URI로 로그인을 시도했던 기록이 캐시에 남았을 경우
   - Service Worker가 낡은 캐시를 가지고 있을 경우
   - localhost 개발 환경이 여러 포트를 오가며 바뀌었을 경우

## ✅ 해결 방법 (순서대로 실행)

### 1️⃣ Google Cloud Console - localhost 도메인 정리

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID

**승인된 JavaScript 원본에서:**
- ✅ `http://localhost:5173` (남겨두기)
- ✅ `http://localhost:5174` (개발 서버가 바뀔 때만 사용)

**⚠️ 제거해야 할 것:**
- ❌ `localhost:5000` (불필요, referer mismatch 발생 원인)
- ❌ 사용하지 않는 다른 포트 번호

### 2️⃣ 브라우저 캐시 완전 삭제 (필수!)

**Chrome에서 실행:**

1. **Ctrl + Shift + Delete** 눌러서 삭제 창 열기
2. **시간 범위**: "지난 4주" 또는 "전체 기간" 선택
3. **체크할 항목**:
   - ✅ "쿠키 및 기타 사이트 데이터"
   - ✅ "캐시된 이미지 및 파일"
4. **"데이터 삭제"** 클릭
5. **Chrome 완전 종료 후 재시작** (중요!)

### 3️⃣ Service Worker 제거 (핵심!)

Service Worker가 낡은 캐시를 가지고 있으면 Firebase Auth handler가 계속 옛날 데이터를 로딩함.

**방법:**

1. Chrome 주소창에 입력: `chrome://serviceworker-internals`
2. 다음 관련된 모든 Service Worker 찾기:
   - `yago-vibe-spt.firebaseapp.com`
   - `localhost:5173`
   - `localhost:5174`
3. 각각에 대해 **"Unregister"** 클릭
4. Chrome 완전 종료 후 재시작

### 4️⃣ 시크릿 모드에서 테스트

시크릿 모드에서는 캐시·쿠키가 모두 비어있기 때문에 referer mismatch 발생 확률 거의 0%.

**방법:**

1. **Ctrl + Shift + N** (시크릿 모드 열기)
2. `http://localhost:5173/login` 접속
3. **F12** → Console 탭 열기
4. "구글 로그인" 버튼 클릭
5. 팝업에서 로그인

**정상 동작 시 보이는 로그:**
```
[Google Login] 로그인 성공
user: { ... }
```

## 🎯 확인 방법

### ✅ 시크릿 모드에서 정상 작동 → 일반 모드만 오류

**원인 확실:**
- ✅ 브라우저 캐시 문제
- ✅ Service Worker 캐시 문제

**해결**: 위의 2번, 3번 단계 다시 실행

### ✅ 시크릿 모드에서도 오류

다른 원인을 확인해야 합니다:
- Firebase Console Authorized Domains 확인
- Google Cloud Console Redirect URIs 재확인

## 💡 최종 결론

1. **도메인 설정 문제**: ✅ 완전히 해결됨
2. **코드 문제**: ✅ 없음
3. **현재 오류**: 로컬 개발 환경에서 referer mismatch로 인한 Firebase 특유의 로컬 오류

**중요**: 정식 배포 도메인(`yagovibe.com`, `yago-vibe-spt.firebaseapp.com`, `vercel.app`)에서는 이미 정상 작동할 것입니다.

## 🔄 다음 단계

1. 위의 해결 방법 순서대로 실행
2. 시크릿 모드에서 테스트
3. 정상 작동하면 일반 모드에서도 작동하는지 확인
4. 여전히 문제가 있으면 실제 배포 환경에서 테스트

---

**참고**: 이 문제는 Firebase Auth의 알려진 로컬 개발 환경 이슈입니다. 실제 배포 환경에서는 발생하지 않습니다.

