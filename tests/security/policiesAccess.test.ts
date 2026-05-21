/**
 * ✅ COMMIT 13: Policies Access Tests
 * Policies 및 Policy Changes 접근 제어 검증
 */

import { describe, it, beforeEach, afterAll } from "vitest";
import { getTestEnv, clearFirestore, cleanup, authedContext } from "./setup";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

describe("Policies access", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("admin은 자신의 tenant policy read/write 가능", async () => {
    const env = await getTestEnv();
    const dbAdmin = authedContext(env, { 
      uid: "a1", 
      token: { tenantId: "tA", role: "admin" } 
    });

    const ref = doc(dbAdmin, "_policies", "tA");
    await assertSucceeds(setDoc(ref, { 
      tenantId: "tA",
      rules: {},
      version: 1
    }));
    await assertSucceeds(getDoc(ref));
  });

  it("admin은 다른 tenant policy 접근 불가", async () => {
    const env = await getTestEnv();
    const dbAdminA = authedContext(env, { 
      uid: "aA", 
      token: { tenantId: "tA", role: "admin" } 
    });
    const dbAdminB = authedContext(env, { 
      uid: "aB", 
      token: { tenantId: "tB", role: "admin" } 
    });

    await assertSucceeds(setDoc(doc(dbAdminB, "_policies", "tB"), { 
      tenantId: "tB",
      rules: {},
      version: 1
    }));

    await assertFails(getDoc(doc(dbAdminA, "_policies", "tB")));
  });

  it("editor는 policy 접근 불가 (admin만)", async () => {
    const env = await getTestEnv();
    const dbEditor = authedContext(env, { 
      uid: "e1", 
      token: { tenantId: "tA", role: "editor" } 
    });

    await assertFails(getDoc(doc(dbEditor, "_policies", "tA")));
    await assertFails(setDoc(doc(dbEditor, "_policies", "tA"), { 
      tenantId: "tA",
      rules: {}
    }));
  });

  it("admin은 자신의 tenant policy changes read/create/update 가능", async () => {
    const env = await getTestEnv();
    const dbAdmin = authedContext(env, { 
      uid: "a1", 
      token: { tenantId: "tA", role: "admin" } 
    });

    const ref = doc(dbAdmin, "_policyChanges", "pc1");
    await assertSucceeds(setDoc(ref, { 
      tenantId: "tA",
      policyId: "tA",
      changeType: "update",
      changes: {}
    }));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { 
      status: "applied"
    }));
  });

  it("admin은 다른 tenant policy changes 접근 불가", async () => {
    const env = await getTestEnv();
    const dbAdminA = authedContext(env, { 
      uid: "aA", 
      token: { tenantId: "tA", role: "admin" } 
    });
    const dbAdminB = authedContext(env, { 
      uid: "aB", 
      token: { tenantId: "tB", role: "admin" } 
    });

    await assertSucceeds(setDoc(doc(dbAdminB, "_policyChanges", "pcB1"), { 
      tenantId: "tB",
      policyId: "tB",
      changeType: "update",
      changes: {}
    }));

    await assertFails(getDoc(doc(dbAdminA, "_policyChanges", "pcB1")));
  });
});

