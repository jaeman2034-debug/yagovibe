import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { formatRecorderSeconds, useVocAudioRecorder } from "@/hooks/useVocAudioRecorder";
import { draftFieldsFromTranscript } from "@/lib/voc/classifyVocSignals";
import { saveVocFeedback } from "@/lib/voc/vocFeedbackService";
import {
  VOC_FEATURE_LABELS,
  VOC_PERSONA_LABELS,
  type VocCaptureMode,
  type VocFeatureScreen,
  type VocMemorableScreen,
  type VocPersona,
} from "@/lib/voc/vocFeedbackTypes";
import { transcribeVocAudio } from "@/lib/voc/vocSttClient";
import { buildVocTeamOptions, formatVocPermissionError } from "@/lib/voc/useVocTeamOptions";
import { cn } from "@/lib/utils";

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 w-9 rounded-lg border text-sm font-bold",
              value === n
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VocInterviewNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const recorder = useVocAudioRecorder();

  const [captureMode, setCaptureMode] = useState<VocCaptureMode>("voice");
  const [teamId, setTeamId] = useState("");
  const [persona, setPersona] = useState<VocPersona>("coach");
  const [orgLabel, setOrgLabel] = useState("");
  const [feature, setFeature] = useState<VocFeatureScreen>("growth_demo");
  const [interviewMethod, setInterviewMethod] = useState("대면");
  const [ratingUnderstanding, setRatingUnderstanding] = useState(4);
  const [ratingUsage, setRatingUsage] = useState(4);
  const [ratingRecommend, setRatingRecommend] = useState<number | undefined>(undefined);
  const [memorableScreen, setMemorableScreen] = useState<VocMemorableScreen | undefined>(undefined);
  const [transcript, setTranscript] = useState("");
  const [positiveText, setPositiveText] = useState("");
  const [painText, setPainText] = useState("");
  const [requestText, setRequestText] = useState("");
  const [sttBusy, setSttBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"meta" | "capture" | "review">("meta");
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const teamOptions = useMemo(() => buildVocTeamOptions(teamMembers), [teamMembers]);

  useEffect(() => {
    if (teamId || teamOptions.length === 0) return;
    setTeamId(teamOptions[0].id);
  }, [teamId, teamOptions]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  async function runStt() {
    console.info("[VOC-STT] convert clicked", {
      isRecording: recorder.isRecording,
      hasAudioBlob: recorder.hasAudioBlob,
      bytes: recorder.blob?.size ?? 0,
    });

    if (recorder.isRecording) {
      setError("녹음 중입니다. 「녹음 종료」를 누른 뒤 STT 변환을 눌러 주세요.");
      return;
    }
    if (!recorder.blob || recorder.blob.size < 64) {
      setError("녹음 파일이 없습니다. 다시 녹음해 주세요.");
      return;
    }

    setSttBusy(true);
    setError(null);
    try {
      const text = await transcribeVocAudio(recorder.blob);
      setTranscript(text);
      const draft = draftFieldsFromTranscript(text);
      setPositiveText((prev) => prev || draft.positiveText);
      setPainText((prev) => prev || draft.painText);
      setRequestText((prev) => prev || draft.requestText);
      setStep("review");
    } catch (e) {
      const message = e instanceof Error ? e.message : "STT 변환에 실패했습니다.";
      console.error("[VOC-STT] convert failed", e);
      setError(`${message} (1단계에서 「텍스트 입력」으로 전환 가능)`);
    } finally {
      setSttBusy(false);
    }
  }

  async function handleSave() {
    console.info("[VOC] handleSave start", { step, teamId, orgLabel: orgLabel.trim(), uid: user?.uid });

    if (!user?.uid) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (!teamId) {
      setError("저장할 팀이 없습니다. 팀에 가입·승인된 계정으로 로그인해 주세요.");
      setStep("meta");
      return;
    }
    if (!orgLabel.trim()) {
      setError("소속을 입력해 주세요. (1단계로 돌아가 입력)");
      setStep("meta");
      return;
    }

    setSaveBusy(true);
    setError(null);
    try {
      console.info("[VOC] saving to Firestore…", { teamId });
      const id = await saveVocFeedback({
        teamId,
        capturedByUid: user.uid,
        captureMode,
        persona,
        orgLabel,
        feature,
        interviewMethod,
        ratingUnderstanding,
        ratingUsage,
        ratingRecommend,
        memorableScreen,
        transcript: captureMode === "text" ? "" : transcript.trim(),
        positiveText,
        painText,
        requestText,
        stt:
          captureMode === "voice" && transcript.trim()
            ? { provider: "whisper", model: "whisper-1", language: "ko" }
            : undefined,
      });
      console.info("[VOC] save OK", { id });
      navigate("/hub/interviews", { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "저장 실패";
      console.error("[VOC] save failed", e);
      setError(formatVocPermissionError(message));
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-4 pb-36">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/hub/interviews" className="text-sm font-medium text-violet-800">
          ← 인터뷰 목록
        </Link>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
          I-2.1 MVP
        </span>
      </div>

      <h1 className="text-xl font-bold text-slate-900">+ 인터뷰 등록</h1>
      <p className="mt-1 text-xs text-slate-600">Interview Table v1 · Q1~Q5</p>

      {error ? (
        <p
          ref={errorRef}
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {step === "meta" ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">입력 방식</p>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={captureMode === "voice"}
                  onChange={() => setCaptureMode("voice")}
                />
                🎤 음성 인터뷰 (추천)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={captureMode === "text"}
                  onChange={() => setCaptureMode("text")}
                />
                텍스트 입력
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">대상</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(VOC_PERSONA_LABELS) as VocPersona[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersona(p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    persona === p
                      ? "border-violet-500 bg-violet-50 text-violet-900"
                      : "border-slate-200 bg-white"
                  )}
                >
                  {VOC_PERSONA_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">팀 (저장 위치)</span>
            {teamOptions.length === 0 && !teamsLoading ? (
              <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                속한 팀이 없습니다. 팀 가입·승인 후 다시 시도해 주세요.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={teamsLoading || teamOptions.length === 0}
              >
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">소속</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="베스트원 아카데미"
              value={orgLabel}
              onChange={(e) => setOrgLabel(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">확인 화면</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={feature}
              onChange={(e) => setFeature(e.target.value as VocFeatureScreen)}
            >
              {(Object.keys(VOC_FEATURE_LABELS) as VocFeatureScreen[]).map((f) => (
                <option key={f} value={f}>
                  {VOC_FEATURE_LABELS[f]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">인터뷰 방식</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={interviewMethod}
              onChange={(e) => setInterviewMethod(e.target.value)}
            >
              <option value="대면">대면</option>
              <option value="전화">전화</option>
              <option value="카카오톡">카카오톡</option>
              <option value="음성">음성</option>
            </select>
          </label>

          <Button type="button" className="w-full" onClick={() => setStep(captureMode === "voice" ? "capture" : "review")}>
            다음 →
          </Button>
        </div>
      ) : null}

      {step === "capture" ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-violet-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">🎤 음성 인터뷰</h2>
          <p className="text-xs text-slate-600">
            Q1~Q5 순서로 말씀해 주세요. 3분 이내 권장.
          </p>

          <div className="flex flex-col items-center rounded-xl border border-violet-200 bg-violet-50 py-8">
            <p className="text-3xl font-mono font-bold text-violet-900">
              {formatRecorderSeconds(recorder.seconds)}
            </p>
            {recorder.state === "recording" ? (
              <p className="mt-2 text-sm font-semibold text-red-600">● 녹음 중</p>
            ) : recorder.state === "stopped" ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">녹음 완료</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">대기</p>
            )}
          </div>

          {recorder.error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              <p className="font-semibold">{recorder.error}</p>
              <p className="mt-1 text-xs text-red-700">
                Windows: 설정 → 개인정보 및 보안 → 마이크 → 「마이크 액세스」「데스크톱 앱의 마이크 액세스」 ON
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {recorder.state !== "recording" ? (
              <Button type="button" onClick={() => void recorder.start()} className="gap-2">
                <Mic className="h-4 w-4" />
                녹음 시작
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  console.info("[VOC-STT] stop button clicked");
                  recorder.stop();
                }}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                녹음 종료
              </Button>
            )}
            {recorder.state === "stopped" ? (
              <Button type="button" variant="outline" onClick={recorder.reset}>
                다시 녹음
              </Button>
            ) : null}
          </div>

          {recorder.state === "recording" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              말씀을 마치면 <strong>녹음 종료</strong>를 누른 뒤 <strong>STT 변환</strong>을 눌러 주세요.
            </p>
          ) : recorder.state === "stopped" && recorder.blob ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              녹음 완료 ({Math.round(recorder.blob.size / 1024)}KB). STT 변환을 눌러 텍스트로 변환하세요.
            </p>
          ) : !recorder.isRecording && recorder.seconds > 0 && !recorder.hasAudioBlob ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              녹음 파일이 없습니다. 다시 녹음해 주세요.
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("meta")}>
              ← 이전
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={recorder.isRecording || sttBusy}
              onClick={() => void runStt()}
            >
              {sttBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Whisper STT…
                </>
              ) : recorder.isRecording ? (
                "녹음 종료 후 STT"
              ) : (
                "STT 변환 → 검토"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">검토 후 저장</h2>

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p>
              <strong>{VOC_PERSONA_LABELS[persona]}</strong> · {orgLabel || "(소속 미입력)"} ·{" "}
              {VOC_FEATURE_LABELS[feature]}
            </p>
          </div>

          {transcript ? (
            <label className="block text-sm">
              <span className="font-semibold text-slate-800">transcript (STT)</span>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </label>
          ) : null}

          <RatingRow label="Q1 이해도 (1~5)" value={ratingUnderstanding} onChange={setRatingUnderstanding} />
          <RatingRow label="Q2 사용의향 (1~5)" value={ratingUsage} onChange={setRatingUsage} />
          <RatingRow
            label="Q6 추천 의향 (선택)"
            value={ratingRecommend ?? 0}
            onChange={(n) => setRatingRecommend(n || undefined)}
          />

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Q3 좋았던 점</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={positiveText}
              onChange={(e) => setPositiveText(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Q4 불편한 점</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={painText}
              onChange={(e) => setPainText(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Q5 추가 요청</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Q7 기억 화면 (선택)</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={memorableScreen ?? ""}
              onChange={(e) =>
                setMemorableScreen((e.target.value as VocMemorableScreen) || undefined)
              }
            >
              <option value="">—</option>
              <option value="dashboard">Dashboard</option>
              <option value="fii">FII</option>
              <option value="training">훈련 추천</option>
              <option value="pdf">PDF</option>
              <option value="other">기타</option>
            </select>
          </label>

        </div>
      ) : null}

      {step === "review" ? (
        <div className="fixed bottom-16 left-0 right-0 z-[45] border-t border-emerald-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(captureMode === "voice" ? "capture" : "meta")}
            >
              ← 이전
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={saveBusy}
              onClick={() => {
                console.info("[VOC] Save clicked");
                void handleSave();
              }}
            >
              {saveBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중…
                </>
              ) : (
                "💾 저장"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
