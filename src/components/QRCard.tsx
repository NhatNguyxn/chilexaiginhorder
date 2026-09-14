'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Table } from '@/types';
import { STORE_NAME } from '@/lib/constants';
import { Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface QRCardProps {
  table: Table;
  baseUrl?: string;
}

export default function QRCard({ table, baseUrl = '' }: QRCardProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const orderUrl = `${baseUrl}/order/${table.slug}`;

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    canvas.width = 600;
    canvas.height = 700;

    img.onload = () => {
      if (!ctx) return;
      // Nền kraft ấm cúng
      ctx.fillStyle = '#F2EAD4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Viền khung gỗ / đồng
      ctx.strokeStyle = '#AD8B52';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // Tiêu đề
      ctx.fillStyle = '#22301E';
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.fillText(STORE_NAME, canvas.width / 2, 70);

      ctx.fillStyle = '#8E3E21';
      ctx.font = 'bold 44px serif';
      ctx.fillText(table.name, canvas.width / 2, 130);

      // Vẽ QR code
      ctx.drawImage(img, (canvas.width - 360) / 2, 170, 360, 360);

      // Chân thẻ
      ctx.fillStyle = '#2D4737';
      ctx.font = '20px sans-serif';
      ctx.fillText('Quét mã QR để xem menu & gọi món', canvas.width / 2, 580);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#6E7F55';
      ctx.fillText('Không cần tải app • Không cần đăng ký', canvas.width / 2, 620);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${STORE_NAME}_${table.slug}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="bg-kraft-card border-2 border-brass/50 rounded-2xl p-5 shadow-card flex flex-col items-center text-center relative group">
      <div className="mb-2">
        <h3 className="font-serif font-bold text-pine text-lg">{table.name}</h3>
        <p className="text-xs text-moss font-semibold uppercase tracking-wider">
          {STORE_NAME}
        </p>
      </div>

      {/* QR Code Container */}
      <div
        ref={qrRef}
        className="p-4 bg-white rounded-xl border border-brass/30 shadow-inner my-2"
      >
        <QRCodeSVG
          value={orderUrl}
          size={160}
          level="H"
          fgColor="#22301E"
          bgColor="#FFFFFF"
        />
      </div>

      <p className="text-[11px] text-pine-2 font-mono mt-1 break-all px-2">
        /order/{table.slug}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 w-full">
        <button
          onClick={downloadQR}
          className="flex-1 py-2 bg-brass hover:bg-brass-soft text-pine font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm tap-active"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải ảnh in</span>
        </button>

        <Link
          href={`/order/${table.slug}`}
          target="_blank"
          className="p-2 border border-brass/50 hover:bg-kraft text-pine rounded-lg transition"
          title="Mở thử menu bàn này"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
