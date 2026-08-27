export function buildPublicInvitationUrl(baseUrl: string, slug: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanSlug = slug.replace(/^\/+/, '');
  return `${cleanBase}/${cleanSlug}`;
}

export function generateShareText(title: string, groomName?: string, brideName?: string): string {
  const names = groomName && brideName ? `${groomName} و ${brideName}` : title;
  return `يسعدنا أن نشارككم دعوتنا (${names}) 🤍\nنتشرف بحضوركم ومشاركتنا هذه المناسبة.`;
}

export function buildWhatsAppShareUrl(text: string, url: string): string {
  const encodedText = encodeURIComponent(`${text}\n\n${url}`);
  return `https://wa.me/?text=${encodedText}`;
}

export function buildTelegramShareUrl(text: string, url: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
}

export function sanitizeFilenameSlug(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 30);
}
