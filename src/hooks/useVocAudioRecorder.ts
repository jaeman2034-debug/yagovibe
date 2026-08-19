import { useCallback, useEffect, useRef, useState } from "react";

export type VocRecorderState = "idle" | "recording" | "stopped";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const MIN_BLOB_BYTES = 64;

function pickMediaRecorder(stream: MediaStream): { recorder: MediaRecorder; mimeType: string } {
  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { recorder: new MediaRecorder(stream, { mimeType }), mimeType };
    }
  }
  return { recorder: new MediaRecorder(stream), mimeType: "audio/webm" };
}

export function useVocAudioRecorder() {
  const [state, setState] = useState<VocRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const finalizedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finalizeRecording = useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    clearTimer();
    stopStream();

    const type = mimeTypeRef.current || chunksRef.current[0]?.type || "audio/webm";
    const next = new Blob(chunksRef.current, { type });
    console.info("[VOC-STT] recording stopped");
    console.info("[VOC-STT] audioBlob size:", next.size, { chunks: chunksRef.current.length, type });

    if (next.size < MIN_BLOB_BYTES) {
      setError(
        "녹음 데이터가 비어 있습니다. 주소창 🔒 → Microphone 허용 후 다시 녹음해 주세요."
      );
      setBlob(null);
      setState("idle");
      return;
    }

    setError(null);
    setBlob(next);
    setState("stopped");
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      stopStream();
    },
    []
  );

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    finalizedRef.current = false;
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const { recorder, mimeType } = pickMediaRecorder(stream);
      mimeTypeRef.current = mimeType;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        finalizeRecording();
      };

      recorder.onerror = (e) => {
        console.error("[VOC recorder] MediaRecorder error", e);
        setError("녹음 중 오류가 발생했습니다. 다시 녹음해 주세요.");
        setState("idle");
        clearTimer();
        stopStream();
      };

      // timeslice 없이 stop 시 단일 chunk — Windows/Chrome에서 더 안정적
      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      stopStream();
      setError(formatMicAccessError(e));
      setState("idle");
    }
  }, [finalizeRecording]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      console.warn("[VOC-STT] stop called but no MediaRecorder");
      return;
    }

    console.info("[VOC-STT] stop requested", { state: recorder.state });

    if (recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch {
        /* ignore */
      }
      recorder.stop();
    } else if (recorder.state === "inactive") {
      finalizeRecording();
      return;
    }

    // onstop 미발화 대비 (일부 브라우저)
    window.setTimeout(() => {
      if (!finalizedRef.current && chunksRef.current.length > 0) {
        console.info("[VOC-STT] finalize fallback (onstop delayed)");
        finalizeRecording();
      }
    }, 400);
  }, [finalizeRecording]);

  const reset = useCallback(() => {
    finalizedRef.current = false;
    clearTimer();
    stopStream();
    mediaRecorderRef.current = null;
    setBlob(null);
    chunksRef.current = [];
    setSeconds(0);
    setState("idle");
    setError(null);
  }, []);

  const isRecording = state === "recording";
  const hasAudioBlob = blob != null && blob.size >= MIN_BLOB_BYTES;

  return {
    state,
    seconds,
    error,
    blob,
    isRecording,
    hasAudioBlob,
    start,
    stop,
    reset,
  };
}

export function formatRecorderSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatMicAccessError(e: unknown): string {
  const name =
    e && typeof e === "object" && "name" in e ? String((e as { name?: unknown }).name ?? "") : "";
  const message = e instanceof Error ? e.message : "";

  if (name === "NotAllowedError" || /permission denied|not allowed/i.test(message)) {
    return "마이크 접근이 거부되었습니다. 주소창 왼쪽 🔒 → Microphone → 허용 후 F5 새로고침해 주세요.";
  }
  if (name === "NotFoundError" || /not found|no microphone/i.test(message)) {
    return "마이크 장치를 찾을 수 없습니다. Windows 설정 → 개인정보 → 마이크가 켜져 있는지 확인해 주세요.";
  }
  if (name === "NotReadableError") {
    return "마이크를 사용할 수 없습니다. 다른 앱(Zoom 등)에서 마이크를 점유 중인지 확인해 주세요.";
  }
  return message || "마이크 권한이 필요합니다.";
}
