# 📝 YAGO VIBE SPORTS - League Registration System (리그 참가 신청 시스템) 완전 설계

> **작성일**: 2024년  
> **목적**: 협회 → 팀 → 리그 참가 → 시즌 운영이 실제로 돌아가는 핵심 기능

---

## 📋 목차

1. [League Registration System 개념](#1-league-registration-system-개념)
2. [팀 참가 신청 흐름](#2-팀-참가-신청-흐름)
3. [Firestore 구조](#3-firestore-구조)
4. [협회 승인 시스템](#4-협회-승인-시스템)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ League Registration System 개념

### League Registration System 역할

**팀이 리그에 참가 신청하고, 협회가 승인하는 시스템**입니다.

### 리그 참가 흐름

```
Team
  ↓
League Registration
  ↓
Federation Approval
  ↓
League Entry
```

### 팀 신청 → 협회 승인 → 리그 참가

이 흐름이 완성되면 **협회가 실제 리그 운영을 플랫폼에서 할 수 있습니다.**

---

## 2️⃣ 팀 참가 신청 흐름

### 2-1. 전체 흐름

```
리그 생성 (협회)
      ↓
팀 신청 (팀장)
      ↓
협회 승인 대기
      ↓
협회 승인/거절
      ↓
리그 참가 완료
      ↓
경기 일정 생성 가능
```

### 2-2. 단계별 설명

1. **리그 생성**: 협회가 리그를 생성하고 참가 신청을 받음
2. **팀 신청**: 팀장이 리그에 참가 신청
3. **협회 승인 대기**: 신청이 대기 상태로 저장
4. **협회 승인/거절**: 협회 관리자가 승인 또는 거절
5. **리그 참가 완료**: 승인된 팀이 리그에 참가
6. **경기 일정 생성**: 참가 팀이 충분하면 일정 생성 가능

---

## 3️⃣ Firestore 구조

### 3-1. League Registrations 서브컬렉션

```
leagues/{leagueId}/registrations/{registrationId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  captainId: string; // 팀장 UID
  captainName: string;
  contactEmail: string;
  contactPhone: string;
  message?: string; // 신청 메시지
  status: "pending" | "approved" | "rejected";
  registrationFee?: number;
  paidAt?: Timestamp;
  approvedBy?: string; // 승인한 관리자 UID
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  rejectedReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-2. League Teams 서브컬렉션 (승인 후)

```
leagues/{leagueId}/teams/{teamId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  joinedAt: Timestamp;
  status: "active" | "withdrawn";
  registrationFee?: number;
  paidAt?: Timestamp;
}
```

---

## 4️⃣ 협회 승인 시스템

### 4-1. 승인 프로세스

```
협회 관리자
  ↓
신청 목록 확인
  ↓
팀 정보 검토
  ↓
승인/거절 결정
  ↓
팀에게 알림 발송
```

### 4-2. 승인 조건

```
팀 정보 확인
등록비 납부 확인 (선택)
팀 인원 확인 (선택)
```

### 4-3. 승인 시 자동 처리

```
Registration 승인
  ↓
League Teams에 추가
  ↓
팀에게 알림 발송
  ↓
리그 페이지에 팀 표시
```

---

## 5️⃣ UI 구조

### 5-1. 팀 신청 UI

```
┌─────────────────────────────────────────┐
│ 리그 참가 신청                             │
│                                          │
│ 리그: Seoul Futsal League 2025         │
│                                          │
│ 팀: Tigers                              │
│ 팀장: John Kim                          │
│                                          │
│ 연락처                                   │
│ 이메일: [team@email.com]                │
│ 전화: [010-1234-5678]                   │
│                                          │
│ 신청 메시지 (선택사항)                    │
│ [입력 영역]                              │
│                                          │
│ 등록비: 50,000원                        │
│                                          │
│ [ 신청하기 ]                             │
└─────────────────────────────────────────┘
```

### 5-2. 협회 승인 UI

```
┌─────────────────────────────────────────┐
│ 리그 참가 신청 관리                        │
│                                          │
│ 대기 중 (5)                              │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers                              │ │
│ │ 팀장: John Kim                      │ │
│ │ 연락처: team@email.com               │ │
│ │ 신청일: 2025-03-01                  │ │
│ │                                     │ │
│ │ [ 승인 ] [ 거절 ]                   │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 승인됨 (12)                              │
│ ...                                      │
│                                          │
│ 거절됨 (2)                               │
│ ...                                      │
└─────────────────────────────────────────┘
```

### 5-3. 리그 팀 목록 UI

```
┌─────────────────────────────────────────┐
│ 참가 팀 (12팀)                           │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers                              │ │
│ │ 가입일: 2025-03-01                  │ │
│ │ [상세보기]                           │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Lions                               │ │
│ │ 가입일: 2025-03-02                  │ │
│ │ [상세보기]                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 실제 구현 코드

### 6-1. League Registration Service

```typescript
// src/services/leagueRegistrationService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RegistrationRequest {
  leagueId: string;
  teamId: string;
  teamName: string;
  captainId: string;
  captainName: string;
  contactEmail: string;
  contactPhone: string;
  message?: string;
  registrationFee?: number;
}

export async function registerTeamForLeague(params: RegistrationRequest): Promise<string> {
  const registrationsRef = collection(db, "leagues", params.leagueId, "registrations");
  
  // 중복 신청 확인
  const existingQuery = query(
    registrationsRef,
    where("teamId", "==", params.teamId),
    where("status", "in", ["pending", "approved"])
  );
  const existingSnap = await getDocs(existingQuery);
  
  if (!existingSnap.empty) {
    throw new Error("이미 신청하거나 승인된 팀입니다");
  }
  
  const registrationRef = await addDoc(registrationsRef, {
    teamId: params.teamId,
    teamName: params.teamName,
    captainId: params.captainId,
    captainName: params.captainName,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    message: params.message || "",
    status: "pending",
    registrationFee: params.registrationFee || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return registrationRef.id;
}

export async function approveRegistration(
  leagueId: string,
  registrationId: string,
  approvedBy: string
): Promise<void> {
  const registrationRef = doc(db, "leagues", leagueId, "registrations", registrationId);
  const registrationSnap = await getDoc(registrationRef);
  const registrationData = registrationSnap.data();
  
  if (!registrationData) {
    throw new Error("신청을 찾을 수 없습니다");
  }
  
  if (registrationData.status !== "pending") {
    throw new Error("이미 처리된 신청입니다");
  }
  
  // Registration 승인
  await updateDoc(registrationRef, {
    status: "approved",
    approvedBy,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // League Teams에 추가
  const teamsRef = collection(db, "leagues", leagueId, "teams");
  await addDoc(teamsRef, {
    teamId: registrationData.teamId,
    teamName: registrationData.teamName,
    joinedAt: serverTimestamp(),
    status: "active",
    registrationFee: registrationData.registrationFee || 0,
    paidAt: registrationData.paidAt || null,
  });
  
  // 팀에게 알림 발송 (Cloud Function에서 처리)
}

export async function rejectRegistration(
  leagueId: string,
  registrationId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const registrationRef = doc(db, "leagues", leagueId, "registrations", registrationId);
  const registrationSnap = await getDoc(registrationRef);
  const registrationData = registrationSnap.data();
  
  if (!registrationData) {
    throw new Error("신청을 찾을 수 없습니다");
  }
  
  if (registrationData.status !== "pending") {
    throw new Error("이미 처리된 신청입니다");
  }
  
  await updateDoc(registrationRef, {
    status: "rejected",
    rejectedBy,
    rejectedAt: serverTimestamp(),
    rejectedReason: reason,
    updatedAt: serverTimestamp(),
  });
  
  // 팀에게 알림 발송 (Cloud Function에서 처리)
}
```

### 6-2. League Registration 컴포넌트

```typescript
// src/components/league/LeagueRegistration.tsx
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { registerTeamForLeague } from "@/services/leagueRegistrationService";

interface LeagueRegistrationProps {
  leagueId: string;
  leagueName: string;
  registrationFee?: number;
  onComplete: () => void;
}

export function LeagueRegistration({ 
  leagueId, 
  leagueName, 
  registrationFee,
  onComplete 
}: LeagueRegistrationProps) {
  const { user } = useAuth();
  const { teamMembers } = useMyTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const selectedTeam = teamMembers.find(t => t.teamId === selectedTeamId);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeamId) {
      alert("팀을 선택해주세요");
      return;
    }
    
    if (!contactEmail || !contactPhone) {
      alert("연락처를 입력해주세요");
      return;
    }
    
    setSubmitting(true);
    try {
      await registerTeamForLeague({
        leagueId,
        teamId: selectedTeamId,
        teamName: selectedTeam?.teamName || "",
        captainId: user?.uid || "",
        captainName: user?.displayName || "익명",
        contactEmail,
        contactPhone,
        message,
        registrationFee,
      });
      
      alert("신청이 완료되었습니다. 승인 대기 중입니다.");
      onComplete();
    } catch (error: any) {
      alert(error.message || "신청에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">리그 참가 신청</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">리그</label>
          <div className="text-lg font-semibold">{leagueName}</div>
        </div>
        
        {/* 팀 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">팀 선택</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">팀 선택</option>
            {teamMembers.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>
        
        {/* 연락처 */}
        <div>
          <label className="block text-sm font-semibold mb-2">이메일</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">전화번호</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        
        {/* 신청 메시지 */}
        <div>
          <label className="block text-sm font-semibold mb-2">신청 메시지 (선택사항)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="리그 참가 의지나 특별 요청사항을 입력해주세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
          />
        </div>
        
        {/* 등록비 */}
        {registrationFee && registrationFee > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="font-semibold text-yellow-800">
              등록비: {registrationFee.toLocaleString()}원
            </div>
            <div className="text-sm text-yellow-700 mt-1">
              승인 후 납부하시면 됩니다.
            </div>
          </div>
        )}
        
        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "신청 중..." : "참가 신청하기"}
        </button>
      </div>
    </form>
  );
}
```

### 6-3. League Registration Management 컴포넌트

```typescript
// src/components/league/LeagueRegistrationManagement.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { approveRegistration, rejectRegistration } from "@/services/leagueRegistrationService";

interface LeagueRegistrationManagementProps {
  leagueId: string;
}

export function LeagueRegistrationManagement({ leagueId }: LeagueRegistrationManagementProps) {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const registrationsRef = collection(db, "leagues", leagueId, "registrations");
        let q = query(registrationsRef, orderBy("createdAt", "desc"));
        
        if (filter !== "all") {
          q = query(q, where("status", "==", filter));
        }
        
        const snapshot = await getDocs(q);
        const registrationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRegistrations(registrationsData);
      } catch (error) {
        console.error("신청 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegistrations();
  }, [leagueId, filter]);
  
  const handleApprove = async (registrationId: string) => {
    if (!user) return;
    
    if (!confirm("이 팀의 참가를 승인하시겠습니까?")) return;
    
    try {
      await approveRegistration(leagueId, registrationId, user.uid);
      alert("승인되었습니다");
      // 목록 새로고침
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "승인에 실패했습니다");
    }
  };
  
  const handleReject = async (registrationId: string) => {
    if (!user) return;
    
    const reason = prompt("거절 사유를 입력해주세요:");
    if (!reason) return;
    
    try {
      await rejectRegistration(leagueId, registrationId, user.uid, reason);
      alert("거절되었습니다");
      // 목록 새로고침
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "거절에 실패했습니다");
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  
  const pendingCount = registrations.filter(r => r.status === "pending").length;
  const approvedCount = registrations.filter(r => r.status === "approved").length;
  const rejectedCount = registrations.filter(r => r.status === "rejected").length;
  
  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          전체 ({registrations.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg ${
            filter === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          대기 중 ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg ${
            filter === "approved" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          승인됨 ({approvedCount})
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-4 py-2 rounded-lg ${
            filter === "rejected" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          거절됨 ({rejectedCount})
        </button>
      </div>
      
      {/* 신청 목록 */}
      <div className="space-y-4">
        {registrations.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            신청이 없습니다
          </div>
        ) : (
          registrations.map((registration) => (
            <div
              key={registration.id}
              className="bg-white border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{registration.teamName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      registration.status === "approved" ? "bg-green-100 text-green-800" :
                      registration.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {registration.status === "approved" ? "승인됨" :
                       registration.status === "rejected" ? "거절됨" : "대기 중"}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>팀장: {registration.captainName}</div>
                    <div>이메일: {registration.contactEmail}</div>
                    <div>전화: {registration.contactPhone}</div>
                    {registration.message && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        {registration.message}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      신청일: {registration.createdAt?.toDate().toLocaleDateString()}
                    </div>
                    {registration.rejectedReason && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-red-700">
                        거절 사유: {registration.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
                
                {registration.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(registration.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(registration.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] League Registration Service
- [ ] League Registration 컴포넌트
- [ ] League Registration Management 컴포넌트

### Phase 2 (다음)
- [ ] 알림 시스템
- [ ] 등록비 관리
- [ ] 자동 승인 조건

### Phase 3 (확장)
- [ ] 팀 정보 검증
- [ ] 선수 등록 확인
- [ ] 자동 거절 조건

---

**작성일**: 2024년  
**상태**: ✅ League Registration System 완전 설계 완료
