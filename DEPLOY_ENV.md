Production environment checklist (copy values to your deployment platform, not to git)

Required Vite variables (public; restrict keys by domain in provider consoles):
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_VAPID_KEY
- VITE_ENABLE_FCM=false
- VITE_USE_EMULATOR=false
- VITE_DEBUG_MODE=false

Do NOT place these in Vite client env:
- OpenAI/LLM API keys
- Gmail user/pass
- Slack webhook (proxy via server if needed)

Post-deploy smoke tests:
- Chat send/unread/badge
- Market CTA state transitions
- Review create/avg update
- CaptainOnlyRoute gating/blocked UI
