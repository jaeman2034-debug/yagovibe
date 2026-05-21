# 🔥 Phase 18: 모바일(Expo) 통합 전략

## 🎯 목표

**Web MapPageV3를 "다시 만들지 않고" 모바일로 가져간다**

- Web MapPageV3를 **기준 소스(Single Source of Truth)**로 유지
- 모바일에서는 **지도 SDK만 교체** (react-native-maps)
- UX/상태/로직은 **그대로 재사용**
- 공통 Controller + 분기 Renderer 구조

---

## 📐 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    MapController                          │
│  (공통 로직: 검색, 추천, 기억, 상태 관리)                  │
└──────────────────────┬────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌────────▼──────────┐
│  Web Renderer  │          │ Mobile Renderer    │
│  (MapPageV3)   │          │ (MapRendererMobile)│
│                │          │                    │
│ Google Maps    │          │ react-native-maps │
│ API            │          │ (MapView)         │
└────────────────┘          └───────────────────┘
```

---

## 🧩 구조 설계

### 1️⃣ 공통 타입 (`src/types/map.ts`)

```typescript
export type MapCenter = { lat: number; lng: number; source?: ... };
export type MapPlace = { id: string; lat: number; lng: number; name?: string };
export type MapPageV3Props = { ... };
```

**✅ Web과 Mobile에서 동일한 타입 사용**

---

### 2️⃣ 플랫폼 감지 (`src/utils/platform.ts`)

```typescript
export function detectPlatform(): 'web' | 'ios' | 'android';
export function isWeb(): boolean;
export function isMobile(): boolean;
```

**✅ 런타임에 플랫폼 감지하여 적절한 Renderer 선택**

---

### 3️⃣ Renderer 분기

#### Web Renderer (기존)
- **파일**: `src/pages/MapPageV3.tsx`
- **SDK**: Google Maps JavaScript API
- **상태**: ✅ 완성

#### Mobile Renderer (신규)
- **파일**: `src/components/map/MapRendererMobile.tsx`
- **SDK**: `react-native-maps` (MapView)
- **상태**: 🔄 구현 필요

---

### 4️⃣ MapController 통합

```typescript
// MapController.tsx
import { detectPlatform } from '@/utils/platform';
import MapPageV3 from '@/pages/MapPageV3'; // Web
import MapRendererMobile from '@/components/map/MapRendererMobile'; // Mobile

export default function MapController(props) {
  const platform = detectPlatform();
  
  const MapRenderer = platform === 'web' 
    ? MapPageV3 
    : MapRendererMobile;
  
  return <MapRenderer {...props} />;
}
```

**✅ Controller는 플랫폼을 신경 쓰지 않음**

---

## 📦 모바일 Renderer 구현 가이드

### Step 1: react-native-maps 설치

```bash
cd mobileApp
npx expo install react-native-maps
```

### Step 2: MapRendererMobile.tsx 생성

```typescript
// src/components/map/MapRendererMobile.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { MapPageV3Props } from '@/types/map';

export default function MapRendererMobile({
  center,
  places,
  recommendedPlaceId,
  routePath = [],
  navigationStarted = false,
  onMapReady,
}: MapPageV3Props) {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 지도 준비 완료
  useEffect(() => {
    if (mapRef.current && !isMapReady) {
      setIsMapReady(true);
      onMapReady?.();
    }
  }, [mapRef.current]);

  // 중심점 변경
  useEffect(() => {
    if (isMapReady && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [isMapReady, center]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => {
          setIsMapReady(true);
          onMapReady?.();
        }}
      >
        {/* 마커 렌더링 */}
        {places.map((place) => {
          const isRecommended = recommendedPlaceId === place.id;
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              title={place.name}
              pinColor={isRecommended ? '#EF4444' : undefined}
            />
          );
        })}

        {/* 경로 렌더링 */}
        {navigationStarted && routePath.length > 0 && (
          <Polyline
            coordinates={routePath.map(p => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor="#000000"
            strokeWidth={5}
          />
        )}
      </MapView>
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
});
```

---

## 🔄 마이그레이션 전략

### Phase 1: 구조 준비 (현재)
- ✅ 공통 타입 정의
- ✅ 플랫폼 감지 유틸리티
- ✅ 문서화

### Phase 2: Mobile Renderer 구현
- ⏳ react-native-maps 설치
- ⏳ MapRendererMobile.tsx 생성
- ⏳ MapController 통합

### Phase 3: 테스트 및 검증
- ⏳ Web 동작 확인
- ⏳ Mobile 동작 확인
- ⏳ 공통 로직 검증

---

## ✅ 성공 기준

- [ ] Web MapPageV3 정상 동작 (기존 유지)
- [ ] Mobile에서 동일한 UX 제공
- [ ] MapController 로직 공통 사용
- [ ] 플랫폼별 SDK만 교체
- [ ] 타입 안정성 유지

---

## 🧠 핵심 원칙

> **"지도는 그리기만 한다"** 원칙은 Web과 Mobile 모두 동일하게 적용됩니다.

- ✅ 지도 렌더링만 담당
- ✅ 검색/추천/기억 로직은 Controller에서 처리
- ✅ 플랫폼별 차이는 Renderer 레벨에서만

---

## 📌 다음 단계

1. **react-native-maps 설치**: `cd mobileApp && npx expo install react-native-maps`
2. **MapRendererMobile.tsx 구현**: 위 가이드 참고
3. **MapController 통합**: 플랫폼 분기 로직 추가
4. **테스트**: Web/Mobile 동시 검증

---

## 🔗 참고

- [react-native-maps 문서](https://github.com/react-native-maps/react-native-maps)
- [Expo Maps 가이드](https://docs.expo.dev/versions/latest/sdk/map-view/)
