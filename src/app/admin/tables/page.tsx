'use client';

import { useState, useEffect } from 'react';
import QRCard from '@/components/QRCard';
import { tableService } from '@/lib/services';
import { Table } from '@/types';
import { Plus, Printer, Trash2, ExternalLink, QrCode, X } from 'lucide-react';
import Link from 'next/link';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTables = async () => {
    try {
      const data = await tableService.getTables();
      setTables(data);
    } catch (err) {
      console.error('Lỗi tải danh sách bàn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    try {
      await tableService.createTable(newTableName.trim());
      setNewTableName('');
      setIsAddModalOpen(false);
      await loadTables();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi tạo bàn');
    }
  };

  const handleDeleteTable = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa "${name}" không?`)) {
      try {
        await tableService.deleteTable(id);
        await loadTables();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Lỗi xóa bàn');
      }
    }
  };

  const handleRegenerateToken = async (id: string) => {
    try {
      await tableService.regenerateQrToken(id);
      await loadTables();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi đổi mã QR');
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 sm:p-5 rounded-2xl shadow-card print:hidden">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <QrCode className="w-6 h-6 text-moss" />
            <span>Quản Lý Bàn & Mã QR Gọi Món</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{tables.length} bàn</strong>. Mã QR sử dụng mã định danh bảo mật khó đoán, chống gian lận.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintAll}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-kraft-soft border border-brass/40 text-pine hover:bg-kraft-dark/40 transition flex items-center gap-1.5 tap-active"
          >
            <Printer className="w-4 h-4" />
            <span>In toàn bộ mã QR</span>
          </button>

          <button
            onClick={() => {
              setNewTableName(`Bàn ${String(tables.length + 1).padStart(2, '0')}`);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bàn mới</span>
          </button>
        </div>
      </div>

      {/* Grid of Tables & QR Codes */}
      {loading ? (
        <div className="py-12 text-center text-xs text-pine-2">Đang tải danh sách bàn...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {tables.map((table) => (
            <div key={table.id} className="relative group">
              <QRCard table={table} onRegenerateToken={handleRegenerateToken} />

              {/* Admin Table Controls Overlay */}
              <div className="mt-2 flex items-center justify-between px-1 print:hidden">
                <Link
                  href={`/order/${table.qr_token || table.slug}`}
                  target="_blank"
                  className="text-[11px] font-semibold text-moss hover:underline flex items-center gap-1"
                >
                  <span>Mở menu bàn</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <button
                  onClick={() => handleDeleteTable(table.id, table.name)}
                  className="text-[11px] font-semibold text-clay/70 hover:text-clay flex items-center gap-1 transition"
                  title="Xóa bàn này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Table */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">Thêm Bàn Phục Vụ Mới</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Tên bàn hiển thị:</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Ví dụ: Bàn 11, Bàn Ngoài Sân..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active"
                >
                  Tạo bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
