# 🔍 SSL 인증서 상태 확인 가이드

## ✅ 확인 완료
- Firebase Console에서 `www.yagovibe.com` 도메인 **"연결됨"** 확인됨

## 🔍 다음 확인 사항

### 1️⃣ SSL 인증서 상태 확인
Firebase Console에서:
1. `www.yagovibe.com` 클릭 (또는 세로 점 3개 메뉴)
2. **"Certificate status"** 확인:
   - ✅ **Active (활성)**: 정상 작동해야 함
   - ⏳ **Pending (대기 중)**: 최대 15분 대기 필요
   - ❌ **Failed (실패)**: DNS 재설정 필요

### 2️⃣ 기본 도메인 접속 테스트
브라우저에서 확인:
- `https://yago-vibe-spt.web.app` 
  - ✅ 접속 OK → 도메인/DNS 문제
  - ❌ 접속 안 됨 → 배포 문제

### 3️⃣ DNS 설정 확인 (Cloudflare)
Cloudflare Dashboard에서 확인:
- `www` → `yago-vibe-spt.web.app` (또는 `ghs.googlehosted.com`)
- Proxy 상태: **회색 (DNS only)** 필수
- TTL: Auto

## 🔧 해결 방법

### Case 1: SSL 인증서가 "Pending"
- **대기**: 최대 15분 후 다시 확인
- 보통 5~10분 내 발급 완료

### Case 2: SSL 인증서가 "Failed"
1. Cloudflare DNS에서 `www` CNAME 레코드 확인
2. Proxy를 **회색 (DNS only)**으로 변경
3. Firebase Console에서 도메인 재연결 시도

### Case 3: 기본 도메인도 안 됨
```bash
# 재배포 실행
npm run build
firebase deploy --only hosting
```

### Case 4: DNS 문제
Cloudflare에서:
1. `www` CNAME 레코드 삭제
2. Firebase Console에서 도메인 제거
3. 도메인 재추가 및 TXT 레코드 설정
4. SSL 재발급 대기

## 📋 빠른 체크리스트
- [ ] SSL 인증서 상태 확인 (Active/Pending/Failed)
- [ ] 기본 도메인 (`yago-vibe-spt.web.app`) 접속 테스트
- [ ] Cloudflare DNS 설정 확인 (Proxy: 회색)
- [ ] 필요시 재배포

---

**SSL 인증서 상태를 알려주시면 다음 단계 안내하겠습니다!**
