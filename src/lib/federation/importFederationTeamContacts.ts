/**
 * Client helper — parse xlsx/csv + call importFederationTeamContacts.
 */

import * as XLSX from "xlsx";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  parseContactRosterMatrix,
  type TeamContactImportRow,
} from "@/lib/federation/teamContactsImportParse";

export type TeamMatchCandidate = {
  platformTeamId: string;
  name: string;
  fedTeamId?: string;
  score: number;
};

export type ImportFederationTeamContactsResult = {
  ok: true;
  source?: "csv_migration";
  updated: number;
  unmatched: number;
  skipped?: number;
  failed?: number;
  total: number;
  contactPersonsFilled?: number;
  platformTeams?: Array<{ platformTeamId: string; name: string }>;
  results: Array<{
    teamName: string;
    status: "updated" | "skipped" | "unmatched";
    platformTeamId?: string;
    platformTeamIdFilled?: boolean;
    matchMethod?: "platformTeamId" | "alias" | "exact" | "fuzzy";
    reason?: string;
    candidates?: TeamMatchCandidate[];
    row?: {
      teamName?: string;
      chairman?: { name?: string; phone?: string };
      manager?: { name?: string; phone?: string };
      coach?: { name?: string; phone?: string };
      sheetRowIndex?: number;
    };
  }>;
};

export function parseContactRosterFile(file: File): Promise<TeamContactImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          resolve([]);
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        }) as unknown[][];
        const merges = (sheet["!merges"] || []) as Array<{
          s: { r: number; c: number };
          e: { r: number; c: number };
        }>;
        resolve(parseContactRosterMatrix(matrix, merges));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("엑셀 파싱 실패"));
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
}

export async function importFederationTeamContacts(input: {
  federationSlug: string;
  rows: TeamContactImportRow[];
}): Promise<ImportFederationTeamContactsResult> {
  const callable = httpsCallable<
    { federationSlug: string; rows: TeamContactImportRow[] },
    ImportFederationTeamContactsResult
  >(functions, "importFederationTeamContacts");
  const res = await callable(input);
  return res.data;
}

/** Downloadable CSV template (UTF-8 BOM for Excel). PlatformTeamId는 시스템이 채움. */
export function downloadContactRosterTemplate(): void {
  const header = "팀명,회장,회장전화,총무,총무전화,감독,감독전화,PlatformTeamId,비고";
  const sample =
    "마들FC,이종산,01046699245,강우진,01093901085,이준영,01072328182,,";
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + "\n" + sample + "\n"], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nowon_team_contacts_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
