/**
 * ✅ COMMIT 18-1: Datadog 공통 래퍼
 * Browser (RUM/Logs) / Server (stdout) 지원
 */

type DDTag = string | number | boolean | null | undefined;

const enabled =
  typeof window !== "undefined"
    ? Boolean((window as any).__DATADOG_ENABLED__)
    : Boolean(process.env.DATADOG_API_KEY);

export function ddLog(message: string, tags?: Record<string, DDTag>): void {
  if (!enabled) return;

  try {
    // Browser: RUM/Logs (window.DD_LOGS)
    if (typeof window !== "undefined" && (window as any).DD_LOGS) {
      (window as any).DD_LOGS.logger.info(message, tags);
    } else {
      // Server/Functions: stdout (Datadog agent 수집)
      console.log(JSON.stringify({ dd: true, message, ...tags }));
    }
  } catch {
    // 실패해도 본 흐름 영향 0
  }
}

export function ddMetric(
  name: string,
  value: number,
  tags?: Record<string, DDTag>
): void {
  if (!enabled) return;

  try {
    // Serverless에선 로그 기반 metric이 현실적
    console.log(
      JSON.stringify({
        dd_metric: name,
        value,
        tags,
      })
    );
  } catch {
    // 실패해도 본 흐름 영향 0
  }
}

export function ddTrace(
  span: string,
  durationMs: number,
  tags?: Record<string, DDTag>
): void {
  if (!enabled) return;

  try {
    console.log(
      JSON.stringify({
        dd_trace: span,
        durationMs,
        tags,
      })
    );
  } catch {
    // 실패해도 본 흐름 영향 0
  }
}

