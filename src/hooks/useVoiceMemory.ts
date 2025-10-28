import { getFunctions, httpsCallable } from "firebase/functions";

export function useVoiceMemory() {
    const runMemoryCommand = async (text: string) => {
        const fn = getFunctions();
        const memoryFn = httpsCallable(fn, "voiceMemoryAssistant");
        const res: any = await memoryFn({ text, user: "admin" });
        return res.data.message;
    };
    return { runMemoryCommand };
}

