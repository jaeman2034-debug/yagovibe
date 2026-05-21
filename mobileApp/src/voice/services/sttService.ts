/**
 * 🎙 STT Service
 * Speech-to-Text 서비스
 */

const STT_ENDPOINT =
  'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt';

/**
 * STT 호출 (오디오 base64 → 텍스트)
 */
export async function callSTT(audioBase64: string): Promise<string> {
  const resp = await fetch(STT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64 }),
  });

  if (!resp.ok) {
    throw new Error('STT API failed');
  }

  const json = await resp.json();
  return json.text || '';
}
