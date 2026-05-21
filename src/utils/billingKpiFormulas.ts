/**
 * MRR(별도) 제외: 월 Churn/ARPU/LTV — “숫자 논쟁” 방지용 공식
 */

/**
 * (해당 기간 canceled 수) / (기간 시작 시 active 수)
 */
export function calculateChurnRate(params: { canceledCount: number; startingActiveCount: number }): number {
    if (params.startingActiveCount <= 0) return 0;
    return params.canceledCount / params.startingActiveCount;
}

export function calculateARPU(params: { mrr: number; activeOrgs: number }): number {
    if (params.activeOrgs <= 0) return 0;
    return params.mrr / params.activeOrgs;
}

/** ARPU / Churn — churn 0이면 0(분모 불가) */
export function calculateLTV(arpu: number, churnRate: number): number {
    if (churnRate <= 0) return 0;
    return arpu / churnRate;
}
