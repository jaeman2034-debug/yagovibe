/**
 * FacilityBookingStatusCard
 * 운동장 대관 현황 카드 (가장 중요 - 가치 증명)
 * 
 * 팀 상태에 따라 다른 메시지와 CTA 표시
 * - 회원팀: "우선 배정 대상입니다" + "대관 신청"
 * - 비회원팀: "잔여 시간대만 이용 가능" + "대기 신청" / "회원 전환 문의"
 * - 아카데미: "협회 선대관 일정 내 배정"
 */

import { useBookingPermission } from "@/hooks/useBookingPermission";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTeam } from "@/context/TeamContext";

interface FacilityBookingStatusCardProps {
  associationId?: string;
  teamId?: string;
  facilityId?: string;
  teamStatus?: "MEMBER" | "NON_MEMBER" | "ACADEMY";
}

export default function FacilityBookingStatusCard({
  associationId,
  teamId,
  facilityId,
  teamStatus,
}: FacilityBookingStatusCardProps) {
  const navigate = useNavigate();
  const { type: sportType } = useParams<{ type: string }>(); // 🔥 URL에서 sportType 가져오기
  const { myTeam } = useTeam(); // 🔥 TeamContext에서 현재 팀 정보 가져오기
  
  // 기본 시설 ID (노원구 우선 대관 시설 중 하나)
  const defaultFacilityId = facilityId || "facility-army-academy";
  const defaultAssociationId = associationId || "assoc-nowon-football";

  // 🔥 sportType 일치 체크: TeamContext의 팀과 URL의 sportType이 일치해야만 Policy Engine 호출
  const isSportTypeMatched = !myTeam || myTeam.sportType === sportType;
  
  // 🔥 팀이 ACTIVE 상태일 때만 Policy Engine 호출 (방금 생성된 팀은 제외)
  // 팀 생성 직후에는 Policy Engine을 호출하지 않음 (초기화 미완료)
  const isTeamReady = myTeam && myTeam.id === teamId;
  const isValidTeam = teamId && teamId.trim() !== "" && 
                      isTeamReady && 
                      isSportTypeMatched;

  // 권한 조회 (팀이 있고, sportType이 일치하고, 팀이 준비되었을 때만)
  // ❗ 새로 생성된 팀은 Policy Engine을 호출하지 않음 (초기화 미완료 방지)
  const { loading, permission } = useBookingPermission({
    associationId: defaultAssociationId,
    teamId: teamId || "",
    facilityId: defaultFacilityId,
    enabled: !!(isValidTeam && associationId && associationId.trim() !== ""), // 팀 ID, 협회 ID, sportType 일치 모두 유효할 때만 조회
  });

  // 팀이 없는 경우
  if (!teamId) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              운동장 대관 현황
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              팀을 생성하면 협회 우선 대관 혜택을 받을 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // 혜택 안내 (팀 생성 선택 화면으로 이동)
                  const pathParts = window.location.pathname.split('/');
                  const sportType = pathParts[pathParts.indexOf('sports') + 1] || 'football';
                  navigate(`/sports/${sportType}/team/create`);
                }}
                variant="outline"
                className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                혜택 알아보기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 권한 정보가 없는 경우 (기본 메시지)
  if (!permission) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              운동장 대관 현황
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              대관 가능한 시설을 확인하려면 팀 정보가 필요합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 권한 정보 기반 렌더링
  const { actionType, message, showConversionCTA } = permission;

  // 스타일 결정
  let cardStyle = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
  let iconBg = "bg-gray-100 dark:bg-gray-700";
  let iconColor = "text-gray-600 dark:text-gray-400";
  let titleColor = "text-gray-900 dark:text-white";

  if (actionType === "APPLY") {
    cardStyle = "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800";
    iconBg = "bg-green-600";
    iconColor = "text-white";
    titleColor = "text-gray-900 dark:text-white";
  } else if (actionType === "WAITLIST") {
    cardStyle = "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-800";
    iconBg = "bg-yellow-600";
    iconColor = "text-white";
    titleColor = "text-gray-900 dark:text-white";
  }

  return (
    <div className={`${cardStyle} rounded-lg p-6`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Building2 className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${titleColor} mb-2`}>
            운동장 대관 현황
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {message}
          </p>
          <div className="flex flex-wrap gap-2">
            {actionType === "APPLY" && (
              <Button
                onClick={() => navigate("/facilities")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                대관 신청
              </Button>
            )}
            {actionType === "WAITLIST" && (
              <>
                <Button
                  onClick={() => navigate("/facilities")}
                  variant="outline"
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                >
                  대기 신청
                </Button>
                {showConversionCTA && (
                  <Button
                    onClick={() => {
                      // TODO: 회원 전환 모달 또는 페이지로 이동
                      console.log("회원 전환 문의");
                    }}
                    variant="outline"
                    className="border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    회원 전환 문의
                  </Button>
                )}
              </>
            )}
            {actionType === "VIEW_ONLY" && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                자세한 내용은 협회에 문의하세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

