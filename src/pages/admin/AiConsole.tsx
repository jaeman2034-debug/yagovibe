import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LogEntry = {
  role: "user" | "assistant";
  text: string;
};

type SpeechRecognitionEventType = Event & {
  results: SpeechRecognitionResultList;
};

export default function AiConsole(): JSX.Element {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const sendCommand = async () => {
    const prompt = input.trim();
    if (!prompt || loading) {
      return;
    }

    setLogs((prev) => [...prev, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);

    const speak = (text: string) => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ko-KR";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    };

    try {
      const res = await fetch("/api/ai-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        const pieces = chunk.split("data:");
        for (const piece of pieces) {
          const text = piece.trim();
          if (!text) continue;
          if (text === "[DONE]") {
            speak(assistantResponse);
            setLoading(false);
            return;
          }

          assistantResponse += text;
          setLogs((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              last.text = assistantResponse;
            } else {
              next.push({ role: "assistant", text: assistantResponse });
            }
            return next;
          });
        }
      }

      speak(assistantResponse);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ Failed to process command: ${err?.message ?? err}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const NativeRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!NativeRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new NativeRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEventType) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="space-y-6 p-6">
      <motion.h1
        className="text-3xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🤖 AI Governance Chat Console
      </motion.h1>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[420px] flex-col space-y-3 overflow-y-auto rounded-md bg-muted p-3 text-sm">
          {logs.length === 0 && (
            <p className="text-muted-foreground">
              Ask anything about Sentry, GA4, Firebase, or deployment status. 예) “지난주 에러 요약해줘”
            </p>
          )}
          {logs.map((log, index) => (
            <motion.div
              key={`${log.role}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] rounded-md p-2 ${
                log.role === "user"
                  ? "ml-auto bg-indigo-100 text-indigo-900"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              <strong className="block text-xs uppercase tracking-wide">
                {log.role === "user" ? "You" : "AI"}
              </strong>
              <span className="whitespace-pre-wrap">{log.text}</span>
            </motion.div>
          ))}
          {loading && <p className="italic text-muted-foreground">Thinking...</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row">
        <Textarea
          placeholder="Ask me anything about your system..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
          rows={4}
        />
        <div className="flex flex-col gap-3 md:w-32">
          <Button onClick={sendCommand} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={listening ? stopListening : startListening}
            className="w-full"
          >
            {listening ? "🛑 Stop" : "🎤 Speak"}
          </Button>
        </div>
      </div>
    </div>
  );
}

