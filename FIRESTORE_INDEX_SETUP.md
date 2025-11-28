# 🔥 Firestore 인덱스 설정 가이드

## ✅ 문제 상황

ProductDetail 페이지에서 다음 기능들이 Firestore 복합 인덱스가 없어서 실패합니다:

- ✨ AI 상품 요약
- 🧩 AI 상품 상태 점수
- 📈 AI 가격 미래 예측
- ⚠️ AI 사기 감지
- 🔍 AI 유사상품 추천
- 🔮 AI 연관 상품 추천

## 🎯 해결 방법

### 방법 1: 자동 인덱스 생성 (권장)

1. **브라우저 콘솔 확인**
   - 상품 상세 페이지 접속
   - 개발자 도구 콘솔 열기 (F12)
   - 인덱스 오류 메시지 확인

2. **인덱스 생성 링크 클릭**
   - 콘솔에 다음과 같은 메시지가 표시됩니다:
   ```
   ❌ Firestore 인덱스가 필요합니다
   🔗 인덱스 생성 링크 (클릭하여 생성): https://console.firebase.google.com/...
   ```
   - 또는 confirm 다이얼로그가 나타나면 "확인" 클릭

3. **인덱스 생성**
   - Firebase Console이 열리면 "만들기" 또는 "CREATE INDEX" 버튼 클릭
   - 인덱스 생성 완료 대기 (약 1~3분)

4. **페이지 새로고침**
   - 인덱스 생성 완료 후 페이지 새로고침
   - 다음 인덱스 오류가 나타나면 위 과정 반복

### 방법 2: 수동 인덱스 생성

Firebase Console → Firestore → Indexes → Create Index

#### 필요한 인덱스 목록

##### 1. 유사상품 추천 인덱스
```
Collection: marketProducts
Fields:
  - createdAt: Descending
```

##### 2. 가격 미래 예측 인덱스
```
Collection: marketProducts
Fields:
  - category: Ascending
  - createdAt: Descending
```

##### 3. 사기 감지 인덱스
```
Collection: marketProducts
Fields:
  - category: Ascending
  - price: Ascending
```

##### 4. 연관 상품 추천 인덱스
```
Collection: marketProducts
Fields:
  - category: Ascending
  - createdAt: Descending
```

## 📌 인덱스 생성 확인

1. Firebase Console → Firestore → Indexes
2. 생성된 인덱스 목록 확인
3. 상태가 "Enabled"인지 확인

## ⚠️ 주의사항

- 각 쿼리마다 별도의 인덱스가 필요할 수 있습니다
- 인덱스 생성은 약 1~3분 소요됩니다
- 인덱스 생성 중에는 해당 쿼리가 실패할 수 있습니다
- 모든 인덱스가 생성될 때까지 페이지를 새로고침하며 확인하세요

## 🔍 인덱스 오류 확인 방법

브라우저 콘솔에서 다음 메시지를 확인하세요:

```
❌ Firestore 인덱스가 필요합니다
🔗 인덱스 생성 링크 (클릭하여 생성): https://...
```

이 링크를 클릭하면 필요한 인덱스를 자동으로 생성할 수 있습니다.

