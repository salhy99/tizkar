import React from 'react'
import { getTemplate } from './registry'
import { TemplateMode, InvitationData } from './types'

export type TemplateRendererResolverProps = {
  templateSlug: string
  data: InvitationData
  mode?: TemplateMode
  children?: React.ReactNode
}

export function TemplateRenderer({ templateSlug, data, mode = 'public', children }: TemplateRendererResolverProps) {
  // 1. Resolve template from registry
  const template = getTemplate(templateSlug)

  // 2. Handle unknown or missing template safely
  if (!template) {
    // Failsafe: Fallback to Layali for legacy records or missing fields, or show error UI if we shouldn't.
    // The prompt: "For existing legacy invitations with missing template identifiers: inspect current schema and determine backward-compatible fallback. If historical records implicitly mean Layali: document and centralize that fallback."
    const LegacyFallback = getTemplate('layali')?.renderer
    
    if (LegacyFallback) {
      return <LegacyFallback data={data} mode={mode}>{children}</LegacyFallback>
    }

    return (
      <div className="p-8 text-center text-red-500 font-bold bg-[#FAF8F3] min-h-screen flex items-center justify-center">
        تعذر تحميل تصميم الدعوة (القالب غير موجود)
      </div>
    )
  }

  // 3. Render the correct renderer
  const RendererComponent = template.renderer
  return <RendererComponent data={data} mode={mode}>{children}</RendererComponent>
}
