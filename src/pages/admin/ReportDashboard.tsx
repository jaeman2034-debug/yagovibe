import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Report {
  id: string;
  title: string;
  summary: string;
  pdfUrl?: string;
  ttsUrl?: string;
  createdAt?: any;
  read?: boolean;
}

export default function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((snap) => ({
        id: snap.id,
        ...snap.data(),
      })) as Report[];
      setReports(items);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "reports", id), { read: true });
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((r) => (
        <Card
          key={r.id}
          className={`transition-all border-2 ${r.read ? "border-gray-300" : "border-blue-500"}`}
        >
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-bold text-lg">{r.title || "AI 리포트"}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {r.createdAt?.toDate?.()?.toLocaleString("ko-KR") || "시간 없음"}
              </p>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {r.summary || "요약 정보 없음"}
            </p>

            <div className="flex flex-col space-y-2">
              {r.pdfUrl && (
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  📄 PDF 다운로드
                </a>
              )}

              {r.ttsUrl && (
                <audio controls src={r.ttsUrl} className="w-full" preload="none">
                  브라우저에서 오디오 재생을 지원하지 않습니다.
                </audio>
              )}
            </div>

            {!r.read && (
              <Button onClick={() => markAsRead(r.id)} className="w-full" variant="outline">
                확인 완료
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

