/**
 * 📱 간단한 Slack 메시지 전송 함수
 */
export async function sendSlackReport(message: string) {
    const webhook = import.meta.env.VITE_SLACK_WEBHOOK_URL;
    if (!webhook) {
        console.warn("Slack Webhook 미설정");
        return;
    }

    try {
        await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `📢 YAGO VIBE AI 리포트\n\n${message}`
            }),
        });
        console.log("✅ Slack 전송 완료");
    } catch (error) {
        console.error("❌ Slack 전송 오류:", error);
    }
}

export const POST = async (request: Request) => {
    try {
        console.log("📱 Slack 공유 시작...");

        const insight = await request.json();
        console.log("📊 공유할 인사이트:", insight.title);

        const webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL;

        if (!webhookUrl) {
            console.warn("⚠️ Slack Webhook URL이 설정되지 않음");
            return new Response(JSON.stringify({
                success: false,
                message: "Slack Webhook URL이 설정되지 않았습니다"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const slackMessage = {
            text: `🧠 *YAGO VIBE AI 인사이트 리포트*`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🧠 YAGO VIBE AI 인사이트 리포트"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${insight.title}*`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*📊 주요 발견사항:*\n" + insight.bullets.map((b: string) => `• ${b}`).join('\n')
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*🎯 추천 액션:*\n" + insight.actions.map((a: string) => `→ ${a}`).join('\n')
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `📅 ${new Date().toLocaleString('ko-KR')} | 🤖 YAGO VIBE AI System`
                        }
                    ]
                }
            ]
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slackMessage)
        });

        if (response.ok) {
            console.log("✅ Slack 공유 완료");
            return new Response(JSON.stringify({
                success: true,
                message: "Slack으로 성공적으로 전송되었습니다!"
            }), {
                headers: { "Content-Type": "application/json" }
            });
        } else {
            console.error("❌ Slack 전송 실패:", response.status);
            return new Response(JSON.stringify({
                success: false,
                message: `Slack 전송 실패: ${response.status}`
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

    } catch (error) {
        console.error("❌ Slack 공유 오류:", error);

        return new Response(JSON.stringify({
            success: false,
            message: "Slack 공유 중 오류가 발생했습니다"
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

// CORS preflight 요청 처리
export const OPTIONS = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
};
