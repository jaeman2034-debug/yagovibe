/**
 * Backward-compatible re-export of Kakao AlimTalk Template Final Design.
 * SoT: `@/lib/notifications/kakao/templates`
 */

export {
  ALIMTALK_COMMON_VARIABLES,
  ALIMTALK_TEMPLATE_REGISTRY,
  listAlimTalkTemplates,
  listAllAlimTalkTemplatesIncludingLegacy,
  mapVenueKeyToAlimTalkId,
  renderAlimTalkPreview,
  resolveTemplateCodeFromEnv,
  type AlimTalkTemplateDef,
  type AlimTalkTemplateId,
  type AlimTalkVariable,
} from "@/lib/notifications/kakao/templates";

import type { AlimTalkTemplateDef } from "@/lib/notifications/kakao/templates";

/** Adapt new field names for older callers */
export function asLegacyTemplateView(t: AlimTalkTemplateDef): {
  id: string;
  templateName: string;
  description: string;
  templateCode: string;
  placeholders: string[];
  bodyPreview: string;
} {
  return {
    id: t.id,
    templateName: t.displayName,
    description: t.description,
    templateCode: t.templateCode,
    placeholders: t.variables,
    bodyPreview: t.body,
  };
}
