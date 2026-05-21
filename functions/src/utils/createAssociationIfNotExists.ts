/**
 * 🔥 협회 문서가 없으면 생성 (유틸리티 함수)
 * 
 * 사용법:
 * await createAssociationIfNotExists("assoc-nowon-football");
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

export async function createAssociationIfNotExists(
  associationId: string
): Promise<void> {
  const associationRef = db.doc(`associations/${associationId}`);
  const associationSnap = await associationRef.get();

  if (!associationSnap.exists) {
    console.log(`[createAssociationIfNotExists] 협회 문서 생성: ${associationId}`);
    
    await associationRef.set({
      id: associationId,
      name: "노원구축구협회",
      description: "서울특별시 노원구 축구협회",
      region: "노원구",
      adminUids: [], // 실제 운영 시 관리자 UID 추가 필요
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
    
    console.log(`[createAssociationIfNotExists] ✅ 협회 문서 생성 완료: ${associationId}`);
  } else {
    console.log(`[createAssociationIfNotExists] 협회 문서 이미 존재: ${associationId}`);
  }
}
