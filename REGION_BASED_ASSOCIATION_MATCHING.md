# 지역 기반 협회 자동 매칭 (확장 기능)

## 🎯 목표

**팀 생성 STEP 2에서 활동 지역을 기반으로 협회를 자동 제안**

**노원구 외 다른 구 협회도 동일한 UX로 처리**

---

## 📋 현재 상태

### 현재 구현 (하드코딩)
```typescript
// src/pages/team/TeamCreateStep2.tsx
const defaultAssociationId = "assoc-nowon-football"; // 하드코딩
```

### 목표 구현 (동적 매칭)
```typescript
// 팀 region → 협회 자동 조회
const associations = await findAssociationsByRegion(team.region);
```

---

## 🔧 구현 방법

### 1. 협회 조회 함수 생성

#### 파일: `functions/src/api/findAssociationsByRegion.ts`

```typescript
/**
 * 지역 기반 협회 조회
 * 
 * @param region - 활동 지역 (예: "서울시 노원구")
 * @returns 협회 목록
 */
export const findAssociationsByRegion = onCall(
  async (request) => {
    const { region } = request.data;
    
    if (!region) {
      throw new HttpsError("invalid-argument", "지역 정보가 필요합니다.");
    }
    
    // 협회 조회 (region 매칭)
    const associationsRef = db.collection("associations");
    const snapshot = await associationsRef
      .where("region", "==", region)
      .get();
    
    if (snapshot.empty) {
      return { associations: [] };
    }
    
    const associations = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      region: doc.data().region,
      benefits: doc.data().benefits || {},
    }));
    
    return { associations };
  }
);
```

#### Firestore 인덱스 필요
```
associations 컬렉션
- region (Ascending) 인덱스 생성
```

---

### 2. STEP 2 컴포넌트 수정

#### 파일: `src/pages/team/TeamCreateStep2.tsx`

```typescript
// 변경 전
const defaultAssociationId = "assoc-nowon-football"; // 하드코딩

// 변경 후
const { teamId, region } = useParams();
const [associations, setAssociations] = useState<Association[]>([]);

useEffect(() => {
  const fetchAssociations = async () => {
    if (!region) return;
    
    const findAssociations = httpsCallable<
      { region: string },
      { associations: Association[] }
    >(functions, "findAssociationsByRegion");
    
    const result = await findAssociations({ region });
    setAssociations(result.data.associations);
  };
  
  fetchAssociations();
}, [region]);
```

#### UI 렌더링
```typescript
{associations.length === 0 ? (
  <div>활동 지역에 등록된 협회가 없습니다.</div>
) : (
  associations.map((assoc) => (
    <AssociationCard
      key={assoc.id}
      association={assoc}
      onRequestMembership={() => handleRequestMembership(assoc.id)}
    />
  ))
)}
```

---

### 3. 팀 region 조회

#### STEP 1 완료 후 region 전달
```typescript
// TeamCreateForm.tsx
const handleSubmit = async () => {
  // 팀 생성 후
  const teamResult = await createTeamCallable({ name, region, ... });
  
  // STEP 2로 이동 (region 포함)
  navigate(`/sports/${sportType}/team/create?step=2&teamId=${teamResult.data.teamId}&region=${region}`);
};
```

#### STEP 2에서 region 읽기
```typescript
// TeamCreateStep2.tsx
const [searchParams] = useSearchParams();
const region = searchParams.get("region") || "서울시 노원구"; // 기본값
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 노원구 팀
- 입력: region = "서울시 노원구"
- 예상 결과: 노원구 축구협회 1개 제안
- 검증: 협회 카드 표시, 회원 신청 가능

### 시나리오 2: 강북구 팀 (확장)
- 입력: region = "서울시 강북구"
- 예상 결과: 강북구 축구협회 1개 제안 (추후 추가)
- 검증: 협회 카드 표시, 회원 신청 가능

### 시나리오 3: 협회 없음
- 입력: region = "서울시 강남구" (협회 미등록)
- 예상 결과: 빈 화면 또는 안내 메시지
- 검증: "활동 지역에 등록된 협회가 없습니다" 표시

### 시나리오 4: 여러 협회 (선택사항)
- 입력: region = "서울시 중구" (여러 협회 있을 경우)
- 예상 결과: 여러 협회 카드 표시
- 검증: 사용자가 선택 가능

---

## 📊 데이터 모델 확인

### associations 컬렉션 구조
```typescript
associations/{associationId} {
  name: string;           // "노원구 축구협회"
  region: string;         // "서울시 노원구" (매칭 키)
  benefits: {
    priorityBooking: boolean;
    leagues: boolean;
  };
  createdAt: Timestamp;
}
```

### teams 컬렉션 구조
```typescript
teams/{teamId} {
  name: string;
  region: string;         // "서울시 노원구" (매칭 키)
  membership: "non-member" | "pending" | "member";
  associationId: string | null;
  ...
}
```

**매칭 규칙:**
- `team.region` === `association.region`
- 정확히 일치해야 함 (부분 일치는 제외)

---

## ⚠️ 주의사항

### 1. 지역명 표준화
- 문제: "서울시 노원구" vs "서울 노원구" vs "노원구"
- 해결: 지역명 표준화 규칙 정의
  - 옵션 A: 입력 시 표준화 (예: 항상 "서울시 노원구" 형식)
  - 옵션 B: 유사도 매칭 (복잡도 증가)

**권장:** 옵션 A (표준화)

### 2. 협회 중복
- 문제: 같은 지역에 여러 협회 있을 경우
- 해결: 사용자가 선택하도록 UI 구성
- 예: 축구협회, 풋살협회 등

### 3. 협회 없을 때
- 문제: 해당 지역에 협회가 없을 경우
- 해결: 안내 메시지 + "나중에 할게요" 버튼
- UX: 실패 상태가 아닌 선택 제안

---

## 🔄 구현 순서

### Phase 1: 백엔드 API (1일)
1. `findAssociationsByRegion` 함수 생성
2. Firestore 인덱스 생성
3. 테스트 (노원구 조회)

### Phase 2: 프론트엔드 통합 (1일)
1. `TeamCreateStep2` 수정 (하드코딩 제거)
2. `useEffect`로 협회 조회
3. UI 렌더링 (협회 카드)

### Phase 3: 테스트 (1일)
1. 노원구 테스트
2. 강북구 테스트 (샘플 데이터)
3. 협회 없음 케이스 테스트

### Phase 4: 배포 (0.5일)
1. Functions 배포
2. Frontend 배포
3. 통합 테스트

---

## ✅ 완료 기준

다음 조건을 모두 만족하면 완료:

1. ✅ 지역 기반 협회 자동 조회
2. ✅ STEP 2에서 동적 협회 제안
3. ✅ 협회 없을 때 처리
4. ✅ 여러 협회 있을 때 처리 (선택사항)
5. ✅ 테스트 완료

---

## 📝 추후 개선 사항

### 1. 지역명 유사도 매칭
- "서울시 노원구" = "서울 노원구" = "노원구"
- 복잡도 증가, 필요 시 구현

### 2. 협회 추천 알고리즘
- 거리 기반 추천
- 활동 기반 추천
- 현재: 단순 지역 매칭

### 3. 협회 검색
- 지역 외 협회 검색 가능
- 키워드 검색
- 현재: 지역 기반만

---

## 🔑 핵심 원칙

1. **표준화**: 지역명 표준 형식 유지
2. **단순성**: 복잡한 매칭 로직 지양
3. **확장성**: 다른 구 추가 시 자동 동작
4. **UX**: 실패 상태가 아닌 선택 제안

