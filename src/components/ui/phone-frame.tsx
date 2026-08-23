import React from 'react'

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[390px] h-[844px] bg-black rounded-[50px] shadow-2xl overflow-hidden border-[12px] border-black">
      {/* Dynamic Island / Notch */}
      <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
        <div className="w-40 h-7 bg-black rounded-b-3xl"></div>
      </div>
      
      {/* Screen */}
      <div className="w-full h-full bg-white overflow-y-auto no-scrollbar relative rounded-[38px] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
