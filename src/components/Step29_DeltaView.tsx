import React, { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { History, Eye, EyeOff, RotateCcw, Save } from "lucide-react";
import diff_match_patch from "diff-match-patch";
import { db } from "@/lib/firebase";

type DmpApi = {
    diff_main: (a: string, b: string) => [number, string][];
    diff_cleanupSemantic: (diffs: [number, string][]) => void;
};
const DiffMatchPatchCtor = diff_match_patch as unknown as new () => DmpApi;

interface Version {
    ts: number;
    content: string;
    keywords?: any[];
}

interface DeltaViewProps {
    reportId: string;
}

// diff-match-patch를 사용한 정확한 diff 계산
function computeDiff(base: string, compare: string): Array<[number, string]> {
    const dmp = new DiffMatchPatchCtor();
    const diffs = dmp.diff_main(base, compare);
    dmp.diff_cleanupSemantic(diffs); // 의미론적 정리

    const result: Array<[number, string]> = [];
    for (const [op, text] of diffs) {
        if (op === 0) {
            // 동일 (0)
            result.push([0, text]);
        } else if (op === -1) {
            // 삭제 (-1)
            result.push([-1, text]);
        } else if (op === 1) {
            // 추가 (1)
            result.push([1, text]);
        }
    }
    return result;
}

export default function DeltaView({ reportId }: DeltaViewProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [currentContent, setCurrentContent] = useState<string>("");
    const [baseIdx, setBaseIdx] = useState<number>(0);
    const [compareIdx, setCompareIdx] = useState<number>(0);
    const [hideEquals, setHideEquals] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", reportId), (snap) => {
            const data = snap.data();
            setCurrentContent(data?.content || data?.summary || "");

            // versions 객체를 배열로 변환
            const versionsObj = data?.versions || {};
            const versionsList: Version[] = Object.entries(versionsObj)
                .map(([ts, v]: [string, any]) => ({
                    ts: parseInt(ts),
                    content: v.content || "",
                    keywords: v.keywords || [],
                }))
                .sort((a, b) => a.ts - b.ts);

            setVersions(versionsList);
            if (versionsList.length > 0) {
                setBaseIdx(0);
                setCompareIdx(Math.max(0, versionsList.length - 1));
            }
            setLoading(false);
        });

        return () => unsub();
    }, [reportId]);

    const diffBlocks = useMemo(() => {
        if (versions.length === 0 || baseIdx === compareIdx) return [];
        const base = versions[baseIdx]?.content || "";
        const compare = versions[compareIdx]?.content || "";
        return computeDiff(base, compare);
    }, [versions, baseIdx, compareIdx]);

    const rollbackTo = async (idx: number) => {
        if (idx < 0 || idx >= versions.length) return;
        setSaving(true);
        try {
            const targetContent = versions[idx].content;
            const targetKeywords = versions[idx].keywords || [];
            const timestamp = Date.now();

            // 현재 버전을 스냅샷으로 저장
            const currentVersions = versions.reduce((acc, v) => {
                acc[v.ts.toString()] = { content: v.content, keywords: v.keywords || [] };
                return acc;
            }, {} as Record<string, any>);

            // 롤백할 버전도 스냅샷에 추가
            currentVersions[timestamp.toString()] = {
                content: targetContent,
                keywords: targetKeywords,
            };

            // content 업데이트 + versions 스냅샷 저장
            await updateDoc(doc(db, "reports", reportId), {
                content: targetContent,
                versions: currentVersions,
            });

            alert("✅ 롤백 완료 (버전 스냅샷 저장됨)");
        } catch (err) {
            console.error("롤백 실패:", err);
            alert("❌ 롤백 실패");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-4 text-center text-gray-500">
                로딩 중...
            </div>
        );
    }

    if (versions.length === 0) {
        return (
            <div className="max-w-5xl mx-auto p-4 text-center text-gray-500">
                저장된 버전이 없습니다. 먼저 버전을 저장해주세요.
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-4">
            <h2 className="text-2xl font-bold">📊 Delta View (버전 비교)</h2>

            {/* 컨트롤 바 */}
            <div className="rounded-xl border p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span className="text-sm font-medium">Base</span>
                        <select
                            className="ml-2 w-full md:w-auto border rounded-lg px-2 py-1 text-sm"
                            value={baseIdx}
                            onChange={(e) => setBaseIdx(Number(e.target.value))}
                        >
                            {versions.map((v, i) => (
                                <option key={v.ts} value={i}>
                                    {new Date(v.ts).toLocaleString()} (#{i})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span className="text-sm font-medium">Compare</span>
                        <select
                            className="ml-2 w-full md:w-auto border rounded-lg px-2 py-1 text-sm"
                            value={compareIdx}
                            onChange={(e) => setCompareIdx(Number(e.target.value))}
                        >
                            {versions.map((v, i) => (
                                <option key={v.ts} value={i}>
                                    {new Date(v.ts).toLocaleString()} (#{i})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        {hideEquals ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <label className="text-sm">
                            <input
                                type="checkbox"
                                className="mr-2 align-middle"
                                checked={hideEquals}
                                onChange={(e) => setHideEquals(e.target.checked)}
                            />
                            동일 텍스트 숨기기
                        </label>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                        <button
                            disabled={saving}
                            onClick={() => rollbackTo(baseIdx)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent disabled:opacity-50"
                            title="Base 버전으로 롤백"
                        >
                            <RotateCcw className="w-4 h-4" /> Base로 롤백
                        </button>
                        <button
                            disabled={saving}
                            onClick={() => rollbackTo(compareIdx)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent disabled:opacity-50"
                            title="Compare 버전으로 롤백"
                        >
                            <Save className="w-4 h-4" /> Compare 적용
                        </button>
                    </div>
                </div>
            </div>

            {/* Delta View */}
            <div className="rounded-xl border p-4 prose prose-zinc dark:prose-invert max-w-none">
                {diffBlocks.map(([op, text], idx) => {
                    if (op === 0 && hideEquals) return null; // equal 숨김

                    if (op === -1) {
                        return (
                            <mark
                                key={idx}
                                className="bg-red-200/70 dark:bg-red-400/30 line-through rounded-sm px-1 py-0.5"
                            >
                                {text}
                            </mark>
                        );
                    } else if (op === 1) {
                        return (
                            <mark
                                key={idx}
                                className="bg-green-200/70 dark:bg-green-400/30 rounded-sm px-1 py-0.5"
                            >
                                {text}
                            </mark>
                        );
                    }

                    // equal
                    return <span key={idx}>{text}</span>;
                })}
            </div>

            {/* 현재 본문 미리보기 (선택사항) */}
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">현재 content 미리보기</h3>
                <div className="rounded-xl border p-3 text-sm whitespace-pre-wrap bg-muted/30">
                    {currentContent.slice(0, 2000) || "(빈 문서)"}
                    {currentContent.length > 2000 && "..."}
                </div>
            </div>
        </div>
    );
}

