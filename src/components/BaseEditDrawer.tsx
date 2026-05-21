/**
 * ⚠️ 아래 TODO 3개만 너희 프로젝트 기존 구현에 맞춰 연결하면 즉시 동작:
 * - tenantId, userId, role 얻는 부분
 * - before(기존 문서), after(폼 payload) 얻는 부분
 * - 실제 Firestore save 함수 호출 부분
 */

import React from "react";
import * as Sentry from "@sentry/react";
import { evaluateEthics } from "@/lib/ethics/scoreEngine";
import { writeEthicsDecision } from "@/lib/firebase/writeEthics";
import { createApprovalRequest } from "@/lib/firebase/writeApproval";
import { drWrite } from "@/lib/firebase/firestoreProxy";

type BaseEditDrawerProps<T extends Record<string, any>> = {
  collectionName: string;
  id?: string;
  defaultValues: Partial<T>;
  extraFields?: React.ReactNode;
  onSuccess: () => void;

  afterSaveHook?: (saved: T) => Promise<void>;
};

export function BaseEditDrawer<T extends Record<string, any>>(props: BaseEditDrawerProps<T>) {
  const { collectionName, id, onSuccess, afterSaveHook } = props;

  // TODO(1): 너희 기존 auth/tenant 컨텍스트에서 가져오기
  const tenantId = (window as any).__TENANT_ID__ ?? "default-tenant";
  const userId = (window as any).__USER_ID__ ?? "unknown-user";
  const role: "admin" | "editor" | "viewer" = (window as any).__ROLE__ ?? "viewer";

  // TODO(2): 너희 기존 상태/쿼리에서 before/after 연결
  const beforeDoc: Record<string, any> | null = null;

  const buildAfterPayload = (): Record<string, any> => {
    // ⚠️ 너희 기존 폼 값으로 payload 만드는 함수로 교체
    // 예: react-hook-form getValues()
    return {
      ...(props.defaultValues as any),
    };
  };

  const saveToFirestore = async (after: Record<string, any>): Promise<T> => {
    // TODO(3): 너희 기존 Firestore 저장 함수로 교체
    // 여기서는 컴파일만 되게 더미
    return { ...(after as any), id: id ?? "new-id" } as T;
  };

  const toast = {
    success: (m: string) => console.log("toast.success:", m),
    error: (m: string) => console.log("toast.error:", m),
    info: (m: string) => console.log("toast.info:", m),
  };

  const onSave = async () => {
    // (기존) confirm / loading 시작은 너희 코드 유지

    // ✅ COMMIT 19: DR 체크 (쓰기 차단)
    try {
      await drWrite({ tenantId, region: "us-central1" });
    } catch (error: any) {
      toast.error(error.message || "DR: 쓰기가 차단되었습니다");
      return;
    }

    const after = buildAfterPayload();
    const before = beforeDoc;
    const action = (id ? "update" : "create") as const;

    // ✅ auditId는 "상관관계 키"로 무조건 만든다
    const auditId =
      (globalThis.crypto && "randomUUID" in globalThis.crypto && globalThis.crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // ✅ 윤리 평가
    const { score, verdict, reasons, signals } = evaluateEthics({
      tenantId,
      userId,
      role,
      collection: collectionName,
      docId: id ?? "(new)",
      action,
      before,
      after,
      // 있으면 연결(없으면 0)
      editCountLast10m: 0,
      deleteRestoreLoopLast1h: 0,
    });

    // ✅ 윤리 판단은 항상 기록
    await writeEthicsDecision({
      auditId,
      tenantId,
      collection: collectionName,
      docId: id ?? "(new)",
      action,
      userId,
      score,
      verdict,
      reasons,
      signals,
    });

    // ✅ Sentry 상관관계
    Sentry.setContext("audit", { auditId, tenantId, collection: collectionName, docId: id ?? "(new)" });
    Sentry.setContext("ethics", { score, verdict, reasons, signals });

    // ✅ verdict 처리
    if (verdict === "block") {
      toast.error("윤리/안전 가드레일에 의해 차단됨");
      return;
    }

    if (verdict === "review_required") {
      await createApprovalRequest({
        auditId,
        tenantId,
        collection: collectionName,
        docId: id ?? null,
        action,
        payload: after,
        before,
        ethicsScore: score,
        ethicsReasons: reasons,
        userId,
      });
      toast.info("승인 요청으로 전환됨 (관리자 승인 필요)");
      return;
    }

    // ✅ allow → 기존 저장 로직 그대로
    const saved = await saveToFirestore({ ...after, lastAuditId: auditId });
    toast.success("저장 완료");

    // ✅ 외부 동기화 훅(기존 패턴 유지)
    if (afterSaveHook) {
      try {
        await afterSaveHook(saved);
        toast.success("외부 시스템 동기화 완료");
      } catch {
        toast.error("외부 시스템 동기화 실패");
      }
    }

    onSuccess();
  };

  return (
    <div>
      {/* 기존 Drawer UI 유지 */}
      <button onClick={onSave}>저장</button>
      {props.extraFields}
    </div>
  );
}

