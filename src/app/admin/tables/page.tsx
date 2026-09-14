'use client';

import { useState, useEffect } from 'react';
import QRCard from '@/components/QRCard';
import { mockStore } from '@/lib/mock-store';
import { Table } from '@/types';
import { Plus, Printer, Trash2, ExternalLink, QrCode, X } from 'lucide-react';
import Link from 'next/link';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  const loadTables = () => {
    setTables(mockStore.getTables());
  };

  useEffect(() => {
    loadTables();
    const unsub = mockStore.subscribe(loadTables);
    return () => unsub();
  }, []);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    mockStore.addTable(newTableName.trim());
    setNewTableName('');
    setIsAddModalOpen(false);
  };

  const handleDeleteTable = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa "${name}" không?`)) {
      mockStore.deleteTable(id);
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
            Tổng cộng <strong>{tables.length} bàn</strong>. Quét mã QR để mở thẳng menu gọi món tương ứng với bàn.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {tables.map((table) => (
          <div key={table.id} className="relative group">
            <QRCard table={table} />

            {/* Admin Table Controls Overlay */}
            <div className="mt-2 flex items-center justify-between px-1 print:hidden">
              <Link
                href={`/order/${table.slug}`}
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
                <Trash2 className="w-3 h-3" />
                <span>Xóa bàn</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD TABLE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-kraft-card border border-brass max-w-sm w-full rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">Thêm Bàn Mới</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-pine-2 hover:text-pine"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Tên bàn hiển thị</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Ví dụ: Bàn 11, Bàn Ngoài Hiên..."
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-pine-2 hover:text-pine"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Tạo bàn & Sinh QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
