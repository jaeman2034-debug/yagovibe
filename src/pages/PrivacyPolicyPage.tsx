/**
 * 🔒 개인정보 처리방침 페이지
 * 
 * v1 출시 필수: 개인정보 수집·이용 동의 근거
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>개인정보 처리방침</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            최종 수정일: {new Date().toLocaleDateString("ko-KR")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. 수집하는 개인정보 항목</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>참가 신청 시 수집 항목:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>팀명</li>
                <li>담당자 이름</li>
                <li>연락처 (전화번호)</li>
                <li>신청 팀 수</li>
                <li>선수 명단 (이름, 생년월일, 포지션, 연락처)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>대회 참가 신청 접수 및 관리</li>
                <li>참가팀 및 선수 정보 확인</li>
                <li>대회 운영 및 안내 사항 전달</li>
                <li>참가비 납부 안내</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. 개인정보의 보관 및 이용 기간</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                수집된 개인정보는 대회 종료 후 1년간 보관되며, 이후 지체 없이 파기됩니다.
                단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관됩니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. 개인정보의 제3자 제공</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                본 서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                다만, 대회 운영을 위해 협회 및 대회 주최 측에 필요한 정보가 제공될 수 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. 개인정보 처리의 위탁</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                개인정보 처리는 Firebase (Google Cloud Platform)를 통해 이루어지며,
                이는 개인정보 보호법에 따라 안전하게 관리됩니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. 이용자의 권리</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                이용자는 언제든지 개인정보 열람, 정정, 삭제를 요청할 수 있으며,
                요청 시 지체 없이 조치하겠습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. 개인정보 보호책임자</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                개인정보 처리에 관한 문의사항이 있으시면 아래로 연락 주시기 바랍니다.
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">관리자 연락처</p>
                <p className="text-sm mt-1">
                  이메일: admin@yagovibe.com
                  <br />
                  (각 협회별 연락처는 대회 상세 페이지에서 확인 가능)
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. 기타</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                본 개인정보 처리방침은 관련 법령 및 지침의 변경에 따라 수정될 수 있으며,
                변경 시 공지사항을 통해 안내드립니다.
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
