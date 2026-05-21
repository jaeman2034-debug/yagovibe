/**
 * Puppeteer는 이 파일에서만 로드 — monthlyAccountingReport.impl 정적 의존성에서 제외 (CF cold start 완화)
 */
export async function renderMonthlyReportHtmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120_000);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 120_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18px", bottom: "18px", left: "18px", right: "18px" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
