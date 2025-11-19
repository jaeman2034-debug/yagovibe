import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomeDashboard() {
  const [report, setReport] = useState<any>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "reports", "weekly"), (docSnap) => {
      setReport(docSnap.data());
    });
    return () => unsub();
  }, []);

  const handlePlayAudio = () => {
    if (!report?.audioURL) return;

    if (audio) {
      audio.pause();
      setAudio(null);
      setProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const newAudio = new Audio(report.audioURL);
    setAudio(newAudio);
    newAudio.play();

    // 진행바
    newAudio.ontimeupdate = () => {
      if (newAudio.duration) {
        setProgress((newAudio.currentTime / newAudio.duration) * 100);
      }
    };

    newAudio.onended = () => {
      setAudio(null);
      setProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    // 파형 시각화
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(newAudio);
    const analyser = audioCtx.createAnalyser();
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 150, 200)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        리포트를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Card className="shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            🧠 AI 주간 리포트
          </h2>

          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {report.summary || "요약 데이터가 없습니다."}
            </p>

            {/* 진행 바 */}
            {audio && (
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}

            {/* 파형 */}
            {audio && (
              <canvas
                ref={canvasRef}
                width={300}
                height={100}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700"
              />
            )}

            <div className="flex justify-end gap-3">
              {report.pdfURL && (
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => window.open(report.pdfURL, "_blank")}
                >
                  📄 PDF로 보기
                </Button>
              )}

              {report.audioURL && (
                <Button
                  variant="default"
                  className="text-sm"
                  onClick={handlePlayAudio}
                >
                  🔊 {audio ? "음성 중지" : "음성으로 듣기"}
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

