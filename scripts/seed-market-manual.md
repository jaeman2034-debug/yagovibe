# 🔥 마켓 더미 데이터 수동 추가 가이드

## Firebase Console에서 직접 추가

### 1. Firebase Console 접속
```
https://console.firebase.google.com/project/yago-vibe-spt/firestore/data
```

### 2. `market` 컬렉션 생성 (없으면)
- "컬렉션 시작" 클릭
- 컬렉션 ID: `market`

### 3. 문서 추가 (5개)

#### 문서 1
```json
{
  "sport": "soccer",
  "category": "equipment",
  "title": "나이키 축구화 판매합니다",
  "price": 50000,
  "location": "서울 강남구",
  "images": [],
  "status": "open",
  "authorId": "dummy-user-1",
  "createdAt": [현재 시간 자동]
}
```

#### 문서 2
```json
{
  "sport": "soccer",
  "category": "equipment",
  "title": "아디다스 축구공 중고",
  "price": 15000,
  "location": "서울 마포구",
  "images": [],
  "status": "open",
  "authorId": "dummy-user-2",
  "createdAt": [현재 시간 자동]
}
```

#### 문서 3
```json
{
  "sport": "soccer",
  "category": "recruit",
  "title": "주말 축구팀 모집합니다",
  "price": null,
  "location": "서울 송파구",
  "images": [],
  "status": "open",
  "authorId": "dummy-user-3",
  "createdAt": [현재 시간 자동]
}
```

#### 문서 4
```json
{
  "sport": "soccer",
  "category": "match",
  "title": "5:5 매칭 구합니다",
  "price": null,
  "location": "서울 노원구",
  "images": [],
  "status": "open",
  "authorId": "dummy-user-4",
  "createdAt": [현재 시간 자동]
}
```

#### 문서 5
```json
{
  "sport": "soccer",
  "category": "equipment",
  "title": "축구 유니폼 세트",
  "price": 30000,
  "location": "서울 종로구",
  "images": [],
  "status": "open",
  "authorId": "dummy-user-5",
  "createdAt": [현재 시간 자동]
}
```

---

## 또는 Admin SDK 사용 (서버 환경)

Firebase Admin SDK를 사용하면 권한 문제 없이 추가 가능합니다.
