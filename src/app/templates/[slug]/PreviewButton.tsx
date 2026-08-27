'use client'

import { Button } from "@/components/ui/button"

export default function PreviewButton() {
  return (
    <Button 
      size="lg" 
      variant="outline" 
      className="w-full h-14 text-lg border-2" 
      onClick={() => alert("في النسخة القادمة، سيتم فتح محرر المعاينة التجريبي هنا.")}
    >
      جرّب القالب (معاينة مجانية)
    </Button>
  )
}
