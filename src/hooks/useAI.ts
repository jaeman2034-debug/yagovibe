import { handleAICommand } from "@/services/VoiceAgentCore";

export function useAI(map: google.maps.Map | null, navigate?: (path: string) => void) {
    const processVoiceCommand = async (command: string) => {
        await handleAICommand(command, map, navigate);
    };
    return { processVoiceCommand };
}
