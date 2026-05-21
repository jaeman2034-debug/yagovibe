/**
 * 🔥 실시간 스트리밍 STT - 최소 코드 예시
 * 
 * 핵심 개념:
 * 1. 2초마다 오디오 Chunk 녹음
 * 2. 각 Chunk를 즉시 STT 전송
 * 3. Partial Transcript 실시간 표시
 * 4. 명령 패턴 감지 시 즉시 실행
 */

import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import * as Audio from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// 🎯 명령 파싱 (기존과 동일)
function parseCommand(text: string) {
  const patterns = ['찾아줘', '가줘', '위치'];
  for (const p of patterns) {
    if (text.includes(p)) {
      return { type: 'MAP', query: text.replace(p, '').trim() };
    }
  }
  return { type: 'UNKNOWN' };
}

// 🗺 Google Maps 실행 (기존과 동일)
function openGoogleMaps(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  Linking.openURL(url);
}

// 📤 STT Chunk 전송
async function transcribeChunk(chunkUri: string): Promise<string> {
  // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
  const base64 = await FileSystem.readAsStringAsync(chunkUri, {
    encoding: 'base64' as any,
  });

  const res = await fetch(
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64 }),
    }
  );

  if (!res.ok) {
    throw new Error(`STT 오류: ${res.status}`);
  }

  const json = await res.json();
  return json.text;
}

export default function RealtimeSTTExample() {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [fullText, setFullText] = useState('');
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');

  // 🔄 실시간 스트리밍 루프
  const startRealtimeStreaming = async () => {
    setIsRecording(true);
    setPartialText('');
    setFullText('');
    accumulatedTextRef.current = '';

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert('마이크 권한 필요');
        setIsRecording(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 🔁 2초마다 Chunk 녹음 → STT 전송
      chunkIntervalRef.current = setInterval(async () => {
        try {
          // 1. 2초 Chunk 녹음
          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );

          // 2초 대기
          await new Promise(resolve => setTimeout(resolve, 2000));

          await recording.stopAndUnloadAsync();
          const chunkUri = recording.getURI();

          if (!chunkUri) return;

          // 2. STT 전송
          const text = await transcribeChunk(chunkUri);

          // 3. 누적 텍스트 업데이트
          accumulatedTextRef.current += ' ' + text;
          setFullText(accumulatedTextRef.current);
          setPartialText(text); // 최신 Chunk만 별도 표시

          // 4. 명령 감지 체크
          const cmd = parseCommand(accumulatedTextRef.current);
          if (cmd.type === 'MAP') {
            // 명령 감지 → 녹음 중지 + 실행
            stopRealtimeStreaming();
            openGoogleMaps(cmd.query!);
          }
        } catch (error) {
          console.error('Chunk 처리 오류:', error);
          // 에러가 나도 다음 Chunk 계속 진행
        }
      }, 2100); // 2초 + 0.1초 버퍼

    } catch (error) {
      console.error('스트리밍 시작 오류:', error);
      setIsRecording(false);
    }
  };

  const stopRealtimeStreaming = () => {
    setIsRecording(false);
    
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(console.error);
      recordingRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 정리
      stopRealtimeStreaming();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 실시간 STT</Text>

      {isRecording && (
        <View style={styles.textContainer}>
          <Text style={styles.label}>실시간 텍스트:</Text>
          <Text style={styles.partialText}>{partialText || '듣는 중...'}</Text>
          
          <Text style={styles.label}>누적 텍스트:</Text>
          <Text style={styles.fullText}>{fullText || '(아직 없음)'}</Text>
        </View>
      )}

      <Pressable
        style={[styles.button, isRecording && styles.stop]}
        onPress={isRecording ? stopRealtimeStreaming : startRealtimeStreaming}
      >
        <Text style={styles.buttonText}>
          {isRecording ? '🎙 녹음 중지' : '🎤 녹음 시작'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  textContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  partialText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2979FF',
    marginBottom: 15,
  },
  fullText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    minWidth: 150,
  },
  stop: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
