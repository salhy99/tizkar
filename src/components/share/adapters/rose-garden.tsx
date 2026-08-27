import React from 'react';
import { ShareData, ShareVisualAdapter } from '../types';
import { QRCodeSVG } from 'qrcode.react';

export const RoseGardenAdapter: ShareVisualAdapter = {
  renderOg: (data: ShareData) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: '#FDFBF7',
        color: '#2C1E16',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #C8938A',
          borderRadius: '40px',
          width: '100%',
          height: '100%',
          padding: '40px',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <span style={{ fontSize: '32px', color: '#8A9A86', marginBottom: '20px', letterSpacing: '4px' }}>دعوة زفاف</span>
        <h1 style={{ fontSize: '72px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', color: '#C8938A' }}>
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
        backgroundColor: '#FDFBF7',
        color: '#2C1E16',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #C8938A',
          borderRadius: '60px',
          width: '100%',
          flex: 1,
          padding: '60px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(200, 147, 138, 0.1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '48px', color: '#8A9A86', marginBottom: '40px', letterSpacing: '4px' }}>دعوة زفاف</span>
          <h1 style={{ fontSize: '96px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center', lineHeight: 1.2, color: '#C8938A' }}>
            {data.groomName && data.brideName ? `${data.groomName}\nو\n${data.brideName}` : data.title}
          </h1>
          {data.dateText && <span style={{ fontSize: '48px', marginBottom: '20px' }}>{data.dateText}</span>}
          {data.timeText && <span style={{ fontSize: '40px', marginBottom: '20px', opacity: 0.9 }}>{data.timeText}</span>}
          {data.venueName && <span style={{ fontSize: '40px', opacity: 0.8, marginTop: '20px', textAlign: 'center' }}>{data.venueName}</span>}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
          <div style={{ background: '#FDFBF7', padding: '20px', borderRadius: '16px', display: 'flex', border: '2px solid #EAE5D9' }}>
            <QRCodeSVG 
              value={data.publicUrl}
              size={300}
              level="H"
              includeMargin={false}
              fgColor="#2C1E16"
              bgColor="#FDFBF7"
            />
          </div>
          <span style={{ fontSize: '32px', marginTop: '30px', color: '#8A9A86' }}>امسح الرمز لفتح الدعوة</span>
        </div>
      </div>
    </div>
  )
};
