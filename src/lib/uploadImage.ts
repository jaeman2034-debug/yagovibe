import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

/**
 * 마켓 상품 이미지 업로드
 * @param file 업로드할 (압축된) 이미지 파일 또는 Blob
 * @param userId Firebase Auth 사용자 uid
 * @returns 다운로드 URL
 */
export async function uploadMarketImage(file: File | Blob, userId: string): Promise<string> {
  // 🔥 firebase.ts에서 이미 초기화된 storage 인스턴스 사용
  if (!storage) {
    console.error("❌ Firebase Storage가 초기화되지 않았습니다.");
    throw new Error("Firebase Storage is not initialized");
  }
  
  // 🔥 Storage 버킷 확인
  const storageBucket = storage.app.options.storageBucket;
  console.log("🔍 Storage 버킷 확인:", {
    bucket: storageBucket,
    appName: storage.app.name,
  });
  
  if (!storageBucket) {
    console.error("❌ Storage 버킷이 설정되지 않았습니다.");
    throw new Error("Storage bucket is not configured");
  }

  // 🔥 업로드 직전 인증 상태 확인 (Storage Rules 일치 보장)
  const currentAuthUid = auth.currentUser?.uid;
  
  // 🔥 auth.currentUser가 없으면 업로드 실패
  if (!auth.currentUser) {
    console.error("❌ 인증된 사용자가 없습니다. 업로드를 시작할 수 없습니다.");
    throw new Error("User not authenticated");
  }

  // 🔥 인증 토큰 확인 (Firebase Storage SDK가 자동으로 사용하지만, 명시적으로 확인)
  let authToken: string | null = null;
  try {
    authToken = await auth.currentUser.getIdToken(false);
  } catch (err) {
    console.warn("⚠️ 인증 토큰 가져오기 실패:", err);
  }
  
  console.log("🔐 업로드 직전 인증 확인:", {
    providedUserId: userId,
    currentAuthUid: currentAuthUid,
    match: currentAuthUid === userId,
    authExists: !!auth.currentUser,
    authTokenExists: !!authToken,
    authTokenLength: authToken?.length || 0,
    isAnonymous: auth.currentUser?.isAnonymous || false,
  });

  // 🔥 인증 토큰이 없으면 경고 (익명 사용자도 토큰은 있어야 함)
  if (!authToken) {
    console.warn("⚠️ 인증 토큰을 가져올 수 없습니다. 업로드가 실패할 수 있습니다.");
  }

  // 🔥 인증 불일치 시 경고 및 수정 (Storage Rules 일치 보장)
  if (currentAuthUid && currentAuthUid !== userId) {
    console.warn("⚠️ userId 불일치 감지:", {
      provided: userId,
      current: currentAuthUid
    });
    // 현재 로그인한 사용자의 uid로 강제 변경 (Storage Rules 일치)
    userId = currentAuthUid;
  }

  // 1) 파일 확장자 안전하게 추출
  const originalName =
    (file as File).name && typeof (file as File).name === "string"
      ? (file as File).name
      : "image.jpg";

  const ext = originalName.includes(".")
    ? originalName.split(".").pop() || "jpg"
    : "jpg";

  // 2) 안전한 파일 이름 생성 (타임스탬프 + uid)
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${userId}.${ext}`;

  // 3) Storage 경로 (규칙과 반드시 일치해야 함)
  const fullPath = `marketProducts/${userId}/${safeFileName}`;
  const storageRef = ref(storage, fullPath);

  console.log("📤 업로드 준비:", {
    userId,
    fullPath,
    fileSize: (file as File).size || undefined,
    bucket: storageRef.bucket,
    authUid: currentAuthUid,
  });

  // 4) Firebase 공식 패턴 그대로 사용 (타임아웃/재시도 커스텀 전혀 없음)
  return new Promise<string>((resolve, reject) => {
    console.log("🚀 uploadBytesResumable 호출 시작:", {
      fullPath,
      fileSize: (file as File).size,
      fileType: (file as File).type,
      authUid: currentAuthUid,
      storageBucket: storageBucket,
      storageRefBucket: storageRef.bucket,
      storageRefFullPath: storageRef.fullPath,
    });

    // 🔥 파일 객체 확인 (Blob vs File)
    console.log("📦 업로드할 파일 상세:", {
      isFile: file instanceof File,
      isBlob: file instanceof Blob,
      size: file.size,
      type: (file as File).type || (file as Blob).type,
      name: (file as File).name || "no-name",
    });

    const uploadTask = uploadBytesResumable(storageRef, file);

    console.log("✅ uploadTask 생성 완료:", {
      taskId: uploadTask.snapshot?.task?.state || "unknown",
      refPath: uploadTask.snapshot?.ref?.fullPath || "unknown",
      taskState: uploadTask.snapshot.state,
    });

    // 🔥 즉시 상태 확인 (디버깅용)
    console.log("📊 초기 업로드 상태:", {
      state: uploadTask.snapshot.state,
      bytesTransferred: uploadTask.snapshot.bytesTransferred,
      totalBytes: uploadTask.snapshot.totalBytes,
      metadata: uploadTask.snapshot.metadata,
    });

    // 🔥 타임아웃 설정 (3분)
    const uploadTimeout = setTimeout(() => {
      console.error("⏰ 업로드 타임아웃 (3분) - 취소 중...");
      uploadTask.cancel();
      reject(new Error("Upload timeout after 3 minutes"));
    }, 3 * 60 * 1000);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;

        console.log(
          `📤 진행률: ${progress.toFixed(1)}% (${snapshot.bytesTransferred} / ${snapshot.totalBytes})`,
          "state:",
          snapshot.state,
          "metadata:",
          snapshot.metadata
        );

        // 🔥 진행률이 0%에서 5초 이상 멈춰있으면 경고
        if (progress === 0 && snapshot.state === "running") {
          const warningTimeout = setTimeout(() => {
            if (snapshot.bytesTransferred === 0) {
              console.warn("⚠️ 업로드가 5초 이상 0%에서 멈춰있습니다. 네트워크 또는 권한 문제일 수 있습니다.");
              console.warn("⚠️ Network 탭에서 firebasestorage.googleapis.com 요청을 확인하세요.");
            }
          }, 5000);
          // cleanup은 추적 불가하므로 무시
        }

        // 🔥 진행이 시작되면 타임아웃 연장
        if (snapshot.bytesTransferred > 0) {
          clearTimeout(uploadTimeout);
        }
      },
      (error) => {
        clearTimeout(uploadTimeout);
        // 🔥 Firebase가 주는 원본 에러 그대로 로깅
        console.error("❌ 업로드 에러:", error);
        console.error("❌ 에러 상세:", {
          code: error.code,
          message: error.message,
          serverResponse: error.serverResponse,
          name: error.name,
          stack: error.stack,
        });
        
        // 🔥 CORS 관련 에러 체크
        if (error.code === "storage/canceled" || error.message?.includes("CORS") || error.message?.includes("preflight")) {
          console.error("🚨 CORS 또는 네트워크 문제 감지됨!");
          console.error("🚨 Firebase Console에서 Storage CORS 설정을 확인하세요.");
        }
        
        reject(error);
      },
      async () => {
        clearTimeout(uploadTimeout);
        try {
          console.log("✅ 업로드 완료 콜백 실행됨");
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("✅ 업로드 완료 URL:", downloadURL);
          resolve(downloadURL);
        } catch (err) {
          console.error("❌ 다운로드 URL 가져오기 실패:", err);
          reject(err);
        }
      }
    );
  });
}
