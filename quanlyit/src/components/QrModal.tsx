import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface QrModalProps {
  assetId: string;
  assetName: string;
  assetType: 'Computer' | 'Monitor' | 'ITAsset';
  serialNumber?: string;
  currentUser?: string;
  location?: string;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ 
  assetId, 
  assetName, 
  assetType, 
  serialNumber = 'N/A', 
  currentUser = 'Chưa bàn giao',
  location = 'N/A',
  onClose 
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    JSON.stringify({ id: assetId, type: assetType })
  )}`;

  const handlePrint = () => {
    const printContent = qrRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    
    // Create print window style
    const printStyles = `
      <style>
        body { 
          background: white; 
          color: black; 
          font-family: Arial, sans-serif; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          margin: 0;
        }
        .qr-print-card {
          border: 3px double #000;
          padding: 20px;
          text-align: center;
          width: 320px;
          border-radius: 8px;
        }
        .qr-print-logo { font-weight: bold; font-size: 20px; margin-bottom: 5px; }
        .qr-print-type { font-size: 12px; text-transform: uppercase; color: #555; margin-bottom: 10px; }
        .qr-print-image { width: 180px; height: 180px; margin: 15px auto; display: block; }
        .qr-print-id { font-weight: 700; font-size: 24px; letter-spacing: 1px; margin-bottom: 10px; }
        .qr-print-details { font-size: 11px; text-align: left; border-top: 1px solid #ccc; padding-top: 8px; line-height: 1.4; }
        @media print {
          @page { size: auto; margin: 0; }
          body { padding: 2cm; }
        }
      </style>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In QR Code - ${assetId}</title>
            ${printStyles}
          </head>
          <body>
            <div class="qr-print-card">
              <div class="qr-print-logo">IT ASSET CARD</div>
              <div class="qr-print-type">${assetType} - ${assetName}</div>
              <img class="qr-print-image" src="${qrCodeUrl}" alt="QR" />
              <div class="qr-print-id">${assetId}</div>
              <div class="qr-print-details">
                <div><b>Serial:</b> ${serialNumber}</div>
                <div><b>Người sử dụng:</b> ${currentUser}</div>
                <div><b>Vị trí:</b> ${location}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">QR Code Tài sản</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          {/* Printable Container */}
          <div 
            ref={qrRef}
            style={{ 
              border: '2px solid var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1.5rem', 
              backgroundColor: 'var(--bg-primary)', 
              width: '100%', 
              textAlign: 'center' 
            }}
          >
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
              Thẻ tài sản IT - {assetType}
            </span>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{assetId}</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assetName}</span>

            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              style={{ 
                width: '180px', 
                height: '180px', 
                backgroundColor: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                margin: '1.25rem auto',
                display: 'block'
              }} 
            />

            <div style={{ textAlign: 'left', fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <div><b>Serial:</b> {serialNumber}</div>
              <div><b>Sử dụng:</b> {currentUser}</div>
              <div><b>Vị trí:</b> {location}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Đóng</button>
            <button className="btn btn-primary" style={{ flex: 1, gap: '0.5rem' }} onClick={handlePrint}>
              <Printer size={16} /> In nhãn QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
