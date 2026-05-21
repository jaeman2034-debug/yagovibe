import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TeamCashExpenseCategory } from "@/types/teamAccounting";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function readFileAsBase64Parts(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error("영수증 이미지는 5MB 이하로 선택해 주세요."));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result;
            if (typeof r !== "string") {
                reject(new Error("파일을 읽지 못했습니다."));
                return;
            }
            const m = r.match(/^data:([^;]+);base64,(.+)$/);
            if (!m) {
                reject(new Error("이미지 형식을 인식하지 못했습니다."));
                return;
            }
            resolve({ mimeType: m[1], base64: m[2] });
        };
        reader.onerror = () => reject(new Error("파일 읽기에 실패했습니다."));
        reader.readAsDataURL(file);
    });
}

type OCRSuccess = {
    success: true;
    amount: number | null;
    date: string | null;
    category: TeamCashExpenseCategory | null;
    confidence: number;
    rawText: string;
};

type OCRFail = { success: false; error: string };

const EXPENSE_CATEGORIES = new Set<TeamCashExpenseCategory>([
    "association_fee",
    "event",
    "meal",
    "ceremony",
    "etc",
]);

export async function analyzeTeamExpenseReceipt(
    teamId: string,
    file: File
): Promise<OCRSuccess | OCRFail> {
    const { base64, mimeType } = await readFileAsBase64Parts(file);
    const fn = httpsCallable<
        { teamId: string; imageBase64: string; mimeType: string },
        Record<string, unknown>
    >(functions, "processReceipt");
    const res = await fn({ teamId, imageBase64: base64, mimeType });
    const d = res.data;
    if (d?.success !== true) {
        return { success: false, error: String(d?.error || "자동 인식 실패, 직접 입력해주세요") };
    }
    const categoryRaw = typeof d.category === "string" ? d.category : null;
    const category = categoryRaw && EXPENSE_CATEGORIES.has(categoryRaw as TeamCashExpenseCategory)
        ? (categoryRaw as TeamCashExpenseCategory)
        : null;
    return {
        success: true,
        amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? Math.floor(d.amount) : null,
        date: typeof d.date === "string" ? d.date : null,
        category,
        confidence:
            typeof d.confidence === "number" && Number.isFinite(d.confidence)
                ? Math.min(1, Math.max(0, d.confidence))
                : 0.5,
        rawText: typeof d.rawText === "string" ? d.rawText.slice(0, 1000) : "",
    };
}

