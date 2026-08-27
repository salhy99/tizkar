import React from 'react';
import { ShareData, ShareVisualAdapter } from '../types';
import { QRCodeSVG } from 'qrcode.react';

export const ModernGlassAdapter: ShareVisualAdapter = {
  renderOg: (data: ShareData) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '1200px',
        height: '630px',
        backgroundColor: '#F5F3EF',
        color: '#1A1A1A',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', flex: 1, height: '100%', flexDirection: 'column', padding: '80px', justifyContent: 'center' }}>
        <span style={{ fontSize: '32px', color: '#B8965A', marginBottom: '20px', letterSpacing: '4px' }}>دعوة زفاف</span>
        <h1 style={{ fontSize: '72px', fontWeight: 'bold', marginBottom: '20px', lineHeight: 1.2 }}>
          {data.groomName && data.brideName ? `${data.groomName}\nو\n${data.brideName}` : data.title}
        </h1>
        {data.dateText && <span style={{ fontSize: '32px', marginTop: '20px' }}>{data.dateText}</span>}
        {data.venueName && <span style={{ fontSize: '28px', opacity: 0.7, marginTop: '10px' }}>{data.venueName}</span>}
      </div>
      <div style={{ width: '400px', height: '100%', backgroundColor: '#E8E5DF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '2px', height: '80%', backgroundColor: '#B8965A', opacity: 0.3 }}></div>
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
        backgroundColor: '#F5F3EF',
        color: '#1A1A1A',
        fontFamily: '"Cairo"',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', width: '90%', height: '95%', backgroundColor: 'white', borderRadius: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', flexDirection: 'column', padding: '80px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
          <span style={{ fontSize: '40px', color: '#B8965A', marginBottom: '40px', letterSpacing: '8px' }}>دعوة زفاف</span>
          <h1 style={{ fontSize: '96px', fontWeight: 'bold', marginBottom: '60px', textAlign: 'center', lineHeight: 1.2 }}>
            {data.groomName && data.brideName ? `${data.groomName}\nو\n${data.brideName}` : data.title}
          </h1>
          <div style={{ width: '80px', height: '4px', backgroundColor: '#B8965A', marginBottom: '60px' }}></div>
          {data.dateText && <span style={{ fontSize: '48px', marginBottom: '30px' }}>{data.dateText}</span>}
          {data.timeText && <span style={{ fontSize: '40px', marginBottom: '30px', opacity: 0.8 }}>{data.timeText}</span>}
          {data.venueName && <span style={{ fontSize: '40px', opacity: 0.7, marginTop: '20px', textAlign: 'center' }}>{data.venueName}</span>}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '80px' }}>
          <div style={{ background: '#F5F3EF', padding: '30px', borderRadius: '24px', display: 'flex' }}>
            <QRCodeSVG 
              value={data.publicUrl}
              size={300}
              level="H"
              includeMargin={false}
              fgColor="#1A1A1A"
              bgColor="#F5F3EF"
            />
          </div>
          <span style={{ fontSize: '32px', marginTop: '40px', color: '#B8965A' }}>امسح الرمز لفتح الدعوة</span>
        </div>
      </div>
    </div>
  )
};
