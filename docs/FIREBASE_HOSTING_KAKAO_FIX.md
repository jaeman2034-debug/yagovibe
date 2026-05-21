# 🔥 Firebase Hosting + 카카오톡 인앱 브라우저 오류 해결 가이드

## ❌ 문제 증상

- 외부 브라우저: 정상 작동 ✅
- 카카오톡 인앱 브라우저: `DNS_PROBE_FINISHED_NXDOMAIN` 또는 연결 실패 ❌

---

## 🔍 원인

### 핵심 원인

1. **www 서브도메인 미연결** (최다 발생)
   - Firebase는 기본적으로 `example.com`만 제공
   - `www.example.com`은 직접 추가해야 함
   - 카카오톡이 자동으로 `www.`를 붙여 접근 → DNS 없음 → 실패

2. **Firebase 기본 도메인 ↔ 커스텀 도메인 리디렉션**
   - `https://project.web.app` → `https://example.com`
   - 카톡 인앱 브라우저가 DNS 단계에서 실패

3. **Firebase SSL 인증서 발급 상태**
   - 발급 완료 전 또는 DNS 변경 직후
   - 외부 브라우저 OK / 카톡만 실패

---

## ✅ 해결 방법

### 🔧 1단계: www 서브도메인 Firebase에 추가 (가장 중요)

#### Firebase Console에서:

1. [Firebase Console](https://console.firebase.google.com/project/yago-vibe-spt/hosting) 접속
2. **Hosting** → **Custom domains** 클릭
3. **"도메인 추가"** 클릭
4. `www.도메인.com` 입력 (예: `www.yagovibe.com`)
5. Firebase가 DNS 설정 안내 제공

#### DNS 설정 (도메인 제공업체에서):

**www 서브도메인 추가:**
```
Type: CNAME
Name: www
Value: ghs.googlehosted.com
TTL: 3600 (또는 자동)
```

**확인:**
- ✅ `도메인.com` → Firebase 연결됨
- ✅ `www.도메인.com` → Firebase 연결됨

---

### 🔧 2단계: 리디렉션 한 쪽으로 통일

#### 방법 A: firebase.json에 redirects 추가 (권장)

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
        "source": "/**",
        "destination": "https://www.도메인.com",
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

**또는 도메인.com → www.도메인.com 리디렉션:**

```json
{
  "hosting": {
    "redirects": [
      {
        "source": "https://도메인.com/**",
        "destination": "https://www.도메인.com/**",
        "type": 301
      }
    ]
  }
}
```

#### 방법 B: Firebase Console에서 기본 도메인 지정

1. Firebase Console → Hosting → Custom domains
2. 기본 도메인으로 `www.도메인.com` 선택
3. 저장

---

### 🔧 3단계: 카톡에 걸린 링크를 최종 주소로 변경

**❌ 사용 금지:**
- `http://도메인.com`
- `https://도메인.com` (www 미설정 시)

**✅ 사용 권장:**
- `https://www.도메인.com`

**카카오톡 링크 업데이트:**
- 카카오톡 채널 관리자 센터
- 메뉴/버튼 링크 모두 `https://www.도메인.com`으로 변경

---

### 🔧 4단계: 캐시 삭제

#### 카카오톡 캐시 삭제:

1. 카카오톡 앱 설정
2. 앱 정보 → 저장 공간
3. 캐시 삭제
4. 최소 10~30분 후 재시도

#### 또는:

- 카카오톡 앱 재설치
- 기기 재시작

---

## 🧪 확인 체크리스트

아래 3가지 모두 되면 100% 해결입니다:

- [ ] `https://도메인.com` → 외부 브라우저 OK
- [ ] `https://www.도메인.com` → 외부 브라우저 OK
- [ ] 카카오톡 인앱 브라우저 → 정상 열림

---

## 📝 현재 firebase.json 상태

현재 설정:
```json
{
  "hosting": {
    "site": "yago-vibe-spt",
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**추가 필요:**
- `redirects` 설정 (www 리디렉션)

---

## 🎯 결론

Firebase Hosting은 www를 자동으로 처리해주지 않으며,
카카오톡 인앱 브라우저는 www를 강제로 붙이는 경우가 많아
`DNS_PROBE_FINISHED_NXDOMAIN`이 발생합니다.

**해결:**
1. `www.도메인.com` Firebase에 추가
2. DNS에 CNAME 레코드 추가
3. `firebase.json`에 redirects 추가
4. 카톡 링크를 `https://www.도메인.com`으로 변경

---

## 📸 확인 필요 정보

원하시면 다음 정보를 주시면 정확히 알려드립니다:

1. **실제 도메인 주소** (예: `yagovibe.com`)
2. **Firebase Hosting → Custom domains 화면 캡처**
3. **DNS 설정 화면 캡처** (도메인 제공업체)

---

**작성일**: 2024년  
**상태**: ✅ 해결 가이드 완료


