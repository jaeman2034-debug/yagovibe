/**
 * Firestore `wallets/{uid}` — scaffold only; no economy / pricing logic in Phase 2 PR-1.
 * Balances and currency codes are placeholders for future wallet + compliance design.
 */

import type { Timestamp } from "firebase/firestore";

export type WalletCurrencyCode = string;

export interface WalletDoc {
  schemaVersion: number;
  uid: string;
  /** e.g. { "YGC": 0 } — keys are app-defined, not enforced here */
  balances: Partial<Record<WalletCurrencyCode, number>>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
