# 🔍 API 키 비교 결과

## 비교 대상

### 1. Browser key (auto created by Firebase)
```
AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
```

### 2. 코드에서 사용하는 apiKey
```
AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
```

## 비교 결과

✅ **완전히 동일합니다!**

- 둘 다 `AIzaSy...`로 시작 (올바른 형식)
- 둘 다 같은 문자열: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- 길이: 39자 (동일)

## 결론

**API 키 자체는 올바르게 설정되어 있습니다!**

## 그렇다면 문제는?

API 키가 올바르게 설정되어 있다면, 문제는 **Google Cloud Console에서 이 키의 HTTP 리퍼러 제한 설정**입니다.

### 확인해야 할 사항

1. **Google Cloud Console → APIs & Services → Credentials**
2. **Browser key (`AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`) 클릭**
3. **"애플리케이션 제한사항" 확인**
   - "HTTP 리퍼러(웹 사이트)" 선택되어 있는지 확인
   - "웹사이트 제한"에 `http://localhost:5173/*`가 **정확히** 있는지 확인
4. **"API 제한사항" 확인**
   - "키 제한 안 함" 선택되어 있는지 확인
   - 또는 "Restrict key" 선택 시 "Identity Toolkit API" 포함 확인

## 해결 방법

### Google Cloud Console에서 설정 확인

1. **Browser key 편집**
   - `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` 키 클릭

2. **HTTP 리퍼러 제한 확인**
   - "애플리케이션 제한사항" → "HTTP 리퍼러(웹 사이트)" 선택 확인
   - "웹사이트 제한"에 다음이 **정확히** 있는지 확인:
     ```
     http://localhost:5173/*
     http://127.0.0.1:5173/*
     https://yago-vibe-spt.web.app/*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     ```
   - ⚠️ **주의**: 각 항목은 별도 줄로 추가되어야 함
   - ⚠️ **주의**: 앞뒤 공백 없이 정확히 입력되어야 함

3. **API 제한사항 확인**
   - "API 제한사항" → "키 제한 안 함" 선택 확인

4. **저장**
   - [저장] 버튼 클릭
   - 5-10분 대기 (Google Cloud 설정 전파 시간)

5. **테스트**
   - 브라우저 캐시 완전 삭제
   - 시크릿 모드에서 테스트

## 요약

- ✅ API 키: 올바르게 설정됨 (동일한 키 사용)
- ❌ 문제: Google Cloud Console의 HTTP 리퍼러 제한 설정
- ✅ 해결: Google Cloud Console에서 HTTP 리퍼러 제한 확인 및 설정

