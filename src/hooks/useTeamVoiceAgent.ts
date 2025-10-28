import { getFunctions, httpsCallable } from "firebase/functions";

export function useTeamVoiceAgent() {
    const executeTeamCommand = async (text: string) => {
        const fn = getFunctions();
        const callFn = httpsCallable(fn, "teamVoiceAgent");
        const res: any = await callFn({ text, user: "admin" });
        return res.data.message;
    };
    return { executeTeamCommand };
}

