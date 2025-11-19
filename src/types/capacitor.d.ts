/**
 * Capacitor 모듈 타입 선언
 * 
 * 웹 빌드 시에는 @capacitor 패키지가 없을 수 있으므로,
 * 동적 import를 위한 타입 선언만 제공합니다.
 */

declare module '@capacitor/core' {
  export interface Capacitor {
    isNativePlatform(): boolean;
    getPlatform(): string;
  }
  export const Capacitor: Capacitor;
}

declare module '@capacitor/camera' {
  export interface CameraPhoto {
    base64String?: string;
    dataUrl?: string;
    format: string;
    webPath?: string;
    path?: string;
  }

  export interface CameraOptions {
    quality?: number;
    allowEditing?: boolean;
    resultType?: 'base64' | 'uri';
    width?: number;
    height?: number;
    correctOrientation?: boolean;
    source?: 'camera' | 'photos';
  }

  export enum CameraResultType {
    Base64 = 'base64',
    Uri = 'uri',
  }

  export interface Camera {
    getPhoto(options: CameraOptions): Promise<CameraPhoto>;
  }

  export const Camera: Camera;
  export const CameraResultType: typeof CameraResultType;
}

declare module '@capacitor/geolocation' {
  export interface Position {
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number | null;
      altitudeAccuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
    };
    timestamp: number;
  }

  export interface GeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }

  export interface PermissionStatus {
    location: 'granted' | 'denied' | 'prompt';
  }

  export interface Geolocation {
    getCurrentPosition(options?: GeolocationOptions): Promise<Position>;
    watchPosition(options: GeolocationOptions, callback: (position: Position) => void): Promise<string>;
    clearWatch(options: { id: string }): Promise<void>;
    checkPermissions(): Promise<PermissionStatus>;
    requestPermissions(): Promise<PermissionStatus>;
  }

  export const Geolocation: Geolocation;
}

declare module '@capacitor/device' {
  export interface DeviceInfo {
    platform: string;
    model: string;
    osVersion: string;
    appVersion?: string;
    appBuild?: string;
    manufacturer?: string;
  }

  export interface DeviceId {
    identifier: string;
  }

  export interface Device {
    getInfo(): Promise<DeviceInfo>;
    getId(): Promise<DeviceId>;
  }

  export const Device: Device;
}

declare module '@capacitor/app' {
  export interface App {
    exitApp(): Promise<void>;
  }

  export const App: App;
}

declare module '@capacitor/splash-screen' {
  export interface SplashScreen {
    hide(): Promise<void>;
    show(): Promise<void>;
  }

  export const SplashScreen: SplashScreen;
}

