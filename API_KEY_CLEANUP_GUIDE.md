# 🧹 API 키 웹사이트 제한사항 정리 가이드

## ✅ 유지해야 할 항목 (필수)

### 프로덕션 도메인
- ✅ `https://yagovibe.com/*` (19번) - **유지**
- ✅ `https://www.yagovibe.com/*` (11번) - **유지**
- ✅ `https://yago-vibe-spt.firebaseapp.com/*` (12번) - **유지** (방금 추가됨!)
- ✅ `https://yago-vibe-spt.web.app/*` (14번) - **유지**

### 개발용 도메인
- ✅ `http://localhost:5173/*` (3번) - **유지** (개발용)

### Vercel 도메인 (사용 중이면 유지)
- ✅ `https://yagovibe.vercel.app/*` (21번) - **사용 중이면 유지**
- ⚠️ `https://yagovibe-lqmh.vercel.app/*` (16번) - **사용하지 않으면 삭제**

---

## ❌ 삭제해야 할 항목

### 1. 중복 항목 (와일드카드 버전이 있으므로 불필요)

#### yagovibe.com 관련
- ❌ `https://yagovibe.com` (17번) - 삭제 (19번 `/*` 버전이 있으면 충분)
- ❌ `https://yagovibe.com/` (18번) - 삭제 (19번 `/*` 버전이 있으면 충분)

#### www.yagovibe.com 관련
- ❌ `https://www.yagovibe.com` (9번) - 삭제 (11번 `/*` 버전이 있으면 충분)
- ❌ `https://www.yagovibe.com/` (10번) - 삭제 (11번 `/*` 버전이 있으면 충분)

#### yago-vibe-spt.web.app 관련
- ❌ `https://yago-vibe-spt.web.app` (13번) - 삭제 (14번 `/*` 버전이 있으면 충분)

### 2. 중복된 localhost 항목

#### localhost 관련
- ❌ `http://localhost` (7번) - 삭제 (8번 `/*` 버전이 있으면 충분)
- ✅ `http://localhost/*` (8번) - **유지** (하지만 3번 `localhost:5173/*`가 더 구체적)

**권장**: `http://localhost:5173/*` (3번)만 유지하고 8번도 삭제 가능

#### 127.0.0.1 관련
- ❌ `http://127.0.0.1` (1번) - 삭제
- ❌ `http://127.0.0.1:5173` (2번) - 삭제 (3번 `/*` 버전이 있으면 충분)
- ✅ `http://127.0.0.1:5173/*` (3번) - **유지** (개발용)
- ❌ `http://127.0.0.1:5174` (4번) - 삭제 (5번 `/*` 버전이 있으면 충분)
- ⚠️ `http://127.0.0.1:5174/*` (5번) - **포트 5174를 사용하지 않으면 삭제**
- ❌ `http://127.0.0.1/*` (6번) - 삭제 (3번이 더 구체적)

### 3. 사용하지 않는 Vercel 도메인

- ⚠️ `https://yagovibe-lqmh.vercel.app` (15번) - **사용하지 않으면 삭제**
- ⚠️ `https://yagovibe-lqmh.vercel.app/*` (16번) - **사용하지 않으면 삭제**
- ⚠️ `https://yagovibe.vercel.app` (20번) - **사용하지 않으면 삭제** (21번 `/*` 버전이 있으면 충분)

---

## 📋 최종 정리 체크리스트

### 삭제할 항목 (총 12-15개)

#### 확실히 삭제 (9개)
1. ❌ `http://127.0.0.1` (1번)
2. ❌ `http://127.0.0.1:5173` (2번)
3. ❌ `http://127.0.0.1/*` (6번)
4. ❌ `http://localhost` (7번)
5. ❌ `https://www.yagovibe.com` (9번)
6. ❌ `https://www.yagovibe.com/` (10번)
7. ❌ `https://yago-vibe-spt.web.app` (13번)
8. ❌ `https://yagovibe.com` (17번)
9. ❌ `https://yagovibe.com/` (18번)

#### 조건부 삭제 (포트 5174 사용 안 하면)
10. ❌ `http://127.0.0.1:5174` (4번)
11. ❌ `http://127.0.0.1:5174/*` (5번)

#### 조건부 삭제 (localhost/* 사용 안 하면)
12. ❌ `http://localhost/*` (8번) - `localhost:5173/*`가 더 구체적

#### 조건부 삭제 (Vercel 도메인 사용 안 하면)
13. ❌ `https://yagovibe-lqmh.vercel.app` (15번)
14. ❌ `https://yagovibe-lqmh.vercel.app/*` (16번)
15. ❌ `https://yagovibe.vercel.app` (20번) - 21번 `/*` 버전이 있으면 충분

---

## ✅ 최종 유지 목록 (권장)

### 필수 (5개)
1. ✅ `http://localhost:5173/*` (3번) - 개발용
2. ✅ `https://yagovibe.com/*` (19번) - 프로덕션
3. ✅ `https://www.yagovibe.com/*` (11번) - 프로덕션
4. ✅ `https://yago-vibe-spt.firebaseapp.com/*` (12번) - Firebase 기본 도메인
5. ✅ `https://yago-vibe-spt.web.app/*` (14번) - Firebase 기본 도메인

### 선택 (Vercel 사용 시)
6. ✅ `https://yagovibe.vercel.app/*` (21번) - Vercel 배포용

---

## 🚀 삭제 방법

1. **각 항목의 체크박스 클릭** (삭제할 항목 선택)
2. **상단의 "삭제" 버튼 클릭** (또는 각 항목의 편집 아이콘 → 삭제)
3. **"저장" 버튼 클릭**

---

## ✅ 완료

정리 후 최종적으로 **5-6개 항목**만 남게 됩니다:
- 개발용: `localhost:5173/*`
- 프로덕션: `yagovibe.com/*`, `www.yagovibe.com/*`
- Firebase: `yago-vibe-spt.firebaseapp.com/*`, `yago-vibe-spt.web.app/*`
- Vercel (선택): `yagovibe.vercel.app/*`

이렇게 정리하면 깔끔하고 관리하기 쉽습니다!

