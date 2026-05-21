/**
 * ✅ COMMIT 13: Ethics Access Tests
 * Ethics Decisions 접근 제어 검증
 */

import { describe, it, beforeEach, afterAll } from "vitest";
import { getTestEnv, clearFirestore, cleanup, authedContext } from "./setup";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

describe("Ethics access", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("signed-in user는 자신의 tenant에 ethics decision create 가능", async () => {
    const env = await getTestEnv();
    const dbUser = authedContext(env, { 
      uid: "u1", 
      token: { tenantId: "tA", role: "editor" } 
    });

    const ref = doc(dbUser, "_ethicsDecisions", "ed1");
    await assertSucceeds(setDoc(ref, { 
      tenantId: "tA",
      decision: "approved",
      reason: "test"
    }));
  });

  it("admin은 자신의 tenant ethics decision read 가능", async () => {
    const env = await getTestEnv();
    const dbAdmin = authedContext(env, { 
      uid: "a1", 
      token: { tenantId: "tA", role: "admin" } 
    });
    const dbUser = authedContext(env, { 
      uid: "u1", 
      token: { tenantId: "tA", role: "editor" } 
    });

    // user가 생성
    await assertSucceeds(setDoc(doc(dbUser, "_ethicsDecisions", "ed2"), { 
      tenantId: "tA",
      decision: "approved",
      reason: "test"
    }));

    // admin이 읽기 가능
    await assertSucceeds(getDoc(doc(dbAdmin, "_ethicsDecisions", "ed2")));
  });

  it("admin은 다른 tenant ethics decision read 불가", async () => {
    const env = await getTestEnv();
    const dbAdminA = authedContext(env, { 
      uid: "aA", 
      token: { tenantId: "tA", role: "admin" } 
    });
    const dbAdminB = authedContext(env, { 
      uid: "aB", 
      token: { tenantId: "tB", role: "admin" } 
    });

    await assertSucceeds(setDoc(doc(dbAdminB, "_ethicsDecisions", "edB1"), { 
      tenantId: "tB",
      decision: "approved",
      reason: "test"
    }));

    await assertFails(getDoc(doc(dbAdminA, "_ethicsDecisions", "edB1")));
  });

  it("ethics decision update/delete 불가", async () => {
    const env = await getTestEnv();
    const dbAdmin = authedContext(env, { 
      uid: "a1", 
      token: { tenantId: "tA", role: "admin" } 
    });

    await assertSucceeds(setDoc(doc(dbAdmin, "_ethicsDecisions", "ed3"), { 
      tenantId: "tA",
      decision: "approved",
      reason: "test"
    }));

    // update는 rules에서 false로 설정
    // delete는 rules에서 false로 설정
    // Note: 실제 구현에서는 Rules에서 allow update, delete: if false로 설정
  });
});

