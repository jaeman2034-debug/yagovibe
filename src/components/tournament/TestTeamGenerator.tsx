/**
 * 🔥 테스트용 팀 자동 생성 컴포넌트
 * 
 * 관리자 전용: 조 추첨 테스트를 위한 더미 팀 생성
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import type { TournamentPlayerRecord } from "@/lib/tournament/playerRepository";

const MIN_APPROVED_TEAMS = 2; // 🔥 조 추첨 최소 팀 수

interface TestTeamGeneratorProps {
  associationId: string;
  tournamentId: string;
  onTeamsCreated?: () => void;
}

const TEST_TEAM_NAMES = [
  "TEST FC A",
  "TEST FC B",
  "TEST FC C",
  "TEST FC D",
  "TEST FC E",
  "TEST FC F",
];

export function TestTeamGenerator({
  associationId,
  tournamentId,
  onTeamsCreated,
}: TestTeamGeneratorProps) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [teamCount, setTeamCount] = useState(4);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setGenerating(true);

    try {
      // 🔥 기존 테스트 팀 확인 (모든 테스트 팀 이름 포함)
      const teamsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/teams`
      );
      
      // 방법 1: isTestTeam 플래그로 조회 (가장 정확)
      let existingTestTeams: any[] = [];
      try {
        const testTeamQuery = query(teamsRef, where("isTestTeam", "==", true));
        const testTeamSnap = await getDocs(testTeamQuery);
        existingTestTeams = testTeamSnap.docs.map(d => ({
          id: d.id,
          name: d.data().teamName,
          status: d.data().status,
        }));
      } catch (err: any) {
        console.warn("[테스트 팀 생성] isTestTeam 쿼리 실패, teamName으로 확인 시도", err);
        
        // 방법 2: fallback - 모든 테스트 팀 이름으로 조회
        try {
          const existingQuery = query(teamsRef, where("teamName", "in", TEST_TEAM_NAMES));
      const existingSnap = await getDocs(existingQuery);
          existingTestTeams = existingSnap.docs.map(d => ({
            id: d.id,
            name: d.data().teamName,
            status: d.data().status,
          }));
        } catch (err2: any) {
          console.error("[테스트 팀 생성] 기존 팀 확인 실패", err2);
        }
      }

      // 🔥 필수 가드: 이미 테스트 팀이 있으면 추가 생성 방지 (데이터 무결성 보호)
      if (existingTestTeams.length > 0) {
        const teamList = existingTestTeams.map(t => `- ${t.name} (${t.status})`).join('\n');
        toast.error(
          `이미 테스트 팀이 존재합니다. (${existingTestTeams.length}팀)\n\n기존 팀:\n${teamList}\n\n중복 생성을 방지하기 위해 생성이 취소되었습니다. 기존 팀을 삭제한 후 다시 시도해주세요.`,
          { duration: 8000 }
        );
        console.warn("[테스트 팀 생성] 중복 생성 방지 - 기존 팀 존재:", existingTestTeams);
          setGenerating(false);
        return; // 🔥 즉시 종료 (추가 생성 불가)
      }

      // 테스트 팀 생성 (팀 + 선수 15명 자동 등록)
      const teamsToCreate = TEST_TEAM_NAMES.slice(0, teamCount);
      const createdTeams: string[] = [];
      const createdTeamIds: string[] = []; // 🔥 생성된 팀 ID 저장
      let totalPlayersCreated = 0;

      console.group(`[테스트 팀 생성] 총 ${teamCount}팀 생성 시작`);
      console.log("📋 생성 경로 확인", {
        associationId,
        tournamentId,
        collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
        teamsRef: teamsRef.path,
      });

      // 🔥 기존 팀 이름 확인 (중복 생성 방지)
      const existingTeamNames = new Set(existingTestTeams.map(t => t.name));

      for (const teamName of teamsToCreate) {
        // 🔥 중복 체크: 이미 같은 이름의 팀이 있으면 건너뛰기
        if (existingTeamNames.has(teamName)) {
          console.log(`[테스트 팀 생성] ⏭️ ${teamName} 건너뛰기 (이미 존재)`);
          continue;
        }
        
        // 1️⃣ 팀 생성 (teams 컬렉션) - 조 추첨 로직이 조회하는 경로
        console.log(`[테스트 팀 생성] ${teamName} 생성 시도`, {
          collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
        });
        
        let teamId: string;
        try {
          // 🔥 조 추첨 로직과 동일한 구조로 팀 문서 생성 (executeDraw 함수 참고)
          // ⚠️ 중요: 이 경로에 생성되어야 조 추첨 로직이 찾을 수 있음
          const teamData = {
          teamName,
            status: "approved", // 🔥 조 추첨 로직이 조회하는 필드 (필수!)
          teamCount: 1, // 기본 팀 수
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          isTestTeam: true, // 테스트 팀 플래그
          testGeneratedAt: serverTimestamp(),
            // 🔥 대회 참가 승인 정보도 함께 저장
            tournamentId,
            associationId,
            approvedAt: serverTimestamp(),
            approvedBy: user.uid,
          };
          
          console.log(`[테스트 팀 생성] 데이터 준비 완료`, {
            teamName,
            status: teamData.status,
            collectionPath: teamsRef.path,
        });
          
          const teamDoc = await addDoc(teamsRef, teamData);
          teamId = teamDoc.id;
        createdTeams.push(teamName);
          createdTeamIds.push(teamId);
          
          console.log(`[테스트 팀 생성] ✅ ${teamName} 팀 문서 생성 성공`, {
            teamId,
            documentPath: teamDoc.path,
            documentId: teamDoc.id,
            status: "approved", // ✅ 조 추첨 로직이 찾는 필드
            collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
            확인_필요: "이 경로에 생성되었는지 Firestore 콘솔에서 확인하세요",
          });
          
          // 🔥 생성 직후 동일한 쿼리로 검증 (조 추첨 로직과 동일)
          try {
            const immediateVerifyQuery = query(teamsRef, where("status", "==", "approved"));
            const immediateVerifySnap = await getDocs(immediateVerifyQuery);
            const isIncluded = immediateVerifySnap.docs.some(d => d.id === teamId);
            console.log(`[테스트 팀 생성] 🔍 ${teamName} 즉시 검증`, {
              생성된_팀_ID: teamId,
              승인_상태_팀_수: immediateVerifySnap.size,
              현재_팀이_포함되어_있는지: isIncluded,
              조회된_팀_목록: immediateVerifySnap.docs.map(d => ({
                id: d.id,
                name: d.data().teamName,
                status: d.data().status,
              })),
            });
            
            if (!isIncluded) {
              console.warn(`[테스트 팀 생성] ⚠️ ${teamName} 생성되었지만 즉시 조회되지 않음`, {
                원인: "Firestore 인덱싱 지연 가능성 (일반적, 정상)",
                해결: "최종 검증(3초 후)에서 확인됩니다",
              });
            }
          } catch (immediateErr: any) {
            console.error(`[테스트 팀 생성] ❌ ${teamName} 즉시 검증 실패`, {
              error: immediateErr?.code,
              message: immediateErr?.message,
              가능한_원인: "권한 문제 또는 인덱스 미생성",
            });
          }
        } catch (teamError: any) {
          console.error(`[테스트 팀 생성] ❌ ${teamName} 팀 생성 실패`, {
            error: teamError,
            code: teamError?.code,
            message: teamError?.message,
            collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
            가능한_원인: [
              teamError?.code === "permission-denied" ? "Firestore Rules 권한 문제" : null,
              teamError?.code === "unavailable" ? "Firestore 서비스 일시 중단" : null,
              "생성 경로가 올바르지 않음",
            ].filter(Boolean),
          });
          
          const errorMessage = teamError?.code === "permission-denied"
            ? `${teamName} 생성 실패: 권한 오류\n\n관리자 권한을 확인해주세요.\n또는 Firestore Rules를 확인해주세요.`
            : `${teamName} 생성 실패: ${teamError?.message || "알 수 없는 오류"}`;
          
          toast.error(errorMessage, { duration: 8000 });
          continue; // 다음 팀 생성 시도
        }
        
        // 2️⃣ 참가 신청(applications) 문서도 생성 (대회 참가 승인 연결)
        try {
          const applicationsRef = collection(
            db,
            `associations/${associationId}/tournaments/${tournamentId}/applications`
          );
          const applicationDoc = await addDoc(applicationsRef, {
            teamId,
            teamName,
            status: "approved", // 🔥 바로 승인 상태
            tournamentId,
            associationId,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            approvedAt: serverTimestamp(),
            approvedBy: user.uid,
            isTestTeam: true,
            testGeneratedAt: serverTimestamp(),
          });
          console.log(`[테스트 팀 생성] ✅ ${teamName} 참가 신청 문서 생성 성공`, {
            applicationId: applicationDoc.id,
            documentPath: applicationDoc.path,
            status: "approved",
          });
        } catch (appError: any) {
          // 참가 신청 문서 생성 실패는 경고만 (팀 문서가 있으면 조 추첨은 가능)
          console.warn(`[테스트 팀 생성] ⚠️ ${teamName} 참가 신청 문서 생성 실패 (팀 문서는 생성됨)`, {
            error: appError,
            code: appError?.code,
            message: appError?.message,
          });
        }

        // 2️⃣ 선수 15명 자동 등록
        const playersRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/players`
        );
        const batch = writeBatch(db);
        
        const currentYear = new Date().getFullYear();
        const baseBirthYear = currentYear - 25; // 기본 25세 기준
        
        for (let i = 1; i <= 15; i++) {
          const playerId = `${teamId}_player_${i}`;
          const playerRef = doc(playersRef, playerId);
          
          const playerData: Omit<TournamentPlayerRecord, "id"> = {
            tournamentId,
            associationId,
            teamId,
            teamName,
            name: `${teamName} 선수 ${i}번`,
            birthDateRaw: `${baseBirthYear - i + 1}-01-01`, // 나이 다양화
            birthDateISO: `${baseBirthYear - i + 1}-01-01`,
            birthYear: baseBirthYear - i + 1,
            position: i <= 3 ? "GK" : i <= 6 ? "DF" : i <= 10 ? "MF" : "FW",
            phone: `010-0000-${String(i).padStart(4, "0")}`,
            jerseyNo: String(i),
            memo: "테스트용 선수",
            ageCheck: {
              eligible: true, // 테스트용으로 모두 출전 가능
              reason: "OK",
            },
            approvalStatus: "approved", // 🔥 자동 승인 상태
            approvedByUid: user.uid,
            approvedAt: Timestamp.now(),
            eligibleForMatch: true, // 출전 자격 있음
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdByUid: user.uid,
          };
          
          batch.set(playerRef, playerData);
        }
        
        await batch.commit();
        totalPlayersCreated += 15;
      }

      // 🔥 생성된 팀 검증: 실제로 승인 상태로 저장되었는지 확인 (Firestore 인덱싱 반영 대기)
      console.group("[테스트 팀 생성] 최종 검증 시작");
      console.log("⏳ Firestore 인덱싱 반영 대기 중... (5초)");
      console.log("📋 생성된 팀 ID 목록:", createdTeamIds);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기 (인덱싱 반영)
      
      // 🔥 방법 1: 승인 상태 팀만 조회 (조 추첨 로직과 동일)
      const verifyQuery = query(teamsRef, where("status", "==", "approved"));
      let verifySnap;
      let verifyError: any = null;
      
      try {
        console.log("🔍 검증 쿼리 실행 (조 추첨 로직과 동일)", {
          collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
          query: "status == 'approved'",
          생성된_팀명_목록: createdTeams,
          생성된_팀_ID_목록: createdTeamIds,
          조회_경로: teamsRef.path,
        });
        verifySnap = await getDocs(verifyQuery);
        console.log("✅ 검증 쿼리 성공", {
          결과_수: verifySnap.size,
          조회된_팀_ID_목록: verifySnap.docs.map(d => d.id),
        });
        
        // 🔥 생성된 팀 ID와 조회된 팀 ID 비교
        const foundTeamIds = verifySnap.docs.map(d => d.id);
        const missingTeamIds = createdTeamIds.filter(id => !foundTeamIds.includes(id));
        if (missingTeamIds.length > 0) {
          console.warn("⚠️ 생성되었지만 조회되지 않은 팀 ID", {
            누락된_팀_ID: missingTeamIds,
            생성된_모든_ID: createdTeamIds,
            조회된_ID: foundTeamIds,
          });
        }
      } catch (err: any) {
        verifyError = err;
        console.error("❌ 검증 쿼리 실패 (권한 문제 가능성)", {
          error: err,
          code: err?.code,
          message: err?.message,
          collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
          가능한_원인: [
            "Firestore Rules에서 read 권한 없음",
            "isAssociationAdmin() 함수 실패",
            "인덱스 미생성",
            "생성은 성공했지만 조회 권한 없음",
          ],
        });
      }
      
      // 🔥 방법 2: 전체 팀 조회 (권한 문제 디버깅용)
      let allTeamsSnap;
      try {
        const allTeamsQuery = query(teamsRef);
        allTeamsSnap = await getDocs(allTeamsQuery);
        console.log("[테스트 팀 생성] 전체 팀 조회 성공", {
          전체_팀_수: allTeamsSnap.size,
          전체_팀_목록: allTeamsSnap.docs.map(d => ({
            id: d.id,
            name: d.data().teamName,
            status: d.data().status,
            isTestTeam: d.data().isTestTeam,
          })),
        });
      } catch (allErr: any) {
        console.error("❌ 전체 팀 조회 실패 (권한 문제 확정)", {
          error: allErr,
          code: allErr?.code,
          message: allErr?.message,
          해결_방법: "Firestore Rules에서 associations/{id}/tournaments/{id}/teams 읽기 권한 확인",
        });
      }
      
      if (verifyError) {
        console.groupEnd();
        toast.error(`팀 검증 실패: ${verifyError?.message || "권한 오류"}\n\nFirestore Rules를 확인해주세요.`, {
          duration: 10000,
        });
        setGenerating(false);
        return;
      }
      
      const verifiedCount = verifySnap?.size || 0;
      const verifiedTeams = verifySnap?.docs.map(d => ({
        id: d.id,
        name: d.data().teamName,
        status: d.data().status,
        isTestTeam: d.data().isTestTeam,
      })) || [];
      
      console.log("📋 최종 검증 결과", {
        생성된_팀명: createdTeams,
        생성된_팀_ID_목록: createdTeamIds,
        생성_예상_팀수: createdTeams.length,
        승인_상태_팀_수: verifiedCount,
        승인_팀_목록: verifiedTeams,
        전체_팀_수: allTeamsSnap?.size || 0,
        collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
        권한_상태: verifyError ? "❌ 실패" : "✅ 정상",
        중요_안내: "조 추첨 로직은 이 경로의 승인 팀을 조회합니다",
        Firestore_확인_경로: `associations > ${associationId} > tournaments > ${tournamentId} > teams`,
      });
      
      // 🔥 경고: 승인 팀 수가 부족하면 명확한 안내
      if (verifiedCount < createdTeams.length) {
        const missingCount = createdTeams.length - verifiedCount;
        console.warn("⚠️ 일부 팀이 승인 상태로 조회되지 않음", {
          예상: createdTeams.length,
          실제_승인_팀: verifiedCount,
          전체_팀: allTeamsSnap?.size || 0,
          누락_팀_수: missingCount,
          가능한_원인: [
            "Firestore 인덱싱 지연 (최대 1분 소요 가능)",
            "권한 문제로 조회 실패",
            "status 필드가 'approved'가 아님",
            "다른 컬렉션에 생성됨",
          ],
          해결_방법: "1분 후 페이지 새로고침 또는 Firestore 콘솔에서 직접 확인",
        });
        
        toast.warning(
          `${missingCount}팀이 아직 조회되지 않습니다.\n인덱싱이 완료되면(최대 1분) 자동으로 반영됩니다.`,
          { duration: 8000 }
        );
      } else if (verifiedCount === createdTeams.length) {
        console.log("✅ 모든 팀이 승인 상태로 정상 조회됨!");
      }
      
      console.groupEnd();
      
      if (verifiedCount < createdTeams.length) {
        console.warn("[테스트 팀 생성] 경고: 일부 팀이 승인 상태로 저장되지 않았을 수 있습니다.", {
          예상: createdTeams.length,
          실제: verifiedCount,
        });
      }
      
      // 성공 메시지 (검증 결과 포함)
      const successMessage = verifiedCount >= MIN_APPROVED_TEAMS
        ? `✅ 테스트 팀 ${createdTeams.length}팀 생성 완료! (승인 완료: ${verifiedCount}팀, 선수 ${totalPlayersCreated}명)\n\n이제 조 추첨을 실행할 수 있습니다.`
        : `✅ 테스트 팀 ${createdTeams.length}팀 생성 완료! (승인 완료: ${verifiedCount}팀, 선수 ${totalPlayersCreated}명)\n\n⚠️ 조 추첨을 실행하려면 최소 2팀 이상이 필요합니다.`;
      
      toast.success(successMessage, {
        duration: verifiedCount >= MIN_APPROVED_TEAMS ? 5000 : 7000,
      });
      
      // 🔥 부모 컴포넌트에 즉시 알림 (상태 새로고침)
      if (onTeamsCreated) {
        console.log("[테스트 팀 생성] 부모 컴포넌트에 알림 (상태 새로고침)");
        onTeamsCreated();
      }
      
      // 🔥 조 추첨 버튼 활성화를 위해 페이지 자동 새로고침 (승인 팀 수가 충분할 때만)
      if (verifiedCount >= MIN_APPROVED_TEAMS) {
        console.log("[테스트 팀 생성] ✅ 승인 팀 수 충족 → 5초 후 페이지 자동 새로고침 (조 추첨 버튼 활성화 확인)");
        console.log("📋 최종 확인 사항", {
          승인_팀_수: verifiedCount,
          생성_팀_수: createdTeams.length,
          조회_성공: !verifyError,
          Firestore_경로: `associations/${associationId}/tournaments/${tournamentId}/teams`,
          확인_필요: "Firestore 콘솔에서 이 경로에 팀 문서가 있는지 확인하세요",
        });
        setTimeout(() => {
          console.log("[테스트 팀 생성] 페이지 새로고침 실행");
          window.location.reload();
        }, 5000); // 5초 대기 (Firestore 인덱싱 완전 반영 + UI 업데이트)
      } else {
        // 승인 팀 수 부족 시 명확한 안내
        console.error("[테스트 팀 생성] ❌ 승인 팀 수 부족", {
          생성_팀_수: createdTeams.length,
          승인_팀_수: verifiedCount,
          조회_실패: !!verifyError,
          가능한_원인: [
            "생성은 성공했지만 조회 권한 문제",
            "Firestore 인덱싱 지연 (5초 이상 필요)",
            "다른 경로에 생성됨",
          ],
          해결_방법: "Firestore 콘솔에서 직접 경로를 확인하고, 권한 문제가 있으면 Rules를 수정하세요",
        });
        
        // 부모 컴포넌트만 추가 새로고침
        setTimeout(() => {
          if (onTeamsCreated) {
            console.log("[테스트 팀 생성] 추가 상태 새로고침 (조 추첨 버튼 상태 확인)");
          onTeamsCreated();
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error("테스트 팀 생성 오류:", error);
      toast.error(`테스트 팀 생성 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-amber-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 text-xl">
          <Users className="w-6 h-6" />
          🧪 테스트용 팀 자동 생성 (관리자 전용)
        </CardTitle>
        <CardDescription className="text-blue-800 font-medium">
          조 추첨 테스트를 위한 더미 팀을 자동으로 생성합니다. 생성된 팀은 즉시 승인 상태가 되어 조 추첨을 바로 테스트할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>✅ 자동 처리:</strong> 팀 생성 → 선수 15명 등록 → 승인 상태 설정
            <br />
            <span className="text-xs text-blue-700 mt-1 block">
              ⚡ 생성 후 조 추첨 버튼이 자동으로 활성화됩니다.
            </span>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-amber-900">
            생성할 팀 수
          </label>
          <select
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-amber-300 rounded-md bg-white"
            disabled={generating}
          >
            {[2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count}팀
              </option>
            ))}
          </select>
          <p className="text-xs text-amber-600">
            생성될 팀: {TEST_TEAM_NAMES.slice(0, teamCount).join(", ")}
          </p>
        </div>

        <div className="flex gap-2">
          {/* 빠른 생성 버튼 (4팀 고정) */}
          <Button
            onClick={() => {
              setTeamCount(4);
              setTimeout(() => handleGenerate(), 100);
            }}
            disabled={generating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                빠른 생성 (4팀)
              </>
            )}
          </Button>
          
          {/* 커스텀 생성 버튼 */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                {teamCount}팀 생성
              </>
            )}
          </Button>
        </div>
        
        {/* 🔥 테스트 팀 삭제 버튼 (디버깅용) */}
        {!generating && (
          <Button
            onClick={async () => {
              if (!window.confirm("⚠️ 모든 테스트 팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) {
                return;
              }
              
              try {
                setGenerating(true);
                const teamsRef = collection(
                  db,
                  `associations/${associationId}/tournaments/${tournamentId}/teams`
                );
                const testTeamQuery = query(teamsRef, where("isTestTeam", "==", true));
                const testTeamSnap = await getDocs(testTeamQuery);
                
                if (testTeamSnap.empty) {
                  toast.info("삭제할 테스트 팀이 없습니다.");
                  setGenerating(false);
                  return;
                }
                
                const batch = writeBatch(db);
                testTeamSnap.docs.forEach(doc => {
                  batch.delete(doc.ref);
                });
                await batch.commit();
                
                toast.success(`${testTeamSnap.size}팀의 테스트 팀이 삭제되었습니다.`);
                window.location.reload();
              } catch (error: any) {
                console.error("테스트 팀 삭제 오류:", error);
                toast.error(`삭제 실패: ${error.message || "알 수 없는 오류"}`);
              } finally {
                setGenerating(false);
              }
            }}
            variant="destructive"
            className="w-full"
          >
            🗑️ 모든 테스트 팀 삭제
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

