# 🔥 Service Worker 강제 제거 가이드

## 📊 문제 상황

모바일에서 `detectInAppBrowser is not defined` 및 `Minified React error #300` 오류가 발생하는 원인은 **이전에 배포된 Service Worker가 모바일 기기에 캐싱되어 있어서** 최신 코드가 로드되지 않기 때문입니다.

## ✅ 해결 방법

### 1. 코드 수정 완료

`index.html`에 Service Worker 강제 제거 스크립트를 추가했습니다. 이 스크립트는:

- ✅ 앱 시작 시 모든 Service Worker 등록 해제
- ✅ 모든 캐시 삭제
- ✅ 최신 코드 로드 보장

### 2. 빌드 및 배포

```bash
# 빌드 캐시 삭제
rm -rf dist
rm -rf node_modules/.vite

# 빌드
npm run build

# 배포
firebase deploy --only hosting
```

### 3. 모바일에서 테스트

#### 방법 1: 브라우저 앱 데이터 완전 삭제 (권장)

**안드로이드**:
1. 설정 → 앱 → Chrome (또는 사용 중인 브라우저)
2. 저장공간 → 데이터 삭제
3. 기기 재부팅
4. 시크릿 모드로 접속하여 테스트

**iOS**:
1. 설정 → Safari (또는 사용 중인 브라우저)
2. 웹사이트 데이터 지우기
3. 기기 재부팅
4. 시크릿 모드로 접속하여 테스트

#### 방법 2: PC 개발자 도구 사용 (고급)

1. PC에서 `https://www.yagovibe.com` 접속
2. F12 (개발자 도구) 열기
3. Application 탭 → Service Workers
4. 모든 Service Worker Unregister
5. Storage → Clear site data
6. 모바일에서 테스트

## 🎯 예상 결과

Service Worker 제거 스크립트가 실행되면:

1. ✅ 이전 Service Worker가 자동으로 등록 해제됨
2. ✅ 모든 캐시가 삭제됨
3. ✅ 최신 코드가 로드됨
4. ✅ `detectInAppBrowser is not defined` 오류 해결
5. ✅ `Minified React error #300` 오류 해결
6. ✅ 모바일 로그인 정상 작동

## 📝 확인 방법

브라우저 콘솔에서 다음 로그를 확인하세요:

```
🔍 [Service Worker 제거] Service Worker 감지됨 - 등록 해제 시작...
📋 [Service Worker 제거] 등록된 Service Worker 개수: X
🗑️ [Service Worker 제거] Service Worker 등록 해제 중...
✅ [Service Worker 제거] Service Worker 등록 해제 성공
🎯 [Service Worker 제거] 완료
🗑️ [Service Worker 제거] 캐시 삭제 시작...
✅ [Service Worker 제거] 캐시 삭제 성공
🎯 [Service Worker 제거] 캐시 삭제 완료
```

## ⚠️ 주의사항

- Service Worker 제거 스크립트는 **한 번만 실행**됩니다
- 이후에는 Service Worker가 등록되지 않으므로 정상 작동합니다
- Firebase Messaging용 Service Worker (`firebase-messaging-sw.js`)는 FCM 푸시 알림용이므로 별도로 관리됩니다

---

**이제 빌드 및 배포를 진행하세요!** 🚀

