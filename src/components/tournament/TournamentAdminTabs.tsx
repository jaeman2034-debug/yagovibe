/**
 * 🔥 대회 관리자 탭 UI
 * 
 * 탭 1: 신청 목록 (승인/거절)
 * 탭 2: 납부 관리
 * 탭 3: 대진표
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationAdminList } from "./ApplicationAdminList";
import { ApplicationList } from "./ApplicationList";
import type { TournamentApplication } from "@/types/tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, Trophy, UserCheck, Database, Settings } from "lucide-react";
import { PlayerApprovalAdmin } from "@/components/roster/PlayerApprovalAdmin";
import { JoinKfaCacheUpload } from "./JoinKfaCacheUpload";
import { ApprovalRulesSettings } from "./ApprovalRulesSettings";
import { RosterStatusList } from "./RosterStatusList";

interface TournamentAdminTabsProps {
  associationId: string;
  tournamentId: string;
  applications: TournamentApplication[];
  approvedCount: number;
  tournament?: import("@/types/tournament").Tournament; // 승인 규칙 설정용
  onApplicationsChange?: () => void;
  onGenerateBracket?: () => void;
}

export function TournamentAdminTabs({
  associationId,
  tournamentId,
  applications,
  approvedCount,
  tournament,
  onApplicationsChange,
  onGenerateBracket,
}: TournamentAdminTabsProps) {
  const [activeTab, setActiveTab] = useState("applications");

  // 🔥 대소문자 모두 지원 (소문자로 정규화된 값도 처리)
  const pendingApps = applications.filter((app) => 
    app.status?.toUpperCase() === "PENDING" || app.status === "pending"
  );
  const approvedApps = applications.filter((app) => 
    app.status?.toUpperCase() === "APPROVED" || app.status === "approved"
  );
  const rejectedApps = applications.filter((app) => app.status === "REJECTED");

  const canGenerateBracket = [4, 8, 16].includes(approvedCount);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="applications" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          신청 목록
        </TabsTrigger>
        <TabsTrigger value="rosters" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          선수 명단
        </TabsTrigger>
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          납부 관리
        </TabsTrigger>
        <TabsTrigger value="players" className="flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          선수 승인
        </TabsTrigger>
        <TabsTrigger value="joinKfa" className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          JoinKFA
        </TabsTrigger>
        <TabsTrigger value="rules" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          승인 규칙
        </TabsTrigger>
        <TabsTrigger value="bracket" className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          대진표
        </TabsTrigger>
      </TabsList>

      {/* 탭 1: 신청 목록 */}
      <TabsContent value="applications" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">참가 신청 관리</h3>
            <p className="text-sm text-muted-foreground">
              대기: {pendingApps.length}건 | 승인: {approvedApps.length}건 | 거절: {rejectedApps.length}건
            </p>
          </div>
        </div>

        <ApplicationAdminList
          associationId={associationId}
          tournamentId={tournamentId}
          applications={applications}
          onStatusChange={onApplicationsChange}
        />
      </TabsContent>

      {/* 탭 2: 납부 관리 */}
      <TabsContent value="payments" className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">납부 관리</h3>
          <p className="text-sm text-muted-foreground">
            참가비 납부 현황을 확인하고 입금을 기록하세요.
          </p>
        </div>

        <ApplicationList
          applications={approvedApps}
          associationId={associationId}
          tournamentId={tournamentId}
        />
      </TabsContent>

      {/* 탭 4: 선수 승인 */}
      <TabsContent value="players" className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">선수 승인 관리</h3>
          <p className="text-sm text-muted-foreground">
            시스템이 자동 분류한 선수 명단을 확인하고 승인하세요.
          </p>
        </div>

        <PlayerApprovalAdmin
          associationId={associationId}
          tournamentId={tournamentId}
        />
      </TabsContent>

      {/* 탭 4: JoinKFA 캐시 */}
      <TabsContent value="joinKfa" className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">JoinKFA 캐시 관리</h3>
          <p className="text-sm text-muted-foreground">
            JoinKFA에서 다운로드한 선수 명단 엑셀을 업로드하면, 시스템이 자동으로 매칭합니다.
          </p>
        </div>

        <JoinKfaCacheUpload
          associationId={associationId}
          tournamentId={tournamentId}
          onUploadSuccess={() => {
            // 캐시 업로드 성공 시 선수 승인 탭으로 이동하거나 새로고침
            setActiveTab("players");
          }}
        />
      </TabsContent>

      {/* 탭 6: 승인 규칙 설정 */}
      <TabsContent value="rules" className="space-y-4">
        {tournament ? (
          <ApprovalRulesSettings
            associationId={associationId}
            tournamentId={tournamentId}
            tournament={tournament}
            onSave={onApplicationsChange}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              대회 정보를 불러오는 중...
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* 탭 7: 대진표 */}
      <TabsContent value="bracket" className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">대진표 생성</h3>
          <p className="text-sm text-muted-foreground">
            승인된 팀: {approvedCount}팀
          </p>
        </div>

        {approvedCount === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              승인된 팀이 없습니다. 먼저 참가 신청을 승인해주세요.
            </CardContent>
          </Card>
        ) : !canGenerateBracket ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <p className="text-muted-foreground">
                대진표를 생성하려면 승인된 팀이 4팀, 8팀, 또는 16팀이어야 합니다.
              </p>
              <p className="text-sm text-muted-foreground">
                현재 승인된 팀: {approvedCount}팀
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="font-medium">
                  {approvedCount}팀 대진표 생성 가능
                </p>
                <p className="text-sm text-muted-foreground">
                  대진표를 생성하면 경기 일정이 자동으로 생성됩니다.
                </p>
              </div>
              <Button
                onClick={onGenerateBracket}
                className="w-full"
                size="lg"
              >
                대진표 생성하기
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

