export const sendSlackMessage = async (text: string) => {
    try {
        const webhook = import.meta.env.VITE_SLACK_WEBHOOK_URL as string | undefined;
        if (!webhook) {
            console.warn("⚠️ Slack Webhook URL이 없습니다.");
            return;
        }
        await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        console.log("✅ Slack 전송 완료");
    } catch (err) {
        console.warn("⚠️ Slack 전송 실패:", err);
    }
};

export const sendTelegramMessage = async (text: string) => {
    try {
        const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
        const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;
        if (!token || !chatId) {
            console.warn("⚠️ Telegram 환경변수가 없습니다.");
            return;
        }
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        console.log("✅ Telegram 전송 완료");
    } catch (err) {
        console.warn("⚠️ Telegram 전송 실패:", err);
    }
};


