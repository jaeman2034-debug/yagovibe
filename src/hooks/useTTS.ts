import { useCallback, useRef, useState } from "react";

type TtsOptions = {
  voice?: string;
  filePrefix?: string;
};

type TtsResult = {
  url: string;
};

export function useTTS(ttsEndpoint = "/api/tts") {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const speak = useCallback(
    async (text: string, options?: TtsOptions): Promise<TtsResult> => {
      if (!text) {
        throw new Error("text is required");
      }

      setLoading(true);
      try {
        const res = await fetch(ttsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: options?.voice ?? "alloy",
            filePrefix: options?.filePrefix ?? "ai-report",
          }),
        });
        const json = await res.json();
        if (!json.ok || !json.url) {
          throw new Error(json.error || "TTS failed");
        }

        setLastUrl(json.url as string);

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = json.url as string;
        await audioRef.current.play().catch(() => {
          // 자동 재생이 브라우저 정책에 의해 막힐 수 있으므로 무시
        });

        return { url: json.url as string };
      } finally {
        setLoading(false);
      }
    },
    [ttsEndpoint],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { speak, stop, loading, lastUrl };
}
