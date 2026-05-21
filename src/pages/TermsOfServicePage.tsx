/**
 * 📋 이용약관 페이지
 * 
 * v1 출시 필수: 서비스 이용 약관
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>이용약관</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            최종 수정일: {new Date().toLocaleDateString("ko-KR")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">제1조 (목적)</h2>
            <div className="text-sm text-gray-700">
              <p>
                본 약관은 YAGO SPORTS(이하 "서비스")가 제공하는 대회 참가 신청 및 관리 서비스의 이용과 관련하여
                서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제2조 (용어의 정의)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>"서비스"</strong>: 대회 참가 신청, 승인, 선수 명단 관리 등의 기능을 제공하는 온라인 플랫폼</li>
                <li><strong>"이용자"</strong>: 본 서비스를 이용하는 모든 사용자</li>
                <li><strong>"팀장"</strong>: 참가 신청을 제출하고 선수 명단을 등록하는 책임자</li>
                <li><strong>"협회"</strong>: 대회를 주최하는 협회 또는 단체</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제3조 (서비스의 제공)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>서비스는 다음의 기능을 제공합니다:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>대회 참가 신청 접수</li>
                <li>참가 신청 승인/반려 관리</li>
                <li>선수 명단 등록 및 관리</li>
                <li>대회 관련 안내 및 알림</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제4조 (참가 신청)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                이용자는 본 서비스를 통해 대회 참가 신청을 제출할 수 있으며,
                신청 시 정확한 정보를 입력해야 합니다.
              </p>
              <p className="mt-2">
                참가 신청은 협회의 승인 절차를 거치며, 승인 여부는 협회의 판단에 따릅니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제5조 (승인 및 반려)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                참가 신청은 협회 관리자에 의해 승인되거나 반려될 수 있으며,
                반려된 신청은 복구할 수 없습니다.
              </p>
              <p className="mt-2">
                승인된 신청에 대해서는 팀장에게 선수 명단 등록 링크가 자동으로 발송됩니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제6조 (선수 명단 등록)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                승인된 참가 신청에 한해 팀장이 선수 명단을 등록할 수 있으며,
                명단 제출 후에는 수정이 제한될 수 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제7조 (참가비)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                참가비는 대회별 정책에 따라 산정되며, 신청 시 화면에 표시된 금액을 기준으로 합니다.
                참가비 납부는 별도 안내에 따라 진행됩니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제8조 (이용자의 의무)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>정확한 정보를 입력해야 합니다.</li>
                <li>타인의 정보를 무단으로 사용할 수 없습니다.</li>
                <li>서비스의 정상적인 운영을 방해하는 행위를 하지 않아야 합니다.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제9조 (면책사항)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한
                서비스 중단에 대해 책임을 지지 않습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제10조 (분쟁의 해결)</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                본 약관과 관련하여 분쟁이 발생할 경우, 관련 법령 및 관할 법원에 따릅니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">문의처</h2>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">서비스 운영 문의</p>
              <p className="text-sm mt-1">
                이메일: admin@yagovibe.com
                <br />
                (각 협회별 연락처는 대회 상세 페이지에서 확인 가능)
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
