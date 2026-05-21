# 🎨 YAGO Complete UI Structure - FAB + Create Center + Federation Builder

> **작성일**: 2024년  
> **목적**: YAGO 전체 UI 구조 - FAB, Create Center, Federation Builder 연결까지 완전한 구조

---

## 📋 목차

1. [전체 플랫폼 구조](#1-전체-플랫폼-구조)
2. [FAB (Floating Action Button)](#2-fab-floating-action-button)
3. [Create Center](#3-create-center)
4. [Federation Builder 연결](#4-federation-builder-연결)
5. [전체 UI 흐름](#5-전체-ui-흐름)

---

## 1️⃣ 전체 플랫폼 구조

### 플랫폼 레이어

```
YAGO Platform
├─ Sports Hub (/sports)
│   ├─ Team Directory
│   └─ FAB (Create Center)
│
├─ Federation Hub (/federations)
│   ├─ Federation List
│   └─ Federation Home (/federations/{slug})
│
├─ Platform Hub (/platform)
│   └─ Federation Create (/platform/federations/create)
│
└─ Team Hub (/sports/teams/{slug})
    └─ Team Home
```

---

## 2️⃣ FAB (Floating Action Button)

### 위치

```
우측 하단 고정
z-index: 50
```

### UI 구조

```
                +
              (FAB)
```

클릭 시 확장:

```
          +
        / | \
       /  |  \
   협회 팀 대회
```

### FAB 메뉴 항목

```typescript
const fabItems = [
  {
    id: "federation",
    label: "협회 생성",
    icon: <Building2 />,
    href: "/platform/federations/create",
    color: "bg-blue-600",
  },
  {
    id: "team",
    label: "팀 생성",
    icon: <Users />,
    href: "/sports/teams/create",
    color: "bg-green-600",
  },
  {
    id: "tournament",
    label: "대회 생성",
    icon: <Trophy />,
    href: "/sports/tournaments/create",
    color: "bg-purple-600",
  },
  {
    id: "event",
    label: "이벤트 생성",
    icon: <Calendar />,
    href: "/sports/events/create",
    color: "bg-orange-600",
  },
  {
    id: "player",
    label: "선수 등록",
    icon: <UserPlus />,
    href: "/sports/players/register",
    color: "bg-indigo-600",
  },
];
```

### FAB 컴포넌트

```typescript
// src/components/shared/FabMenu.tsx
export default function FabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* FAB Items */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {fabItems.map((item) => (
            <div key={item.id} className="flex items-center justify-end gap-3">
              <span className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
                {item.label}
              </span>
              <button
                onClick={() => navigate(item.href)}
                className={`${item.color} text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all`}
              >
                {item.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-primary-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all ${
          isOpen ? "rotate-45" : "rotate-0"
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
```

---

## 3️⃣ Create Center

### 개념

```
FAB = Create Center
```

모든 생성 액션의 중앙 진입점

### 생성 가능한 항목

1. **협회 생성** → Federation Builder Wizard
2. **팀 생성** → Team Create Form
3. **대회 생성** → Tournament Create Form
4. **이벤트 생성** → Event Create Form
5. **선수 등록** → Player Registration Form

---

## 4️⃣ Federation Builder 연결

### FAB → Federation Create 흐름

```
1. FAB 클릭
   ↓
2. "협회 생성" 선택
   ↓
3. /platform/federations/create 이동
   ↓
4. Federation Create Wizard 시작
   ↓
5. 5단계 Wizard 완료
   ↓
6. /federations/{slug}/welcome 이동
   ↓
7. Quick Start 화면
```

### Federation Create Wizard

```
Step 1: 기본 정보
  - 협회명
  - 슬러그
  - 종목
  - 소개

Step 2: 운영 범위
  - 지역
  - 운영 대상
  - 연령 카테고리
  - 운영 방식

Step 3: 브랜드 설정
  - 로고
  - 색상
  - 커버 이미지

Step 4: 관리자 계정
  - 관리자 정보

Step 5: 확인 및 생성
  - 정보 요약
  - 생성 버튼
```

### 자동 생성 결과

```
✓ 협회 홈페이지 (/federations/{slug})
✓ 관리자 대시보드 (/federations/{slug}/admin)
✓ 기본 페이지 (12개)
✓ 기본 메뉴 (8개)
✓ AI 에이전트 (7개)
✓ 리그 템플릿 (3개)
```

---

## 5️⃣ 전체 UI 흐름

### 사용자 여정

#### 1. 플랫폼 진입

```
/sports
```

화면:
- 스포츠 활동 허브
- 7개 모듈 그리드
- **FAB (우측 하단)**

#### 2. FAB 클릭

```
FAB 클릭
  ↓
메뉴 확장
  ├─ 협회 생성
  ├─ 팀 생성
  ├─ 대회 생성
  ├─ 이벤트 생성
  └─ 선수 등록
```

#### 3. 협회 생성 선택

```
"협회 생성" 클릭
  ↓
/platform/federations/create
  ↓
Federation Create Wizard
```

#### 4. Wizard 완료

```
5단계 Wizard 완료
  ↓
협회 생성 API 호출
  ↓
자동 생성 프로세스 (8단계)
  ↓
/federations/{slug}/welcome
```

#### 5. Welcome 화면

```
Quick Start 카드
  ├─ 팀 초대하기
  ├─ 대회 만들기
  ├─ 공지 작성
  └─ 홈페이지 꾸미기
```

#### 6. 협회 홈페이지

```
/federations/{slug}
  ├─ Hero Section
  ├─ 공지사항
  ├─ 진행중 대회
  ├─ 경기 일정
  ├─ 순위
  └─ 팀 목록
```

#### 7. 관리자 대시보드

```
/federations/{slug}/admin
  ├─ 대시보드
  ├─ 팀 관리
  ├─ 선수 관리
  ├─ 대회/리그
  ├─ 경기 일정
  └─ 공지사항
```

---

## 6️⃣ FAB 적용 페이지

### FAB가 표시되는 페이지

1. **`/sports`** ✅ (추가 완료)
   - 스포츠 활동 허브
   - 모든 생성 액션 접근

2. **`/federations`** (추가 예정)
   - 협회 목록
   - 협회 생성 바로 접근

3. **`/federations/{slug}`** (추가 예정)
   - 협회 홈페이지
   - 협회 관리자용 생성 액션

4. **`/sports/teams`** (추가 예정)
   - 팀 목록
   - 팀 생성 바로 접근

---

## 7️⃣ FAB 스타일

### CSS

```css
.fab-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 50;
}

.fab-button {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: #0ea5e9;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.fab-button:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.fab-item {
  background: white;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
  white-space: nowrap;
}
```

---

## 8️⃣ 애니메이션

### FAB 메뉴 애니메이션

```typescript
// 각 아이템이 순차적으로 나타남
const animationDelay = index * 50; // ms

// CSS 애니메이션
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 9️⃣ 모바일 대응

### 모바일 FAB

```
모바일에서도 동일한 위치
우측 하단 고정
터치 영역 확보 (최소 44x44px)
```

### 반응형

```typescript
// 모바일: 작은 아이콘
// 데스크톱: 큰 아이콘 + 텍스트 라벨
```

---

## 🔟 테스트 시나리오

### 시나리오 1: 협회 생성

```
1. /sports 페이지 접속
2. 우측 하단 FAB 클릭
3. "협회 생성" 선택
4. Wizard 5단계 완료
5. 협회 홈페이지 확인
6. 관리자 대시보드 확인
```

### 시나리오 2: 팀 생성

```
1. /sports 페이지 접속
2. FAB 클릭
3. "팀 생성" 선택
4. 팀 생성 폼 작성
5. 팀 페이지 확인
```

---

## ✅ YAGO Complete UI Structure 완료

### 완성된 구조

- ✅ FAB 컴포넌트 생성
- ✅ `/sports` 페이지에 FAB 추가
- ✅ Create Center 구조
- ✅ Federation Builder 연결
- ✅ 전체 UI 흐름 정의

### 다음 단계

1. **다른 페이지에 FAB 추가**
   - `/federations`
   - `/federations/{slug}`
   - `/sports/teams`

2. **Federation Create Wizard 구현**
   - 5단계 Wizard
   - 자동 생성 로직

3. **테스트**
   - 협회 생성 플로우
   - 팀 생성 플로우

---

**작성일**: 2024년  
**상태**: ✅ YAGO Complete UI Structure 완료
