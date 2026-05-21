# 🔥 DNS 설정 분석 및 수정 가이드

## ✅ 현재 상태 확인

### Firebase Hosting
- ✅ `yagovibe.com` (커스텀, 연결됨)
- ✅ `www.yagovibe.com` (커스텀, 연결됨)
- ✅ 두 도메인 모두 Firebase에 정상 연결됨

### Gabia DNS 설정
현재 DNS 레코드:
1. **CNAME**: `www` → `yago-vibe-spt.web.app.`
2. **TXT**: `@` → `"hosting-site=yago-vibe-spt"`
3. **A**: `@` → `199.36.158.100`

---

## ⚠️ 발견된 문제

### 문제 1: www CNAME 값이 Firebase 권장값과 다름

**현재:**
```
www → CNAME → yago-vibe-spt.web.app.
```

**Firebase 권장값:**
```
www → CNAME → ghs.googlehosted.com
```

**영향:**
- 현재 설정도 작동할 수 있지만, Firebase의 권장값을 사용하는 것이 더 안정적입니다.
- 특히 카카오톡 인앱 브라우저에서 문제가 발생할 수 있습니다.

---

## ✅ 해결 방법

### 방법 1: www CNAME을 Firebase 권장값으로 변경 (권장)

**Gabia DNS 관리에서:**

1. [Gabia DNS 관리](https://dns.gabia.com/) 접속
2. `yagovibe.com` 선택
3. "레코드 수정" 클릭
4. `www` CNAME 레코드 수정:
   - **호스트**: `www`
   - **타입**: `CNAME`
   - **값/위치**: `ghs.googlehosted.com` (변경)
   - **TTL**: `600` (유지)
5. 저장

**변경 후:**
```
www → CNAME → ghs.googlehosted.com
```

---

### 방법 2: firebase.json에 리디렉션 추가 (선택)

도메인 간 리디렉션을 명시적으로 설정:

```json
{
  "hosting": {
    "site": "yago-vibe-spt",
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "redirects": [
      {
        "source": "https://yagovibe.com/**",
        "destination": "https://www.yagovibe.com/**",
        "type": 301
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 🧪 확인 체크리스트

변경 후 다음을 확인하세요:

- [ ] `https://yagovibe.com` → 외부 브라우저 OK
- [ ] `https://www.yagovibe.com` → 외부 브라우저 OK
- [ ] 카카오톡 인앱 브라우저 → 정상 열림
- [ ] DNS 전파 확인 (최대 24시간, 보통 몇 분~몇 시간)

---

## 📝 DNS 전파 확인 방법

### 온라인 도구 사용:
1. [whatsmydns.net](https://www.whatsmydns.net/#CNAME/www.yagovibe.com)
2. `www.yagovibe.com` CNAME 확인
3. 전 세계 DNS 서버에서 `ghs.googlehosted.com`로 확인되면 완료

### 명령줄에서 확인:
```bash
# Windows
nslookup www.yagovibe.com

# Linux/Mac
dig www.yagovibe.com CNAME
```

---

## 🎯 최종 권장 사항

1. **www CNAME을 `ghs.googlehosted.com`으로 변경** (가장 중요)
2. **firebase.json에 리디렉션 추가** (선택, 하지만 권장)
3. **DNS 전파 대기** (최대 24시간)
4. **카카오톡 캐시 삭제 후 재시도**

---

**작성일**: 2024년  
**상태**: ✅ 분석 완료, 수정 필요


