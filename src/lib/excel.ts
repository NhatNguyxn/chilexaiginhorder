import ExcelJS from 'exceljs';
import { AttendanceRecord, UserProfile } from '@/types';

export interface ExportAttendanceItem {
  stt: number;
  date: string;
  user_name: string;
  username: string;
  check_in_time: string;
  check_out_time: string;
  total_hours: string;
  distance_meters: string;
  flags: string;
  status: string;
  note: string;
}

export interface ExportMonthlySummaryItem {
  stt: number;
  user_name: string;
  username: string;
  total_shifts: number;
  total_hours: number;
  flagged_count: number;
}

/**
 * Generates an Excel (.xlsx) file using ExcelJS with Vietnamese diacritics,
 * branded pine/kraft color themes, frozen headers, and auto-fitted columns.
 */
export async function generateAttendanceExcel(
  detailItems: ExportAttendanceItem[],
  summaryItems: ExportMonthlySummaryItem[],
  monthStr: string = ''
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chị Lệ xai gính';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Chi tiết chấm công
  // -------------------------------------------------------------
  const sheetDetails = workbook.addWorksheet('Chi tiết chấm công', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  sheetDetails.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Ngày', key: 'date', width: 14 },
    { header: 'Tên nhân viên', key: 'user_name', width: 22 },
    { header: 'Tên đăng nhập', key: 'username', width: 16 },
    { header: 'Giờ vào ca', key: 'check_in_time', width: 14 },
    { header: 'Giờ kết ca', key: 'check_out_time', width: 14 },
    { header: 'Tổng giờ làm', key: 'total_hours', width: 14 },
    { header: 'Khoảng cách (m)', key: 'distance_meters', width: 16 },
    { header: 'Cờ cảnh báo', key: 'flags', width: 26 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Ghi chú', key: 'note', width: 28 },
  ];

  // Header Styling (Pine green brand background, bold white text)
  const headerRow = sheetDetails.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF22301E' }, // Brand pine green
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFAD8B52' } },
      bottom: { style: 'thin', color: { argb: 'FFAD8B52' } },
    };
  });

  // Populate data
  detailItems.forEach((item, index) => {
    const row = sheetDetails.addRow(item);
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('check_in_time').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('check_out_time').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('total_hours').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('distance_meters').alignment = { vertical: 'middle', horizontal: 'right' };

    // Zebra striping
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F6EE' }, // Soft kraft tint
        };
      });
    }
  });

  // -------------------------------------------------------------
  // Sheet 2: Tổng hợp tháng
  // -------------------------------------------------------------
  const sheetSummary = workbook.addWorksheet('Tổng hợp tháng', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  sheetSummary.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên nhân viên', key: 'user_name', width: 24 },
    { header: 'Tên đăng nhập', key: 'username', width: 16 },
    { header: 'Tổng số ca', key: 'total_shifts', width: 16 },
    { header: 'Tổng giờ làm (h)', key: 'total_hours', width: 18 },
    { header: 'Số lần bất thường', key: 'flagged_count', width: 20 },
  ];

  const sumHeaderRow = sheetSummary.getRow(1);
  sumHeaderRow.height = 28;
  sumHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2D4737' },
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  summaryItems.forEach((item, index) => {
    const row = sheetSummary.addRow(item);
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('total_shifts').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('total_hours').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('flagged_count').alignment = { vertical: 'middle', horizontal: 'right' };

    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F6EE' },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generates UTF-8 CSV with Byte Order Mark (\uFEFF) to guarantee Excel
 * correctly decodes Vietnamese text without garbled characters.
 */
export function generateAttendanceCsvWithBom(items: ExportAttendanceItem[]): string {
  const BOM = '\uFEFF';
  const headers = [
    'STT',
    'Ngày',
    'Tên nhân viên',
    'Tên đăng nhập',
    'Giờ vào ca',
    'Giờ kết ca',
    'Tổng giờ làm',
    'Khoảng cách (m)',
    'Cờ cảnh báo',
    'Trạng thái',
    'Ghi chú',
  ];

  const escapeCsv = (str: string | number) => {
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows = [headers.map(escapeCsv).join(',')];

  items.forEach((it) => {
    csvRows.push(
      [
        it.stt,
        it.date,
        it.user_name,
        it.username,
        it.check_in_time,
        it.check_out_time,
        it.total_hours,
        it.distance_meters,
        it.flags,
        it.status,
        it.note,
      ]
        .map(escapeCsv)
        .join(',')
    );
  });

  return BOM + csvRows.join('\r\n');
}

import { calculateShiftHours } from '@/lib/geo';
export { calculateShiftHours };

