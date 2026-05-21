/**
 * ✅ COMMIT 13: Security Test Setup
 * Firebase Rules Unit Testing 환경 초기화
 */

import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let testEnv: RulesTestEnvironment | null = null;

export async function getTestEnv() {
  if (testEnv) return testEnv;

  const rulesPath = join(process.cwd(), "firestore.rules");
  const rules = readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: "demo-tenant-security",
    firestore: {
      rules: rules,
    },
  });

  return testEnv;
}

export async function clearFirestore() {
  const env = await getTestEnv();
  await env.clearFirestore();
}

export async function cleanup() {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}

export function authedContext(env: RulesTestEnvironment, auth: { uid: string; token: any }) {
  return env.authenticatedContext(auth.uid, auth).firestore();
}

export function unauthedContext(env: RulesTestEnvironment) {
  return env.unauthenticatedContext().firestore();
}

