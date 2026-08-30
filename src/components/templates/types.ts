import React from 'react'

export type InvitationData = {
  groomName?: string;
  brideName?: string;
  quote?: string;
  date?: string;
  time?: string;
  dateText?: string;
  timeText?: string;
  invitationText?: string;
  parents?: {
    groomFatherEnabled?: boolean;
    groomFather?: string;
    groomMotherEnabled?: boolean;
    groomMother?: string;
    brideFatherEnabled?: boolean;
    brideFather?: string;
    brideMotherEnabled?: boolean;
    brideMother?: string;
  };
  venue?: {
    name?: string;
    address?: string;
    url?: string;
  };
  program?: { id: string; time: string; title: string }[];
  notes?: { id: string; text: string }[];
  closing?: { text?: string; hashtag?: string };
  contact?: { name?: string; whatsapp?: string };
  gallery?: string[];
  coverImage?: string;
  music?: { url?: string; type?: 'YOUTUBE' | 'MP3' };
  presentation?: {
    showTizkarAttribution?: boolean;
  };
}

export type TemplateMode = 'public' | 'editor-preview'

export type TemplateRendererProps = {
  data: InvitationData
  mode?: TemplateMode
  children?: React.ReactNode
}

export type TemplateFeatures = {
  gallery: boolean
  map: boolean
  program: boolean
  parents: boolean
  music: boolean
  rsvp: boolean
}

export type TemplateSlug = 'layali' | 'modern-glass' | 'rose-garden' | 'noor' | 'atheer' | string;

export type PackageEntitlementKey = 'premiumTemplates'; // Extensible for future entitlements

export type TemplateDefinition = {
  id: string
  name: string
  description: string
  thumbnail: string
  status: 'ACTIVE' | 'COMING_SOON' | 'HIDDEN'
  features: TemplateFeatures
  renderer: React.ComponentType<TemplateRendererProps>
  /** Null = standard (no entitlement required). Non-null = premium feature key required. */
  requiredEntitlement: PackageEntitlementKey | null
}
