import { useState } from "react";
import { useEffect } from "react";

export const useSpeechAI = () => {
    const [transcript, setTranscript] = useState("");
    const [intent, setIntent] = useState<null | string>(null);
    const [entities, setEntities] = useState<{ place?: string }>({});

    const startListening = () => {
        const recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
        recognition.lang = "ko-KR";
        recognition.start();

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript.trim();
            setTranscript(text);
            analyzeText(text);
        };
    };

    const analyzeText = (text: string) => {
        if (text.includes("찾아줘") || text.includes("보여줘")) {
            setIntent("find_location");
            setEntities({ place: text.replace(/(근처|보여줘|찾아줘)/g, "").trim() });
        } else if (text.includes("어디야") || text.includes("위치")) {
            setIntent("query_place");
            setEntities({ place: text.replace(/(어디야|위치|야고야|은|이)/g, "").trim() });
        } else {
            setIntent(null);
        }
    };

    return { transcript, intent, entities, startListening };
};
