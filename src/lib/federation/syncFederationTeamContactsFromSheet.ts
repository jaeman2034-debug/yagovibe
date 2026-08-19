/**
 * PR4-1.3 — Client helper for Google Sheets → Firestore contacts sync.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type SyncFederationTeamContactsFromSheetResult = {
  ok: true;
  source: "google_sheets";
  via: "sheets_api" | "public_csv" | "connect";
  spreadsheetId: string;
  sheetName: string;
  updated: number;
  unmatched: number;
  skipped: number;
  failed: number;
  total: number;
  platformIdsWritten: number;
  contactPersonsFilled?: number;
  platformTeams?: Array<{ platformTeamId: string; name: string }>;
  results: Array<{
    teamName: string;
    status: "updated" | "skipped" | "unmatched";
    platformTeamId?: string;
    platformTeamIdFilled?: boolean;
    matchMethod?: "platformTeamId" | "alias" | "exact" | "fuzzy";
    reason?: string;
    candidates?: Array<{
      platformTeamId: string;
      name: string;
      fedTeamId?: string;
      score: number;
    }>;
    row?: {
      teamName?: string;
      chairman?: { name?: string; phone?: string };
      manager?: { name?: string; phone?: string };
      coach?: { name?: string; phone?: string };
      sheetRowIndex?: number;
    };
  }>;
};

export async function syncFederationTeamContactsFromSheet(input: {
  federationSlug: string;
  spreadsheetId?: string;
  sheetName?: string;
  persistConfig?: boolean;
  /** Save spreadsheet link only (no Firestore contact sync) */
  connectOnly?: boolean;
}): Promise<SyncFederationTeamContactsFromSheetResult> {
  const callable = httpsCallable<
    {
      federationSlug: string;
      spreadsheetId?: string;
      sheetName?: string;
      persistConfig?: boolean;
      connectOnly?: boolean;
    },
    SyncFederationTeamContactsFromSheetResult
  >(functions, "syncFederationTeamContactsFromSheet");
  const res = await callable(input);
  return res.data;
}
