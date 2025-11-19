import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

export const marketProductChangeTrigger = onDocumentWritten("marketProducts/{productId}", async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();

  if (!after || JSON.stringify(after) === JSON.stringify(before)) return;

  logger.info("상품 데이터 변경됨:", event.params.productId);
});

