import React from 'react';
import { ShareData, ShareVisualAdapter } from '../types';
import { QRCodeSVG } from 'qrcode.react';

export const LayaliAdapter: ShareVisualAdapter = {
  renderOg: (data: ShareData) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: '#0a0a0a',
        color: '#d4af37',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        backgroundImage: 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #d4af37',
          borderRadius: '30px',
          width: '100%',
          height: '100%',
          padding: '40px',
        }}
      >
        <span style={{ fontSize: '32px', marginBottom: '20px', letterSpacing: '4px' }}>دعوة زفاف</span>
        <h1 style={{ fontSize: '72px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
          {data.groomName && data.brideName ? `${data.groomName} و ${data.brideName}` : data.title}
        </h1>
        {data.dateText && <span style={{ fontSize: '36px', marginBottom: '10px' }}>{data.dateText}</span>}
        {data.venueName && <span style={{ fontSize: '28px', opacity: 0.8 }}>{data.venueName}</span>}
      </div>
    </div>
  ),
  renderStory: (data: ShareData) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1080px',
        height: '1920px',
        backgroundColor: '#0a0a0a',
        color: '#d4af37',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '80px',
        position: 'relative',
        backgroundImage: 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #d4af37',
          borderRadius: '40px',
          width: '100%',
          flex: 1,
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '48px', marginBottom: '40px', letterSpacing: '4px' }}>دعوة زفاف</span>
          <h1 style={{ fontSize: '96px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center', lineHeight: 1.2 }}>
            {data.groomName && data.brideName ? `${data.groomName}\nو\n${data.brideName}` : data.title}
          </h1>
          {data.dateText && <span style={{ fontSize: '48px', marginBottom: '20px' }}>{data.dateText}</span>}
          {data.timeText && <span style={{ fontSize: '40px', marginBottom: '20px', opacity: 0.9 }}>{data.timeText}</span>}
          {data.venueName && <span style={{ fontSize: '40px', opacity: 0.8, marginTop: '20px', textAlign: 'center' }}>{data.venueName}</span>}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'flex' }}>
            <QRCodeSVG 
              value={data.publicUrl}
              size={300}
              level="H"
              includeMargin={false}
              fgColor="#0a0a0a"
              bgColor="#ffffff"
            />
          </div>
          <span style={{ fontSize: '32px', marginTop: '30px', opacity: 0.8 }}>امسح الرمز لفتح الدعوة</span>
        </div>
      </div>
    </div>
  )
};
