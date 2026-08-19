/**
 * PR4-1.4/1.5 — Contact Management Dual Track + fuzzy/manual PlatformTeamId map
 */

import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  downloadContactRosterTemplate,
  importFederationTeamContacts,
  parseContactRosterFile,
  type ImportFederationTeamContactsResult,
  type TeamMatchCandidate,
} from "@/lib/federation/importFederationTeamContacts";
import { syncFederationTeamContactsFromSheet } from "@/lib/federation/syncFederationTeamContactsFromSheet";
import { mapFederationTeamContact } from "@/lib/federation/mapFederationTeamContact";
import type { TeamContactImportRow } from "@/lib/federation/teamContactsImportParse";

type Props = {
  federationSlug: string;
};

type TrackResult = {
  updated: number;
  unmatched: number;
  failed: number;
  total: number;
  platformIdsWritten?: number;
  via?: string;
};

type UnmatchedItem = {
  teamName: string;
  reason?: string;
  candidates?: TeamMatchCandidate[];
  row?: {
    teamName?: string;
    chairman?: { name?: string; phone?: string };
    manager?: { name?: string; phone?: string };
    coach?: { name?: string; phone?: string };
    sheetRowIndex?: number;
  };
};

type PlatformTeamOpt = { platformTeamId: string; name: string };

type OpsSnapshot = {
  at: string | null;
  updated: number | null;
  unmatched: number | null;
  failed: number | null;
  total: number | null;
  contactPersons: number | null;
};

function formatTs(v: unknown): string | null {
  if (!v) return null;
  try {
    if (v instanceof Timestamp) return v.toDate().toLocaleString("ko-KR");
    if (
      typeof v === "object" &&
      v !== null &&
      "toDate" in v &&
      typeof (v as { toDate: () => Date }).toDate === "function"
    ) {
      return (v as { toDate: () => Date }).toDate().toLocaleString("ko-KR");
    }
  } catch {
    /* ignore */
  }
  return null;
}

function ResultCards({ stats }: { stats: TrackResult }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] text-slate-500">성공</p>
        <p className="text-sm font-semibold text-emerald-800">{stats.updated}</p>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] text-slate-500">미매칭</p>
        <p className="text-sm font-semibold text-amber-800">{stats.unmatched}</p>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] text-slate-500">실패</p>
        <p className="text-sm font-semibold text-red-800">{stats.failed}</p>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] text-slate-500">전체</p>
        <p className="text-sm font-semibold text-slate-900">{stats.total}</p>
      </div>
    </div>
  );
}

function OpsStatusCard({
  title,
  snap,
  emptyHint,
}: {
  title: string;
  snap: OpsSnapshot;
  emptyHint: string;
}) {
  if (!snap.at && snap.updated == null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-[11px] text-slate-500">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 space-y-1">
      <p className="text-[11px] font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-700">{snap.at ?? "—"}</p>
      <p className="text-[11px] text-slate-600">
        {snap.updated != null ? `${snap.updated}팀 성공` : "—"}
        {" · "}
        {snap.failed != null ? `${snap.failed}팀 실패` : "0팀 실패"}
        {snap.unmatched != null && snap.unmatched > 0
          ? ` · ${snap.unmatched}팀 미매칭`
          : ""}
      </p>
      {snap.contactPersons != null && snap.contactPersons > 0 && (
        <p className="text-[11px] text-emerald-800">
          담당자 {snap.contactPersons}명 등록
        </p>
      )}
    </div>
  );
}

function UnmatchedMapper({
  rows,
  platformTeams,
  federationSlug,
  spreadsheetId,
  sheetName,
  onMapped,
}: {
  rows: UnmatchedItem[];
  platformTeams: PlatformTeamOpt[];
  federationSlug: string;
  spreadsheetId?: string;
  sheetName?: string;
  onMapped: (teamName: string) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyName, setBusyName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  if (rows.length === 0) return null;

  async function onMap(item: UnmatchedItem) {
    const platformTeamId = selected[item.teamName];
    if (!platformTeamId) {
      setErr(`${item.teamName}: 플랫폼 팀을 선택하세요.`);
      return;
    }
    setBusyName(item.teamName);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await mapFederationTeamContact({
        federationSlug,
        teamName: item.teamName,
        platformTeamId,
        row: item.row,
        spreadsheetId,
        sheetName,
      });
      setOkMsg(
        `${item.teamName} → 연결 완료` +
          (res.contactsUpdated ? " · 연락처 반영" : "") +
          (res.sheetPlatformIdWritten ? " · Sheets PlatformTeamId 저장" : "")
      );
      onMapped(item.teamName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "매핑 실패");
    } finally {
      setBusyName(null);
    }
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 space-y-2">
      <p className="font-semibold">미매칭 팀 — 플랫폼 팀 1회 연결</p>
      <p className="text-[11px] text-amber-900/80">
        한 번 연결하면 PlatformTeamId·별칭이 저장되어 다음 Import/동기화부터 자동
        매칭됩니다.
      </p>
      {err && (
        <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">{err}</p>
      )}
      {okMsg && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-900">
          {okMsg}
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((u) => {
          const byId = new Map<string, string>();
          for (const c of u.candidates || []) {
            byId.set(c.platformTeamId, `${c.name} · 추천(${c.score})`);
          }
          for (const t of platformTeams) {
            if (!byId.has(t.platformTeamId)) byId.set(t.platformTeamId, t.name);
          }
          const opts = Array.from(byId.entries()).map(([id, name]) => ({
            platformTeamId: id,
            name,
          }));

          return (
            <li
              key={u.teamName}
              className="flex flex-col gap-1 rounded border border-amber-100 bg-white px-2 py-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-[5.5rem] font-medium text-slate-900">{u.teamName}</div>
              <select
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                value={selected[u.teamName] || ""}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [u.teamName]: e.target.value }))
                }
              >
                <option value="">플랫폼 팀 선택…</option>
                {opts.map((o) => (
                  <option key={o.platformTeamId} value={o.platformTeamId}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyName === u.teamName || !selected[u.teamName]}
                onClick={() => void onMap(u)}
                className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                {busyName === u.teamName ? "저장 중…" : "연결"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function resultsToUnmatched(
  results: ImportFederationTeamContactsResult["results"]
): UnmatchedItem[] {
  return results
    .filter((r) => r.status === "unmatched")
    .map((r) => ({
      teamName: r.teamName,
      reason: r.reason,
      candidates: r.candidates,
      row: r.row,
    }));
}

export function FederationTeamContactsImportPanel({ federationSlug }: Props) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("노원구축구협회 연락처 원장");
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [csvSnap, setCsvSnap] = useState<OpsSnapshot>({
    at: null,
    updated: null,
    unmatched: null,
    failed: null,
    total: null,
    contactPersons: null,
  });
  const [sheetSnap, setSheetSnap] = useState<OpsSnapshot>({
    at: null,
    updated: null,
    unmatched: null,
    failed: null,
    total: null,
    contactPersons: null,
  });

  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);
  const [sheetStats, setSheetStats] = useState<TrackResult | null>(null);
  const [sheetUnmatched, setSheetUnmatched] = useState<UnmatchedItem[]>([]);

  const [preview, setPreview] = useState<TeamContactImportRow[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvErr, setCsvErr] = useState<string | null>(null);
  const [csvMsg, setCsvMsg] = useState<string | null>(null);
  const [csvStats, setCsvStats] = useState<TrackResult | null>(null);
  const [csvUnmatched, setCsvUnmatched] = useState<UnmatchedItem[]>([]);
  const [platformTeams, setPlatformTeams] = useState<PlatformTeamOpt[]>([]);

  async function reloadMeta() {
    const snap = await getDoc(doc(db, "federations", federationSlug));
    if (!snap.exists()) return;
    const data = snap.data();
    const cfg = data?.teamContactsSheet as
      | {
          spreadsheetId?: string;
          sheetName?: string;
          lastSyncedAt?: unknown;
          lastSyncUpdated?: number;
          lastSyncUnmatched?: number;
          lastSyncFailed?: number;
          lastSyncTotal?: number;
          lastSyncContactPersons?: number;
        }
      | undefined;
    const csvCfg = data?.teamContactsCsvImport as
      | {
          lastImportedAt?: unknown;
          lastImportUpdated?: number;
          lastImportUnmatched?: number;
          lastImportFailed?: number;
          lastImportTotal?: number;
          lastImportContactPersons?: number;
        }
      | undefined;
    if (cfg?.spreadsheetId) {
      setSheetUrl(String(cfg.spreadsheetId));
      setConnectedId(String(cfg.spreadsheetId));
    }
    if (cfg?.sheetName) setSheetName(String(cfg.sheetName));
    setSheetSnap({
      at: formatTs(cfg?.lastSyncedAt) ?? null,
      updated: typeof cfg?.lastSyncUpdated === "number" ? cfg.lastSyncUpdated : null,
      unmatched:
        typeof cfg?.lastSyncUnmatched === "number" ? cfg.lastSyncUnmatched : null,
      failed: typeof cfg?.lastSyncFailed === "number" ? cfg.lastSyncFailed : null,
      total: typeof cfg?.lastSyncTotal === "number" ? cfg.lastSyncTotal : null,
      contactPersons:
        typeof cfg?.lastSyncContactPersons === "number"
          ? cfg.lastSyncContactPersons
          : null,
    });
    setCsvSnap({
      at: formatTs(csvCfg?.lastImportedAt) ?? null,
      updated:
        typeof csvCfg?.lastImportUpdated === "number"
          ? csvCfg.lastImportUpdated
          : null,
      unmatched:
        typeof csvCfg?.lastImportUnmatched === "number"
          ? csvCfg.lastImportUnmatched
          : null,
      failed:
        typeof csvCfg?.lastImportFailed === "number" ? csvCfg.lastImportFailed : null,
      total:
        typeof csvCfg?.lastImportTotal === "number" ? csvCfg.lastImportTotal : null,
      contactPersons:
        typeof csvCfg?.lastImportContactPersons === "number"
          ? csvCfg.lastImportContactPersons
          : null,
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) await reloadMeta();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [federationSlug]);

  async function onConnectSheet() {
    if (!sheetUrl.trim()) {
      setSheetErr("Google Sheets URL 또는 Spreadsheet ID를 입력하세요.");
      return;
    }
    setSheetBusy(true);
    setSheetErr(null);
    setSheetMsg(null);
    try {
      const res = await syncFederationTeamContactsFromSheet({
        federationSlug,
        spreadsheetId: sheetUrl.trim(),
        sheetName: sheetName.trim() || undefined,
        connectOnly: true,
        persistConfig: true,
      });
      setConnectedId(res.spreadsheetId);
      setSheetUrl(res.spreadsheetId);
      setSheetMsg("Google Sheets가 연결되었습니다. 이후 [지금 동기화]로 반영하세요.");
      await reloadMeta();
    } catch (e) {
      setSheetErr(e instanceof Error ? e.message : "연결 실패");
    } finally {
      setSheetBusy(false);
    }
  }

  async function onSyncSheet() {
    setSheetBusy(true);
    setSheetErr(null);
    setSheetMsg(null);
    setSheetStats(null);
    setSheetUnmatched([]);
    try {
      const res = await syncFederationTeamContactsFromSheet({
        federationSlug,
        spreadsheetId: sheetUrl.trim() || undefined,
        sheetName: sheetName.trim() || undefined,
        persistConfig: true,
      });
      setSheetStats({
        updated: res.updated,
        unmatched: res.unmatched,
        failed: res.failed,
        total: res.total,
        platformIdsWritten: res.platformIdsWritten,
        via: res.via,
      });
      setSheetMsg(
        `동기화 완료 · 성공 ${res.updated} · 미매칭 ${res.unmatched}` +
          (res.platformIdsWritten
            ? ` · PlatformTeamId 자동기입 ${res.platformIdsWritten}`
            : "")
      );
      setSheetUnmatched(resultsToUnmatched(res.results));
      if (res.platformTeams?.length) setPlatformTeams(res.platformTeams);
      if (res.spreadsheetId) {
        setSheetUrl(res.spreadsheetId);
        setConnectedId(res.spreadsheetId);
      }
      await reloadMeta();
    } catch (e) {
      setSheetErr(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setSheetBusy(false);
    }
  }

  async function onFile(file: File | null) {
    setCsvErr(null);
    setCsvMsg(null);
    setCsvUnmatched([]);
    setCsvStats(null);
    if (!file) {
      setPreview([]);
      return;
    }
    try {
      const rows = await parseContactRosterFile(file);
      setPreview(rows);
      if (rows.length === 0) {
        setCsvErr(
          "파싱된 팀이 없습니다. 헤더: 팀명,회장,회장전화… 또는 노원 공식 다단 헤더"
        );
      }
    } catch (e) {
      setPreview([]);
      setCsvErr(e instanceof Error ? e.message : "파일 파싱 실패");
    }
  }

  async function onImportCsv() {
    if (preview.length === 0) return;
    setCsvBusy(true);
    setCsvErr(null);
    setCsvMsg(null);
    try {
      const res = await importFederationTeamContacts({
        federationSlug,
        rows: preview,
      });
      setCsvStats({
        updated: res.updated,
        unmatched: res.unmatched,
        failed: 0,
        total: res.total,
      });
      setCsvMsg(
        `가져오기 완료: ${res.updated}팀 반영 · ${res.unmatched}팀 미매칭 (전체 ${res.total})`
      );
      setCsvUnmatched(resultsToUnmatched(res.results));
      if (res.platformTeams?.length) setPlatformTeams(res.platformTeams);
      await reloadMeta();
    } catch (e) {
      setCsvErr(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setCsvBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">협회 연락처 관리</h3>
        <p className="mt-1 text-xs text-slate-600">
          Dual Track: Google Sheets(운영 SoT) + Excel/CSV(Migration). 팀명 매칭은
          PlatformTeamId → Exact(공릉=공릉FC) → Fuzzy → 수동 연결 순입니다.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <OpsStatusCard
          title="마지막 Import (Excel/CSV)"
          snap={csvSnap}
          emptyHint="아직 Import 기록이 없습니다."
        />
        <OpsStatusCard
          title="마지막 동기화 (Google Sheets)"
          snap={sheetSnap}
          emptyHint="아직 Sheets 동기화 기록이 없습니다."
        />
      </div>

      <section className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
        <div>
          <p className="text-xs font-semibold text-emerald-950">① Google Sheets (운영 SoT)</p>
          <p className="mt-0.5 text-[11px] text-emerald-900/80">
            PlatformTeamId는 시스템이 자동 기입하며, 이미 값이 있으면 변경하지 않습니다.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">
            Google Sheets URL 또는 Spreadsheet ID
          </span>
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">시트 탭 이름</span>
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={sheetBusy || !sheetUrl.trim()}
            onClick={() => void onConnectSheet()}
            className="rounded-lg border border-slate-700 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-40"
          >
            {sheetBusy ? "처리 중…" : "Google Sheets 연결"}
          </button>
          <button
            type="button"
            disabled={sheetBusy || (!sheetUrl.trim() && !connectedId)}
            onClick={() => void onSyncSheet()}
            className="rounded-lg border border-emerald-800 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {sheetBusy ? "동기화 중…" : "지금 동기화"}
          </button>
        </div>

        <p className="text-[11px] text-slate-600">
          {connectedId ? `연결됨 · ${connectedId.slice(0, 12)}…` : "시트 미연결"}
        </p>

        {sheetErr && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {sheetErr}
          </p>
        )}
        {sheetMsg && (
          <p className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900">
            {sheetMsg}
          </p>
        )}
        {sheetStats && <ResultCards stats={sheetStats} />}
        <UnmatchedMapper
          rows={sheetUnmatched}
          platformTeams={platformTeams}
          federationSlug={federationSlug}
          spreadsheetId={sheetUrl || connectedId || undefined}
          sheetName={sheetName}
          onMapped={(name) => {
            setSheetUnmatched((prev) => prev.filter((r) => r.teamName !== name));
            setSheetStats((s) =>
              s
                ? {
                    ...s,
                    updated: s.updated + 1,
                    unmatched: Math.max(0, s.unmatched - 1),
                  }
                : s
            );
          }}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <div>
          <p className="text-xs font-semibold text-slate-900">
            ② Excel / CSV (초기 구축 · Migration)
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            노원 공식 양식(다단 헤더·병합 셀)과 단순 CSV를 지원합니다. 미매칭은 아래에서 1회
            연결하세요.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadContactRosterTemplate()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            템플릿 다운로드
          </button>
          <label className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            엑셀 / CSV 선택
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={csvBusy || preview.length === 0}
            onClick={() => void onImportCsv()}
            className="rounded-lg border border-slate-700 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-40"
          >
            {csvBusy ? "가져오는 중…" : "가져오기"}
          </button>
        </div>

        <p className="text-[11px] text-slate-600">
          {preview.length > 0 ? `미리보기 ${preview.length}팀` : "파일을 선택하면 미리보기가 표시됩니다."}
        </p>

        {csvErr && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {csvErr}
          </p>
        )}
        {csvMsg && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {csvMsg}
          </p>
        )}
        {csvStats && <ResultCards stats={csvStats} />}
        <UnmatchedMapper
          rows={csvUnmatched}
          platformTeams={platformTeams}
          federationSlug={federationSlug}
          spreadsheetId={sheetUrl || connectedId || undefined}
          sheetName={sheetName}
          onMapped={(name) => {
            setCsvUnmatched((prev) => prev.filter((r) => r.teamName !== name));
            setCsvStats((s) =>
              s
                ? {
                    ...s,
                    updated: s.updated + 1,
                    unmatched: Math.max(0, s.unmatched - 1),
                  }
                : s
            );
          }}
        />
      </section>
    </div>
  );
}
