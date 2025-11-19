import { handleVoiceCommand } from "@/services/VoiceAgentCore";

export function useAI(map: google.maps.Map | null, navigate?: (path: string) => void) {
    const processVoiceCommand = async (command: string) => {
        if (navigate) {
            await handleVoiceCommand(navigate, command);
        } else {
            await handleVoiceCommand(() => {}, command);
        }
    };
    return { processVoiceCommand };
}
