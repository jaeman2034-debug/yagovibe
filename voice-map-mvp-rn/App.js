import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import axios from "axios";

const API_BASE_URL = "http://localhost:4000"; // 백엔드 주소

// 📊 Analytics 로깅
const logEvent = async (event, data = {}) => {
  try {
    await fetch(`${API_BASE_URL}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data, timestamp: Date.now() }),
    });
  } catch (error) {
    // Analytics 실패해도 앱은 정상 작동
    console.error("Analytics 로그 실패:", error);
  }
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [listening, setListening] = useState(false);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(false);

  const recordingRef = useRef(null);

  // 📍 위치 가져오기
  useEffect(() => {
    (async () => {
      try {
        // 📊 앱 실행 로깅
        await logEvent("app_open");

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("위치 권한 필요", "위치 권한이 필요합니다.");
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.error("위치 획득 실패:", error);
      }
    })();
  }, []);

  // 💸 비용 최소화: 최대 녹음 시간 (5초)
  const MAX_RECORDING_DURATION = 5000; // 5초
  const recordingTimeoutRef = useRef(null);

  // 🎙️ 음성 녹음 시작
  const startRecording = async () => {
    try {
      setListening(true);
      setPlace(null);

      // 📊 음성 버튼 클릭 로깅
      await logEvent("voice_button_click");

      // 권한 요청 (앱 실행 시 1번만, 여기서는 안전장치)
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("마이크 권한 필요", "음성 검색을 위해 마이크 권한이 필요합니다.");
        setListening(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      // 💸 비용 최소화: 5초 후 자동 종료
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_DURATION);
    } catch (error) {
      console.error("녹음 시작 실패:", error);
      setListening(false);
    }
  };

  // 🎙️ 음성 녹음 종료
  const stopRecording = async () => {
    try {
      setListening(false);
      
      // 💸 비용 최소화: 자동 종료 타이머 취소
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      const recording = recordingRef.current;
      
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setLoading(true);

      // 🎙️ Whisper STT 호출
      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "voice.m4a",
        type: "audio/m4a",
      } as any);

      const sttRes = await fetch(`${API_BASE_URL}/stt`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!sttRes.ok) {
        throw new Error("STT 처리 실패");
      }

      const { text } = await sttRes.json();
      console.log("🎤 Whisper 인식:", text);

      if (!text || text.trim().length === 0) {
        Alert.alert("음성 인식 실패", "말씀을 인식하지 못했어요. 다시 시도해주세요.");
        setLoading(false);
        return;
      }

      // 🔍 기존 검색 로직 재사용
      await searchPlace(text);
      
      await recording.unloadAsync();
      recordingRef.current = null;
    } catch (error) {
      console.error("녹음/STT 처리 실패:", error);
      Alert.alert("오류", "음성 인식 중 오류가 발생했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  // 🔍 장소 검색
  const searchPlace = async (text) => {
    if (!location) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/search/voice`, {
        query: text,
        lat: location.latitude,
        lng: location.longitude,
      });

      if (res.data.primary) {
        setPlace(res.data.primary);
        
        // 📊 검색 성공 로깅
        await logEvent("search_success", { query: text });
        
        // 지도 중심 이동
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: res.data.primary.lat,
            longitude: res.data.primary.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } else {
        // 📊 검색 실패 로깅
        await logEvent("search_failure", { query: text });
        Alert.alert("결과 없음", "해당 장소를 찾지 못했어요");
      }
    } catch (error) {
      console.error("검색 실패:", error);
      Alert.alert("오류", "검색 중 오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  };

  const mapRef = useRef(null);

  if (!location) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>위치 불러오는 중…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* 내 위치 마커는 showsUserLocation으로 자동 표시 */}
        
        {/* 검색 결과 마커 */}
        {place && (
          <Marker
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            pinColor="#ef4444" // 빨간색으로 강조
          />
        )}
      </MapView>

      {/* 하단 음성 버튼 */}
      <TouchableOpacity
        style={[styles.voiceBtn, listening && styles.voiceBtnListening]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={loading}
      >
        <Text style={styles.voiceText}>
          {listening 
            ? "듣고 있어요…" 
            : loading 
            ? "찾는 중…" 
            : "🎙️ 말로 장소 찾기"}
        </Text>
      </TouchableOpacity>

      {/* 결과 카드 (있으면) */}
      {place && (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={async () => {
            // 📊 길찾기 클릭 로깅
            await logEvent("navigation_click", { placeId: place.id });
            // 길찾기 (외부 지도 앱)
            const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
            Linking.openURL(url).catch((err) => {
              console.error("지도 앱 열기 실패:", err);
            });
          }}
        >
          <Text style={styles.resultTitle}>{place.name}</Text>
          <Text style={styles.resultDistance}>
            {place.distance ? `${Math.round(place.distance)}m` : ""}
          </Text>
          <Text style={styles.resultAction}>여기로 가기 →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  voiceBtn: {
    height: 80,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBtnListening: {
    backgroundColor: "#2563eb",
  },
  voiceText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  resultCard: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111",
  },
  resultDistance: {
    fontSize: 14,
    color: "#666",
  },
  resultAction: {
    fontSize: 12,
    color: "#2563eb",
    marginTop: 8,
    fontWeight: "500",
  },
});
