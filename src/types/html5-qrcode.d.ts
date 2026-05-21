/**
 * html5-qrcode 타입 정의
 */

declare module "html5-qrcode" {
  export interface Html5QrcodeConfig {
    fps?: number;
    qrbox?: { width: number; height: number } | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number });
    aspectRatio?: number;
    disableFlip?: boolean;
    videoConstraints?: MediaTrackConstraints;
    rememberLastUsedCamera?: boolean;
    supportedScanTypes?: any[];
  }

  export interface CameraDevice {
    id: string;
    label: string;
  }

  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | { facingMode: "environment" | "user" },
      config: Html5QrcodeConfig,
      qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    getState(): any;
    clear(): Promise<void>;
    scanFile(imageFile: File, showImage?: boolean): Promise<string>;
    scanFileV2(imageFile: File): Promise<any>;
    static getCameras(): Promise<CameraDevice[]>;
  }
}


