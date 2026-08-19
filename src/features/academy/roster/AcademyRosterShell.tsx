import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  canInviteParent,
  isAcademyStaffRole,
  isTeamAdminBundle,
  normalizeMemberRole,
  type AcademyMemberRole,
} from "@/lib/team/academyMemberRole";
import {
  AddAcademyCoachDialog,
  AddAcademyGuardianDialog,
  AddAcademyPlayerDialog,
} from "@/features/academy/roster/AddAcademyRosterDialogs";
import {
  countActiveLinksForParent,
  countActiveLinksForPlayer,
} from "@/lib/team/parentLinksRead";
import type { ParentRelation } from "@/lib/team/parentLinksReadTypes";
import type { TeamMemberRow } from "@/lib/team/teamMemberRead";
import { AcademyRosterSection } from "@/features/academy/roster/AcademyRosterSection";
import {
  filterPlayersForParentPersona,
  resolveAcademyRosterVisibility,
} from "@/features/academy/roster/academyRosterVisibility";
import { useAcademyRosterData } from "@/features/academy/roster/useAcademyRosterData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  canShowAcceptInviteCta,
  canShowInviteParentCta,
  canShowRevokeLinkCta,
  canShowRoleChangeCta,
} from "@/features/academy/roster/mutations/academyRosterPermissions";
import { useAcademyRosterActions } from "@/features/academy/roster/mutations/useAcademyRosterActions";
import {
  AcademyMemberActionMenu,
  type AcademyMemberActionItem,
} from "@/features/academy/roster/mutations/AcademyMemberActionMenu";

type Props = {
  teamId: string;
  teamName?: string;
  viewerUid?: string;
  viewerRole?: string;
  /** teams.ownerUid 기준 팀장 — members.role 미동기화 시에도 명단 편집 허용 */
  isTeamOwner?: boolean;
};

export function AcademyRosterShell({ teamId, teamName, viewerUid, viewerRole, isTeamOwner }: Props) {
  const { staff, coaches, players, parents, links, academyPlayers, loading, error, refresh } =
    useAcademyRosterData(teamId);
  const role = normalizeMemberRole(viewerRole) as AcademyMemberRole;
  const vis = resolveAcademyRosterVisibility(role, viewerUid);
  const actions = useAcademyRosterActions({ refresh });
  const canAddPlayer = Boolean(isTeamOwner) || isAcademyStaffRole(role);
  const canAddGuardian = Boolean(isTeamOwner) || canInviteParent(role);
  const canAddCoach = Boolean(isTeamOwner) || isTeamAdminBundle(role);
  const canManageRoster = canAddPlayer || canAddGuardian || canAddCoach;
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addGuardianOpen, setAddGuardianOpen] = useState(false);
  const [addCoachOpen, setAddCoachOpen] = useState(false);
  const [rosterBusy, setRosterBusy] = useState<string | null>(null);
  const rosterDialogBusy = {
    key: rosterBusy,
    set: setRosterBusy,
    onError: (e: unknown) => {
      void import("sonner").then(({ toast }) => {
        toast.error(e instanceof Error ? e.message : "요청 처리 중 오류가 발생했습니다.");
      });
    },
    onSuccess: refresh,
  };
  const [inviteTargetPlayerUid, setInviteTargetPlayerUid] = useState<string | null>(null);
  const [inviteParentUid, setInviteParentUid] = useState("");
  const [inviteRelation, setInviteRelation] = useState<ParentRelation>("guardian");
  const [revokeLinkId, setRevokeLinkId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<TeamMemberRow | null>(null);
  const [nextRole, setNextRole] = useState("member");

  let playerRows = players;
  if (role === "parent" && viewerUid) {
    playerRows = filterPlayersForParentPersona(players, links, viewerUid);
  } else {
    playerRows = vis.filterPlayers(players);
  }

  const parentRows = vis.filterParents(parents);
  const pendingMyLinks = links.filter((l) => l.status === "pending" && l.parentUid === viewerUid);
  const activeLinksByParent = useMemo(() => {
    return links.filter((l) => l.status === "active" || l.status === "pending");
  }, [links]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        명단 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200">
        {error}
      </p>
    );
  }

  const parentBadge = (playerUid: string) => {
    const n = countActiveLinksForPlayer(links, playerUid);
    if (n === 0) return "보호자 미연결";
    return `보호자 ${n}명`;
  };

  const roleChoices: AcademyMemberRole[] = ["manager", "staff", "coach", "parent", "player", "member"];

  const openInviteForPlayer = (playerUid: string) => {
    setInviteParentUid("");
    setInviteRelation("guardian");
    setInviteTargetPlayerUid(playerUid);
  };

  const runInviteParent = async () => {
    if (!inviteTargetPlayerUid || !inviteParentUid.trim()) return;
    await actions.inviteParent({
      teamId,
      parentUid: inviteParentUid.trim(),
      playerUid: inviteTargetPlayerUid,
      relation: inviteRelation,
    });
    setInviteTargetPlayerUid(null);
    setInviteParentUid("");
    setInviteRelation("guardian");
  };

  const runRoleChange = async () => {
    if (!roleTarget) return;
    await actions.updateRole({
      teamId,
      targetUid: roleTarget.linkedAuthUid || roleTarget.billingUid || roleTarget.memberDocumentId,
      nextRole: nextRole as Exclude<AcademyMemberRole, "owner">,
    });
    setRoleTarget(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
          아카데미 명단
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {teamName?.trim() || "팀"} · 명단
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          선수·보호자·코치 등록은 callable 기반으로 처리됩니다.
        </p>
        {canManageRoster ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {canAddPlayer ? (
              <Button size="sm" onClick={() => setAddPlayerOpen(true)}>
                선수 추가
              </Button>
            ) : null}
            {canAddGuardian ? (
              <Button size="sm" variant="outline" onClick={() => setAddGuardianOpen(true)}>
                보호자 추가
              </Button>
            ) : null}
            {canAddCoach ? (
              <Button size="sm" variant="outline" onClick={() => setAddCoachOpen(true)}>
                코치 추가
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            명단 편집은 팀 운영진(owner · manager · staff) 또는 팀장 계정으로 로그인해야 합니다.
          </p>
        )}
      </div>

      {pendingMyLinks.length > 0 &&
        pendingMyLinks.map((link) =>
          canShowAcceptInviteCta(viewerRole, viewerUid, link.parentUid) ? (
            <div
              key={link.linkId}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
            >
              <span>보호자 연결 요청이 있습니다. 선수 연결을 수락하세요.</span>
              <Button
                size="sm"
                onClick={() => actions.acceptParentInvite({ teamId, linkId: link.linkId })}
                disabled={actions.pendingKey !== null}
              >
                수락
              </Button>
            </div>
          ) : null
        )}

      {vis.showStaff && (
        <AcademyRosterSection
          title="운영진"
          description="owner · manager · staff"
          rows={staff}
          actionsForRow={(row) => {
            const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            const items: AcademyMemberActionItem[] = [];
            if (canShowRoleChangeCta(viewerRole, row.role, uid === viewerUid)) {
              items.push({
                id: "change-role",
                label: "역할 변경",
                onSelect: () => {
                  setRoleTarget(row);
                  setNextRole(row.role);
                },
              });
            }
            return <AcademyMemberActionMenu items={items} />;
          }}
        />
      )}

      {vis.showCoaches && (
        <AcademyRosterSection
          title="코치"
          rows={coaches}
          emptyLabel="등록된 코치가 없습니다."
          actionsForRow={(row) => {
            const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            const items: AcademyMemberActionItem[] = [];
            if (canShowRoleChangeCta(viewerRole, row.role, uid === viewerUid)) {
              items.push({
                id: "change-role",
                label: "역할 변경",
                onSelect: () => {
                  setRoleTarget(row);
                  setNextRole(row.role);
                },
              });
            }
            return <AcademyMemberActionMenu items={items} />;
          }}
        />
      )}

      {vis.showPlayers && (
        <AcademyRosterSection
          title={role === "parent" ? "연결된 선수" : "선수"}
          rows={playerRows}
          badgeForRow={(row) => {
            const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            return parentBadge(uid);
          }}
          onBadgeClick={
            canShowInviteParentCta(viewerRole)
              ? (row) => {
                  const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
                  if (countActiveLinksForPlayer(links, uid) === 0) {
                    openInviteForPlayer(uid);
                  }
                }
              : undefined
          }
          actionsForRow={(row) => {
            const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            const items: AcademyMemberActionItem[] = [];
            if (canShowInviteParentCta(viewerRole)) {
              items.push({
                id: "invite-parent",
                label: "보호자 초대",
                onSelect: () => openInviteForPlayer(uid),
              });
            }
            if (canShowRoleChangeCta(viewerRole, row.role, uid === viewerUid)) {
              items.push({
                id: "change-role",
                label: "역할 변경",
                onSelect: () => {
                  setRoleTarget(row);
                  setNextRole(row.role);
                },
              });
            }
            return <AcademyMemberActionMenu items={items} />;
          }}
          emptyLabel={
            role === "parent" ? "연결된 선수가 없습니다." : "등록된 선수가 없습니다."
          }
        />
      )}

      {vis.showParents && (
        <AcademyRosterSection
          title="보호자"
          rows={parentRows}
          badgeForRow={(row) => {
            const uid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            const n = countActiveLinksForParent(links, uid);
            return n > 0 ? `연결 선수 ${n}명` : "연결 없음";
          }}
          actionsForRow={(row) => {
            const parentUid = row.linkedAuthUid || row.billingUid || row.memberDocumentId;
            const candidate = activeLinksByParent.find((l) => l.parentUid === parentUid);
            if (!candidate) return null;
            if (!canShowRevokeLinkCta(viewerRole, viewerUid, parentUid)) return null;
            return (
              <AcademyMemberActionMenu
                items={[
                  {
                    id: "revoke-link",
                    label: "연결 해제",
                    onSelect: () => setRevokeLinkId(candidate.linkId),
                  },
                ]}
              />
            );
          }}
          emptyLabel="등록된 보호자가 없습니다."
        />
      )}

      {!vis.showStaff && !vis.showCoaches && !vis.showPlayers && !vis.showParents && (
        <p className="text-xs text-gray-500">이 역할로 볼 수 있는 명단 항목이 없습니다.</p>
      )}

      <Dialog open={Boolean(inviteTargetPlayerUid)} onOpenChange={(open) => !open && setInviteTargetPlayerUid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>보호자 초대</DialogTitle>
            <DialogDescription>
              보호자 UID와 관계를 입력하면 pending 초대가 생성됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="parentUid"
              value={inviteParentUid}
              onChange={(e) => setInviteParentUid(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant={inviteRelation === "father" ? "default" : "outline"} onClick={() => setInviteRelation("father")}>부</Button>
              <Button size="sm" variant={inviteRelation === "mother" ? "default" : "outline"} onClick={() => setInviteRelation("mother")}>모</Button>
              <Button size="sm" variant={inviteRelation === "guardian" ? "default" : "outline"} onClick={() => setInviteRelation("guardian")}>보호자</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteTargetPlayerUid(null)}>취소</Button>
              <Button onClick={runInviteParent} disabled={actions.pendingKey !== null || !inviteParentUid.trim()}>
                확인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeLinkId)} onOpenChange={(open) => !open && setRevokeLinkId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>보호자 연결 해제</DialogTitle>
            <DialogDescription>
              연결 상태를 revoked로 변경합니다. 문서 삭제나 멤버 삭제는 수행하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRevokeLinkId(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!revokeLinkId) return;
                await actions.revokeParentLink({ teamId, linkId: revokeLinkId });
                setRevokeLinkId(null);
              }}
              disabled={actions.pendingKey !== null}
            >
              해제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddAcademyPlayerDialog
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        teamId={teamId}
        busy={rosterDialogBusy}
      />
      <AddAcademyGuardianDialog
        open={addGuardianOpen}
        onOpenChange={setAddGuardianOpen}
        teamId={teamId}
        academyPlayers={academyPlayers}
        busy={rosterDialogBusy}
      />
      <AddAcademyCoachDialog
        open={addCoachOpen}
        onOpenChange={setAddCoachOpen}
        teamId={teamId}
        busy={rosterDialogBusy}
      />

      <Dialog open={Boolean(roleTarget)} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경</DialogTitle>
            <DialogDescription>
              자기 자신/owner 역할은 변경할 수 없습니다. 변경 후 서버 확인 뒤 목록이 새로고침됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">{roleTarget?.displayName ?? "-"}: {roleTarget?.role ?? "-"} → {nextRole}</p>
            <div className="flex flex-wrap gap-2">
              {roleChoices.map((candidate) => (
                <Button
                  key={candidate}
                  size="sm"
                  variant={nextRole === candidate ? "default" : "outline"}
                  onClick={() => setNextRole(candidate)}
                >
                  {candidate}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRoleTarget(null)}>취소</Button>
              <Button onClick={runRoleChange} disabled={actions.pendingKey !== null || !roleTarget}>
                변경
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
