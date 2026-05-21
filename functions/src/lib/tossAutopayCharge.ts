const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

export type TossBillingPayResponse = {
  paymentKey?: string;
  orderId?: string;
  status?: string;
  totalAmount?: number;
  code?: string;
  message?: string;
  method?: string;
  approvedAt?: string;
};

export function isPaidDone(data: TossBillingPayResponse): boolean {
  const st = String(data.status || "").toUpperCase();
  return st === "DONE" || st === "PAID";
}

export async function tossBillingExecute(
  billingKey: string,
  body: { customerKey: string; amount: number; orderId: string; orderName: string }
): Promise<{ httpOk: boolean; status: number; data: TossBillingPayResponse }> {
  if (!TOSS_SECRET_KEY) {
    throw new Error("TOSS_SECRET_KEY가 없습니다.");
  }
  const res = await fetch(`https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: TossBillingPayResponse = {};
  try {
    data = text ? (JSON.parse(text) as TossBillingPayResponse) : {};
  } catch {
    data = { message: text?.slice(0, 300) };
  }
  return { httpOk: res.ok, status: res.status, data };
}
