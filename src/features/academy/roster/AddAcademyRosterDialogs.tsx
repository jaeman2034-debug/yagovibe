import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AcademyPlayerRow } from "@/lib/team/academyPlayersTypes";
import type { ParentRelation } from "@/lib/team/parentLinksReadTypes";
import {
  callCreateAcademyPlayer,
  callInviteAcademyCoachByEmail,
  callInviteParentToAcademyPlayer,
} from "@/features/academy/roster/mutations/academyPlayerCallables";

type Busy = { key: string | null; set: (k: string | null) => void; onError: (e: unknown) => void; onSuccess: () => Promise<void> };

function formatError(error: unknown): string {
  if (error instanceof FirebaseError) return error.message || "요청 처리 중 오류가 발생했습니다.";
  if (error instanceof Error) return error.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

async function runBusy(busy: Busy, key: string, fn: () => Promise<void>, successMsg?: string) {
  busy.set(key);
  try {
    await fn();
    await busy.onSuccess();
    if (successMsg) toast.success(successMsg);
  } catch (e) {
    toast.error(formatError(e));
    busy.onError(e);
  } finally {
    busy.set(null);
  }
}

export function AddAcademyPlayerDialog({
  open,
  onOpenChange,
  teamId,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  busy: Busy;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [uniformNumber, setUniformNumber] = useState("");
  const [position, setPosition] = useState("");

  const reset = () => {
    setName("");
    setBirthDate("");
    setUniformNumber("");
    setPosition("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>선수 추가</DialogTitle>
          <DialogDescription>아카데미 명단에 선수를 등록합니다. (플랫폼 가입 전 유소년 포함)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="이름 *" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="date" placeholder="생년월일" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <Input placeholder="등번호" value={uniformNumber} onChange={(e) => setUniformNumber(e.target.value)} />
          <Input placeholder="포지션" value={position} onChange={(e) => setPosition(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              disabled={!name.trim() || busy.key !== null}
              onClick={() =>
                runBusy(
                  busy,
                  "add-player",
                  () =>
                    callCreateAcademyPlayer({
                      teamId,
                      displayName: name.trim(),
                      birthDate: birthDate || undefined,
                      uniformNumber: uniformNumber || undefined,
                      position: position || undefined,
                    }).then(() => undefined),
                  "선수를 등록했습니다."
                ).then(() => onOpenChange(false))
              }
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddAcademyGuardianDialog({
  open,
  onOpenChange,
  teamId,
  academyPlayers,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  academyPlayers: AcademyPlayerRow[];
  busy: Busy;
}) {
  const [playerId, setPlayerId] = useState("");
  const [email, setEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [relation, setRelation] = useState<ParentRelation>("guardian");

  const reset = () => {
    setPlayerId("");
    setEmail("");
    setGuardianName("");
    setRelation("guardian");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>보호자 추가</DialogTitle>
          <DialogDescription>
            보호자 YAGO 계정(이메일)과 연결할 선수를 선택하세요. 계정이 없으면 먼저 가입을 안내해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">연결 선수 *</option>
            {academyPlayers.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.displayName}
              </option>
            ))}
          </select>
          <Input placeholder="보호자 이메일 *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="보호자 이름 (표시용)" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
          <div className="flex gap-2">
            {(["father", "mother", "guardian"] as ParentRelation[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={relation === r ? "default" : "outline"}
                onClick={() => setRelation(r)}
              >
                {r === "father" ? "부" : r === "mother" ? "모" : "보호자"}
              </Button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              disabled={!playerId || !email.trim() || busy.key !== null}
              onClick={() =>
                runBusy(
                  busy,
                  "add-guardian",
                  () =>
                    callInviteParentToAcademyPlayer({
                      teamId,
                      playerId,
                      parentEmail: email.trim(),
                      guardianDisplayName: guardianName.trim() || undefined,
                      relation,
                    }),
                  "보호자를 연결했습니다."
                ).then(() => onOpenChange(false))
              }
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddAcademyCoachDialog({
  open,
  onOpenChange,
  teamId,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  busy: Busy;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const reset = () => {
    setEmail("");
    setName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>코치 추가</DialogTitle>
          <DialogDescription>코치 YAGO 계정(이메일)을 팀에 coach 역할로 등록합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="코치 이메일 *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="표시 이름" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              disabled={!email.trim() || busy.key !== null}
              onClick={() =>
                runBusy(
                  busy,
                  "add-coach",
                  () =>
                    callInviteAcademyCoachByEmail({
                      teamId,
                      coachEmail: email.trim(),
                      displayName: name.trim() || undefined,
                    }),
                  "코치를 등록했습니다."
                ).then(() => onOpenChange(false))
              }
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
