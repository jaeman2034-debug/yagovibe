/**
 * Step 62: PII (Personally Identifiable Information) 마스킹 유틸
 * 개인정보 보호를 위한 데이터 마스킹
 */

/**
 * PII 마스킹 - 이메일, 전화번호 등 개인정보 제거
 */
export function redactPII(str: string): string {
    if (!str) return str;

    let redacted = str;

    // 이메일 주소 마스킹
    redacted = redacted.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email]");

    // 전화번호 마스킹 (한국 형식: 010-1234-5678, 01012345678 등)
    redacted = redacted.replace(/\b\d{2,3}-?\d{3,4}-?\d{4}\b/g, "[phone]");

    // 주민등록번호 마스킹 (13자리 숫자)
    redacted = redacted.replace(/\b\d{6}-\d{7}\b/g, "[ssn]");

    // 신용카드 번호 마스킹 (16자리 숫자)
    redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[card]");

    return redacted;
}

/**
 * PII 필드 감지 - 개인정보 필드가 포함되어 있는지 확인
 */
export function detectPIIFields(obj: any): string[] {
    const fields: string[] = [];

    if (!obj || typeof obj !== "object") {
        return fields;
    }

    const piiPatterns = [
        { pattern: /email/i, field: "email" },
        { pattern: /phone/i, field: "phone" },
        { pattern: /address/i, field: "address" },
        { pattern: /name/i, field: "name" },
        { pattern: /ssn|주민|resident/i, field: "ssn" },
        { pattern: /card|credit|카드/i, field: "card" },
    ];

    function traverse(o: any, path: string = "") {
        for (const key in o) {
            if (Object.prototype.hasOwnProperty.call(o, key)) {
                const currentPath = path ? `${path}.${key}` : key;
                const value = o[key];

                // PII 패턴 확인
                for (const { pattern, field } of piiPatterns) {
                    if (pattern.test(currentPath) && !fields.includes(field)) {
                        fields.push(field);
                    }
                }

                // 재귀 탐색
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    traverse(value, currentPath);
                }
            }
        }
    }

    traverse(obj);
    return fields;
}

/**
 * 동의 태깅 - 법적 근거 및 범위 명시
 */
export function attachConsent(
    meta: any,
    basis: "contract" | "consent" | "legitimate",
    scope: string[]
): any {
    return {
        ...meta,
        consent: {
            basis,
            scope,
            timestamp: new Date().toISOString(),
        },
    };
}

/**
 * PII 감지 및 자동 마스킹
 */
export function processPII(data: any): { redacted: boolean; fields: string[]; processed: any } {
    const fields = detectPIIFields(data);
    let processed = data;

    if (fields.length > 0) {
        // 문자열 데이터 마스킹
        if (typeof data === "string") {
            processed = redactPII(data);
        } else if (typeof data === "object") {
            // 객체 재귀 처리
            processed = JSON.parse(JSON.stringify(data));
            processed = redactObject(processed);
        }
    }

    return {
        redacted: fields.length > 0,
        fields,
        processed,
    };
}

/**
 * 객체 내부 문자열 재귀 마스킹
 */
function redactObject(obj: any): any {
    if (typeof obj === "string") {
        return redactPII(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => redactObject(item));
    }

    if (obj && typeof obj === "object") {
        const result: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = redactObject(obj[key]);
            }
        }
        return result;
    }

    return obj;
}

