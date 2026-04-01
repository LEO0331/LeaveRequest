import { LeaveRequest } from '../types';

export interface PdfFilterSummary {
  role: string;
  search: string;
  user: string;
  status: string;
  startFrom: string;
  endTo: string;
  sort: string;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export async function exportRequestsToPdf(
  rows: LeaveRequest[],
  summary: PdfFilterSummary
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const generatedAt = new Date().toLocaleString();

  doc.setFontSize(14);
  doc.text('Leave Requests Report', 40, 36);

  doc.setFontSize(10);
  doc.text(`Generated at: ${generatedAt}`, 40, 54);
  doc.text(`Rows: ${rows.length}`, 40, 68);

  const summaryLines = [
    `Role: ${summary.role}`,
    `Search: ${summary.search || 'Any'}`,
    `User: ${summary.user}`,
    `Status: ${summary.status}`,
    `Start From: ${summary.startFrom || 'Any'}`,
    `End To: ${summary.endTo || 'Any'}`,
    `Sort: ${summary.sort}`
  ];

  summaryLines.forEach((line, index) => {
    doc.text(line, 40, 86 + index * 14);
  });

  autoTable(doc, {
    startY: 196,
    head: [['User', 'Client', 'Type', 'Start', 'End', 'Days', 'Status', 'Reason']],
    body: rows.map((row) => [
      row.userName,
      row.client,
      row.leaveType,
      shortDate(row.startDate),
      shortDate(row.endDate),
      row.durationDays.toFixed(2),
      row.status,
      row.reason
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [31, 111, 235]
    },
    columnStyles: {
      7: { cellWidth: 200 }
    }
  });

  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  doc.save(`leave-requests-${stamp}.pdf`);
}
