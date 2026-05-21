/**
 * 🔥 선수 명단 복붙/엑셀 업로드 + 자동 연령 분류 UI
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AgeRule as RosterAgeRule, ClassifiedRow, ParsedPlayerRow } from "@/utils/rosterAge";
import { classifyRoster, parsePastedText } from "@/utils/rosterAge";
import { parseRosterFile } from "@/utils/rosterXlsx";
import { exportAgeCheckWorkbook } from "@/utils/rosterExportXlsx";
import type { AgeRule } from "@/types/tournament";
import { saveVerifiedPlayers } from "@/lib/tournament/playerRepository";
import { useAuth } from "@/context/AuthProvider";

// Tournament의 AgeRule을 RosterAgeRule로 변환
function convertAgeRule(rule?: AgeRule): RosterAgeRule | undefined {
  if (!rule) return undefined;
  
  if (rule.type === "OPEN") {
    return { type: "OPEN", description: rule.description };
  }
  
  if (rule.type === "U" && rule.maxBirthYear !== undefined) {
    return { type: "U", maxBirthYear: rule.maxBirthYear, description: rule.description };
  }
  
  if (rule.type === "OVER" && rule.minBirthYear !== undefined) {
    return { type: "OVER", minBirthYear: rule.minBirthYear, description: rule.description };
  }
  
  return undefined;
}

function reasonLabel(r: ClassifiedRow["ageCheck"]["reason"]) {
  switch (r) {
    case "OK": return "OK";
    case "AGE_OVER": return "연령 초과";
    case "AGE_UNDER": return "연령 미달";
    case "BIRTH_MISSING": return "생년 누락";
    case "BIRTH_INVALID": return "생년 형식 오류";
    case "RULE_MISSING": return "대회 연령 기준 없음";
    default: return r;
  }
}

function RowTable({ rows }: { rows: ClassifiedRow[] }) {
  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-[840px] w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">이름</th>
            <th className="p-2 text-left">생년월일(원문)</th>
            <th className="p-2 text-left">정규화</th>
            <th className="p-2 text-left">출생연도</th>
            <th className="p-2 text-left">판정</th>
            <th className="p-2 text-left">포지션</th>
            <th className="p-2 text-left">연락처</th>
            <th className="p-2 text-left">등번호</th>
            <th className="p-2 text-left">비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.name}-${idx}`} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.birthDateRaw}</td>
              <td className="p-2">{r.birthDateISO ?? "-"}</td>
              <td className="p-2">{r.birthYear ?? "-"}</td>
              <td className="p-2">
                {r.ageCheck.eligible === true && <Badge>가능</Badge>}
                {r.ageCheck.eligible === false && <Badge variant="destructive">불가</Badge>}
                {r.ageCheck.eligible === null && <Badge variant="secondary">확인필요</Badge>}
                <span className="ml-2 text-muted-foreground">{reasonLabel(r.ageCheck.reason)}</span>
              </td>
              <td className="p-2">{r.position ?? "-"}</td>
              <td className="p-2">{r.phone ?? "-"}</td>
              <td className="p-2">{r.jerseyNo ?? "-"}</td>
              <td className="p-2">{r.memo ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * props.ageRule 는 tournaments 문서의 ageRule 그대로 넘겨주면 됨
 */
export function RosterImportAndClassify(props: {
  associationId: string;
  tournamentId: string;
  ageRule?: AgeRule;
  teamName?: string;
  teamId?: string;
  onSaveSuccess?: () => void;
}) {
  const { user } = useAuth();
  const [paste, setPaste] = useState("");
  const [rawRows, setRawRows] = useState<ParsedPlayerRow[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const convertedRule = useMemo(() => convertAgeRule(props.ageRule), [props.ageRule]);
  const classified = useMemo(() => classifyRoster(rawRows, convertedRule), [rawRows, convertedRule]);

  function handleParsePaste() {
    const rows = parsePastedText(paste);
    if (rows.length === 0) return toast.error("붙여넣기된 데이터가 없습니다. (이름/생년월일이 필요)");
    setRawRows(rows);
    toast.success(`선수 ${rows.length}명 파싱 완료`);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoadingFile(true);
    try {
      const rows = await parseRosterFile(f);
      if (rows.length === 0) toast.error("엑셀에서 선수 데이터(이름)가 발견되지 않았습니다.");
      else {
        setRawRows(rows);
        toast.success(`엑셀에서 선수 ${rows.length}명 불러옴`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "파일 파싱 실패");
    } finally {
      setLoadingFile(false);
      e.target.value = "";
    }
  }

  function exportXlsx() {
    if (classified.all.length === 0) return toast.error("내보낼 데이터가 없습니다.");
    exportAgeCheckWorkbook({
      fileName: `${props.teamName ?? "팀"}_연령검증결과.xlsx`,
      ageRuleText: props.ageRule?.description ?? "연령 기준 없음",
      eligible: classified.eligible,
      ineligible: classified.ineligible,
      needsReview: classified.needsReview,
    });
    toast.success("검증 시트 엑셀을 생성했습니다.");
  }

  async function handleSaveToFirestore() {
    if (classified.all.length === 0) {
      return toast.error("저장할 데이터가 없습니다.");
    }

    if (!user) {
      return toast.error("로그인이 필요합니다.");
    }

    if (!props.teamId || !props.teamName) {
      return toast.error("팀 정보가 필요합니다.");
    }

    setSaving(true);
    try {
      const result = await saveVerifiedPlayers(
        props.associationId,
        props.tournamentId,
        classified.all,
        {
          teamId: props.teamId,
          teamName: props.teamName,
        }
      );

      toast.success(`저장 완료: 총 ${result.saved}명이 사무국 승인 대기 상태로 저장되었습니다.`);
      
      // 초기화
      setPaste("");
      setRawRows([]);
      
      props.onSaveSuccess?.();
    } catch (error: any) {
      console.error("선수 명단 저장 실패:", error);
      toast.error(`저장 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-2">
        <div className="text-base font-semibold">선수 명단 입력 (복붙/엑셀)</div>
        <div className="text-sm text-muted-foreground">
          권장 컬럼 순서: <b>이름, 생년월일, 포지션, 연락처, 등번호, 비고</b> (탭/콤마/| 자동 인식)
        </div>

        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`예)\n이름\t생년월일\t포지션\t연락처\t등번호\t비고\n김민수\t2011-03-12\tFW\t010-0000-0000\t9\t\n박철우\t2008.07.01\tDF\t\t4\t`}
          className="min-h-[140px]"
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleParsePaste}>복붙 파싱</Button>

          <label className="inline-flex items-center gap-2">
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={loadingFile} />
          </label>

          <Button variant="secondary" onClick={() => { setPaste(""); setRawRows([]); }}>
            초기화
          </Button>

          <Button variant="outline" onClick={exportXlsx} disabled={classified.all.length === 0}>
            연령 검증 시트 엑셀 출력
          </Button>

          <Button 
            onClick={handleSaveToFirestore} 
            disabled={classified.all.length === 0 || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "저장 중..." : "검증 결과 저장 (사무국 승인 대기)"}
          </Button>
        </div>

        <div className="text-sm">
          연령 기준: <b>{props.ageRule?.description ?? "설정 없음(판정 불가/확인필요 처리)"}</b>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>가능 {classified.eligible.length}</Badge>
          <Badge variant="destructive">불가 {classified.ineligible.length}</Badge>
          <Badge variant="secondary">확인필요 {classified.needsReview.length}</Badge>
          <Badge variant="outline">총 {classified.all.length}</Badge>
        </div>
      </div>

      {classified.all.length > 0 && (
        <div className="space-y-4">
          <div className="text-base font-semibold">전체</div>
          <RowTable rows={classified.all} />

          <div className="text-base font-semibold">출전 가능</div>
          <RowTable rows={classified.eligible} />

          <div className="text-base font-semibold">연령 불가</div>
          <RowTable rows={classified.ineligible} />

          <div className="text-base font-semibold">확인 필요 (생년 누락/형식 오류/기준 없음)</div>
          <RowTable rows={classified.needsReview} />
        </div>
      )}
    </div>
  );
}

