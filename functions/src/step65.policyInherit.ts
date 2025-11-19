import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * Step 65: Resolve Policy - 정책 상속 해석
 * Org → Tenant → Team 순서로 정책 상속
 * 원칙: 낮은 레벨에서만 상향(permit) 가능, 상위의 차단은 하위에서 해제 불가
 */
export async function resolvePolicy(params: {
    orgId: string;
    tenantId?: string;
    teamId?: string;
}): Promise<any> {
    try {
        const { orgId, tenantId, teamId } = params;

        // 1) Org 정책 조회
        const orgDoc = await db.doc(`orgs/${orgId}`).get();
        if (!orgDoc.exists) {
            throw new Error("org_not_found");
        }

        const org = orgDoc.data() as any;
        let policy: any = {};

        if (org.policyRef) {
            const orgPolicyDoc = await db.doc(org.policyRef).get();
            if (orgPolicyDoc.exists) {
                policy = orgPolicyDoc.data() || {};
            }
        }

        // 2) Tenant 정책 조회 (있는 경우)
        if (tenantId) {
            const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
            if (tenantDoc.exists) {
                const tenant = tenantDoc.data() as any;

                // Tenant가 다른 Org에 속한 경우 검증
                if (tenant.orgId !== orgId) {
                    throw new Error("tenant_org_mismatch");
                }

                if (tenant.policyRef) {
                    const tenantPolicyDoc = await db.doc(tenant.policyRef).get();
                    if (tenantPolicyDoc.exists) {
                        const tenantPolicy = tenantPolicyDoc.data() || {};
                        // 병합: allow는 OR, deny는 AND로 적용
                        policy = mergePolicies(policy, tenantPolicy);
                    }
                }

                // planOverride 적용
                if (tenant.planOverride) {
                    policy.planOverride = tenant.planOverride;
                }
            }
        }

        // 3) Team 정책 조회 (있는 경우)
        if (teamId) {
            const teamDoc = await db.doc(`teams/${teamId}`).get();
            if (teamDoc.exists) {
                const team = teamDoc.data() as any;

                // Team이 해당 Tenant/Org에 속한 경우 검증
                if (tenantId && team.tenantId !== tenantId) {
                    throw new Error("team_tenant_mismatch");
                }

                // Team 정책은 일반적으로 Org/Tenant 정책을 상속받지만,
                // 추가 제한은 가능 (허용은 불가)
                // TODO: Team 정책 병합 로직 추가
            }
        }

        return policy;
    } catch (error: any) {
        logger.error("❌ 정책 상속 해석 오류:", error);
        throw error;
    }
}

/**
 * 정책 병합: allow는 OR, deny는 AND로 적용
 */
function mergePolicies(base: any, override: any): any {
    const merged = { ...base };

    // allow 규칙: OR (하나라도 허용하면 허용)
    if (override.allow) {
        merged.allow = [...(base.allow || []), ...override.allow];
    }

    // deny 규칙: AND (모두 차단해야 차단)
    if (override.deny) {
        merged.deny = [...(base.deny || []), ...override.deny];
    }

    // 기타 필드는 override로 덮어쓰기
    Object.keys(override).forEach((key) => {
        if (key !== "allow" && key !== "deny") {
            merged[key] = override[key];
        }
    });

    return merged;
}

