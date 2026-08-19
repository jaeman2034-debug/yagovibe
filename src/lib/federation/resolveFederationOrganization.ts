import {
  buildNowonOrganizationCatalog,
  isNowonFederationSlug,
  NOWON_ORG_DEPARTMENT_ORDER,
} from "@/lib/federation/nowonOrganizationCatalog";
import { resolveExecutivePhotoSources } from "@/lib/federation/resolveExecutiveLocalPhoto";
import type {
  FederationOrganizationGroup,
  FederationOrganizationMember,
  LegacyFederationExecutive,
} from "@/types/federationOrganization";

function slugifyDept(raw: string): string {
  const t = raw.trim();
  if (!t) return "general";
  const known = NOWON_ORG_DEPARTMENT_ORDER.find(
    (d) => d.title === t || d.id === t || t.includes(d.title.replace("본부", ""))
  );
  if (known) return known.id;
  return (
    t
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w가-힣_-]/g, "")
      .slice(0, 48) || "general"
  );
}

function looksLikePlaceholder(executives: LegacyFederationExecutive[]): boolean {
  if (!executives.length) return true;
  if (executives.length <= 3) {
    const joined = executives.map((e) => `${e.name || ""}${e.role || ""}`).join(" ");
    if (/가칭|기획팀|운영이사/.test(joined)) return true;
    if (executives.length <= 3 && isSparseRoles(executives)) return true;
  }
  return false;
}

function isSparseRoles(executives: LegacyFederationExecutive[]): boolean {
  const roles = executives.map((e) => String(e.role || e.position || ""));
  const hasDept = executives.some((e) => e.department);
  if (hasDept) return false;
  return roles.every((r) => /회장|부회장|사무국장/.test(r));
}

function attachLocalPhotoSources(
  member: FederationOrganizationMember,
  firestorePhoto?: string | null
): FederationOrganizationMember {
  const sources = resolveExecutivePhotoSources({
    position: member.position,
    name: member.name,
    firestorePhoto: firestorePhoto ?? member.photo,
  });
  return {
    ...member,
    photoSources: sources,
    photo: sources[0] ?? null,
  };
}

export function normalizeExecutiveToMember(
  e: LegacyFederationExecutive,
  index: number
): FederationOrganizationMember {
  const name = String(e.name || "").trim() || "이름 미정";
  const position = String(e.position || e.role || "").trim() || "직책";
  const department = e.department
    ? slugifyDept(String(e.department))
    : inferDepartmentFromPosition(position);
  const photo = (e.photo || e.photoUrl || null) as string | null;
  const base: FederationOrganizationMember = {
    id: String(e.id || `exec-${index + 1}-${name}`),
    name,
    position,
    department,
    photo: photo && String(photo).trim() ? String(photo).trim() : null,
    description: e.description != null ? String(e.description) : null,
    duties: e.duties != null ? String(e.duties) : null,
    email: e.email != null ? String(e.email) : null,
    phone: e.phone != null ? String(e.phone) : null,
    career: e.career != null ? String(e.career) : null,
    order: typeof e.order === "number" ? e.order : index + 1,
  };
  return attachLocalPhotoSources(base, base.photo);
}

function inferDepartmentFromPosition(position: string): string {
  const p = position.replace(/\s+/g, "");
  if (/^회장$|구축구협회\s*회장|노원구축구협회\s*회장/.test(position) || p === "회장") {
    return "president";
  }
  if (/수석부회장/.test(p)) return "senior_vp";
  if (/사무국장|사무부장|사무국/.test(p)) return "secretariat";
  if (/경기/.test(p)) return "competition";
  if (/기획/.test(p)) return "planning";
  if (/운영/.test(p)) return "operations";
  if (/조직/.test(p)) return "organization";
  if (/홍보/.test(p)) return "pr";
  if (/의전/.test(p)) return "protocol";
  if (/유소년/.test(p)) return "youth";
  if (/심판/.test(p)) return "referees";
  if (/대외협력/.test(p)) return "external";
  if (/섭외/.test(p)) return "liaison";
  if (/총무/.test(p)) return "general_affairs";
  if (/상비군/.test(p)) return "standing_army";
  if (/^부회장$/.test(p)) return "senior_vp";
  return "general";
}

function mergeCmsFieldsByName(
  base: FederationOrganizationMember[],
  overlay: FederationOrganizationMember[],
  chairpersonPhotoUrl?: string | null
): FederationOrganizationMember[] {
  const byName = new Map(overlay.map((m) => [m.name, m]));
  return base.map((m) => {
    const hit = byName.get(m.name);
    let firestorePhoto = m.photo;
    if (hit?.photo) firestorePhoto = hit.photo;
    if (!firestorePhoto && m.department === "president" && chairpersonPhotoUrl) {
      firestorePhoto = chairpersonPhotoUrl;
    }
    if (!firestorePhoto && m.name === "박병구" && chairpersonPhotoUrl) {
      firestorePhoto = chairpersonPhotoUrl;
    }
    const merged: FederationOrganizationMember = {
      ...m,
      // CMS가 부서·순서·직책을 바꾸면 카드 그룹/정렬에 즉시 반영
      position: hit?.position?.trim() ? hit.position : m.position,
      department: hit?.department?.trim() ? hit.department : m.department,
      order: typeof hit?.order === "number" ? hit.order : m.order,
      description: hit?.description || m.description,
      duties: hit?.duties ?? m.duties,
      email: hit?.email ?? m.email,
      phone: hit?.phone ?? m.phone,
      career: hit?.career ?? m.career,
      photo: firestorePhoto || null,
    };
    return attachLocalPhotoSources(merged, firestorePhoto);
  });
}

export function resolveOrganizationMembers(input: {
  federationSlug?: string | null;
  executives?: LegacyFederationExecutive[] | null;
  chairpersonPhotoUrl?: string | null;
}): FederationOrganizationMember[] {
  const raw = Array.isArray(input.executives) ? input.executives : [];
  const normalized = raw
    .filter((e) => String(e?.name || "").trim() || String(e?.role || e?.position || "").trim())
    .map((e, i) => normalizeExecutiveToMember(e, i));

  const richCms =
    normalized.some((m) => m.department && m.department !== "general") &&
    normalized.length >= 8;

  if (isNowonFederationSlug(input.federationSlug) && (!richCms || looksLikePlaceholder(raw))) {
    return mergeCmsFieldsByName(
      buildNowonOrganizationCatalog(),
      normalized,
      input.chairpersonPhotoUrl
    );
  }

  if (normalized.length === 0 && isNowonFederationSlug(input.federationSlug)) {
    return mergeCmsFieldsByName(buildNowonOrganizationCatalog(), [], input.chairpersonPhotoUrl);
  }

  return mergeCmsFieldsByName(normalized, [], input.chairpersonPhotoUrl);
}

export function groupOrganizationMembers(
  members: FederationOrganizationMember[]
): FederationOrganizationGroup[] {
  const titleById = new Map(NOWON_ORG_DEPARTMENT_ORDER.map((d) => [d.id, d.title]));
  const orderById = new Map(NOWON_ORG_DEPARTMENT_ORDER.map((d, i) => [d.id, i]));

  const buckets = new Map<string, FederationOrganizationMember[]>();
  for (const m of members) {
    const key = m.department || "general";
    const list = buckets.get(key) || [];
    list.push(m);
    buckets.set(key, list);
  }

  const keys = Array.from(buckets.keys()).sort((a, b) => {
    const oa = orderById.has(a) ? (orderById.get(a) as number) : 1000;
    const ob = orderById.has(b) ? (orderById.get(b) as number) : 1000;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "ko");
  });

  return keys.map((key, idx) => {
    const membersInGroup = (buckets.get(key) || []).slice().sort((a, b) => a.order - b.order);
    return {
      id: key,
      title: titleById.get(key) || (key === "general" ? "조직" : key),
      order: orderById.has(key) ? (orderById.get(key) as number) : 1000 + idx,
      members: membersInGroup,
    };
  });
}
