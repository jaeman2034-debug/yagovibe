# 🔓 Pro 플래그 임시 활성화 가이드

## 방법 1: Firestore Console (가장 빠름) ⚡

### 단계:
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. **Firestore Database** 클릭
4. 경로 찾기: `teams` → `{teamId}` → `blog` → `settings`
5. `plan` 필드를 `"free"` → `"pro"`로 변경
6. 저장
7. 페이지 새로고침 (F5)

### 예시:
```
teams/
  └── {your-team-id}/
      └── blog/
          └── settings/
              ├── enabled: true
              ├── plan: "pro"  ← 여기를 변경
              └── teamSlug: "소흘-60대-fc"
```

---

## 방법 2: 브라우저 콘솔 (즉시 실행) 🚀

### 단계:
1. 블로그 관리 페이지에서 **F12** (개발자 도구 열기)
2. **Console** 탭 클릭
3. 아래 코드 복사/붙여넣기 후 **Enter**

```javascript
(async () => {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("/src/lib/firebase.ts");
  
  // 팀 ID 자동 감지
  const url = window.location.href;
  const teamId = url.match(/team\/([^\/]+)/)?.[1];
  
  if (!teamId) {
    console.error("❌ 팀 ID를 찾을 수 없습니다.");
    return;
  }
  
  const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
  const settingsSnap = await getDoc(settingsRef);
  
  if (!settingsSnap.exists()) {
    console.error("❌ 블로그 설정이 없습니다.");
    return;
  }
  
  await updateDoc(settingsRef, { plan: "pro" });
  console.log("✅ Pro 활성화 완료! 페이지를 새로고침하세요.");
  setTimeout(() => window.location.reload(), 1000);
})();
```

4. 페이지 자동 새로고침 확인
5. "다음 글 자동 생성하기" 버튼 확인

---

## 방법 3: 코드에서 임시 강제 (개발용) 💻

### `src/components/team/TeamBlogManagement.tsx` 수정:

```typescript
// 임시: Pro 강제 활성화 (테스트용)
const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(null);

useEffect(() => {
  // ... 기존 코드 ...
  
  // 🔥 임시: Pro 강제 활성화
  if (blogSettings && blogSettings.plan === "free") {
    setBlogSettings({ ...blogSettings, plan: "pro" });
  }
}, [blogSettings]);
```

⚠️ **주의**: 테스트 후 반드시 원래대로 되돌리기!

---

## 확인 방법

### ✅ 성공 시:
- 블로그 관리 페이지에 **"지금 생성하기"** 버튼 표시
- 공개 블로그 페이지에 **"다음 글 자동 생성하기"** 버튼 표시
- Pro 배지 표시

### ❌ 실패 시:
- 버튼이 여전히 안 보임
- 콘솔 에러 확인
- Firestore 권한 확인

---

## 되돌리기 (테스트 후)

### Firestore Console:
- `plan` 필드를 다시 `"free"`로 변경

### 또는 콘솔:
```javascript
await updateDoc(settingsRef, { plan: "free" });
```

---

## 다음 단계

Pro 활성화 후:
1. ✅ "다음 글 자동 생성하기" 버튼 클릭
2. ✅ 생성된 주제 확인 (weekly/team_atmosphere 등)
3. ✅ Pro CTA 동작 확인
4. ✅ 테스트 완료 후 `plan`을 `"free"`로 되돌리기

