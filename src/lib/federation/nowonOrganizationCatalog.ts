/**
 * 노원구축구협회 공식 조직 구성 카탈로그 (Sprint 1 UI SoT fallback).
 * CMS/AI JSON이 풍부해지면 resolver가 CMS를 우선한다.
 */
import type { FederationOrganizationMember } from "@/types/federationOrganization";

export const NOWON_ORG_DEPARTMENT_ORDER: { id: string; title: string }[] = [
  { id: "president", title: "회장" },
  { id: "senior_vp", title: "수석부회장" },
  { id: "secretariat", title: "사무국" },
  { id: "competition", title: "경기본부" },
  { id: "planning", title: "기획본부" },
  { id: "operations", title: "운영본부" },
  { id: "organization", title: "조직본부" },
  { id: "pr", title: "홍보본부" },
  { id: "protocol", title: "의전본부" },
  { id: "youth", title: "유소년본부" },
  { id: "referees", title: "심판본부" },
  { id: "external", title: "대외협력본부" },
  { id: "liaison", title: "섭외본부" },
  { id: "general_affairs", title: "총무본부" },
  { id: "standing_army", title: "상비군본부" },
];

type CatalogRow = {
  name: string;
  position: string;
  department: string;
  description?: string;
};

const ROWS: CatalogRow[] = [
  { name: "박병구", position: "노원구축구협회 회장", department: "president", description: "노원구축구협회 회장" },
  { name: "고영호", position: "수석부회장", department: "senior_vp" },
  { name: "전순규", position: "사무국장", department: "secretariat" },
  { name: "문주연", position: "사무부장", department: "secretariat" },
  { name: "허재남", position: "경기부회장", department: "competition" },
  { name: "이현기", position: "경기위원장", department: "competition" },
  { name: "박종훈", position: "기획부회장", department: "planning" },
  { name: "황승환", position: "기획위원장", department: "planning" },
  { name: "이석범", position: "운영부회장", department: "operations" },
  { name: "강병훈", position: "운영위원장", department: "operations" },
  { name: "신양희", position: "조직부회장", department: "organization" },
  { name: "신수호", position: "조직위원장", department: "organization" },
  { name: "이효근", position: "홍보부회장", department: "pr" },
  { name: "윤성렬", position: "홍보위원장", department: "pr" },
  { name: "임성혁", position: "의전부회장", department: "protocol" },
  { name: "조민우", position: "의전위원장", department: "protocol" },
  { name: "문정배", position: "유소년부회장", department: "youth" },
  { name: "김영민", position: "유소년위원장", department: "youth" },
  { name: "박남백", position: "심판부회장", department: "referees" },
  { name: "김민주", position: "심판위원장", department: "referees" },
  { name: "김정기", position: "대외협력부회장", department: "external" },
  { name: "김영국", position: "섭외부회장", department: "liaison" },
  { name: "박종수", position: "총무부회장", department: "general_affairs" },
  { name: "이현상", position: "상비군부회장", department: "standing_army" },
];

export function buildNowonOrganizationCatalog(): FederationOrganizationMember[] {
  return ROWS.map((row, index) => ({
    id: `nowon-org-${row.department}-${index + 1}`,
    name: row.name,
    position: row.position,
    department: row.department,
    photo: null,
    description: row.description ?? null,
    order: index + 1,
  }));
}

export function isNowonFederationSlug(slug: string | null | undefined): boolean {
  const s = String(slug || "")
    .trim()
    .toLowerCase();
  return s === "nowon-football" || s === "nowon-gu-football";
}
