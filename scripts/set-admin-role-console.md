# 🔥 관리자 Role 설정 가이드 (Firebase Console)

## 빠른 설정 방법

### 1. Firebase Console 접속
```
https://console.firebase.google.com/project/yago-vibe-spt/firestore
```

### 2. users 컬렉션 열기
- 왼쪽 메뉴: **Firestore Database** → **Data** 탭
- `users` 컬렉션 클릭

### 3. 본인 UID 문서 찾기
- 문서 ID: `6ie7FcdHPvaYc2DxXMeZEz1VIwx1`
- 해당 문서 클릭

### 4. role 필드 추가
1. 문서 상단 **"필드 추가"** 버튼 클릭
2. 필드 설정:
   - **필드명**: `role`
   - **타입**: `string` (문자열)
   - **값**: `ADMIN` (대문자)
3. **저장** 클릭

### 5. 확인
문서 구조가 이렇게 되어야 합니다:
```json
{
  email: "jaeman2034@gmail.com",
  nickname: "게스트_952",
  uid: "6ie7FcdHPvaYc2DxXMeZEz1VIwx1",
  role: "ADMIN",  // ← 이 필드 추가됨
  favoriteSports: ["축구", "농구", "러닝"],
  location: "lat:37.7449, lng:127.0803",
  createdAt: ...
}
```

---

## 브라우저에서 확인

### 1. 완전 새로고침
- `Ctrl + Shift + R` (Windows)
- `Cmd + Shift + R` (Mac)

### 2. 콘솔에서 확인
```javascript
// 브라우저 콘솔에서 실행
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from 'firebase/auth';

const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
console.log('Role:', userDoc.data()?.role); // "ADMIN"이어야 함
```

### 3. 테스트
- `/soccer/market` 접속
- 모집 글 상세 페이지 진입
- 권한 오류가 사라졌는지 확인

---

## ⚠️ 주의사항

- ✅ 대문자 정확히: `"ADMIN"` (소문자 `"admin"`도 작동하지만 대문자 권장)
- ✅ 문자열 타입 (배열 아님)
- ✅ 루트 레벨에 추가 (서브컬렉션 안에 넣지 말 것)
