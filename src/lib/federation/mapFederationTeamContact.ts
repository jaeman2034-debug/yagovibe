/**
 * One-shot manual roster → platformTeamId mapping.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TeamContactImportRow } from "@/lib/federation/teamContactsImportParse";

export type MapFederationTeamContactResult = {
  ok: true;
  teamName: string;
  platformTeamId: string;
  aliasKey: string;
  contactsUpdated: boolean;
  sheetPlatformIdWritten: boolean;
  sheetWriteReason: string | null;
};

export async function mapFederationTeamContact(input: {
  federationSlug: string;
  teamName: string;
  platformTeamId: string;
  row?: Pick<
    TeamContactImportRow,
    "chairman" | "manager" | "coach" | "platformTeamId"
  > & { sheetRowIndex?: number };
  spreadsheetId?: string;
  sheetName?: string;
}): Promise<MapFederationTeamContactResult> {
  const callable = httpsCallable<typeof input, MapFederationTeamContactResult>(
    functions,
    "mapFederationTeamContact"
  );
  const res = await callable(input);
  return res.data;
}
