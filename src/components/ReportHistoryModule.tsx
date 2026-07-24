import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  FileCode, 
  CheckCircle2,
  Calendar,
  Layers,
  User as UserIcon,
  X
} from "lucide-react";
import { GeneratedReport, User, UserRole } from "../types";
import { 
  getGeneratedReports, 
  reloadGeneratedReportsFromSupabase, 
  deleteGeneratedReport, 
  addAuditLog 
} from "../utils/storage";
import { 
  exportForwardingLetterPDF, 
  exportForwardingLetterWord, 
  resolveLetterHtml,
  renderSharedLetterLayout
} from "../utils/exportUtils";

interface ReportHistoryModuleProps {
  currentUser: User;
  onClose?: () => void;
}

export const ReportHistoryModule: React.FC<ReportHistoryModuleProps> = ({
  currentUser,
  onClose
}) => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [tradeFilter, setTradeFilter] = useState<string>("ALL");
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const reloaded = await reloadGeneratedReportsFromSupabase();
      setReports(reloaded);
    } catch (err) {
      console.warn("Falling back to local report history:", err);
      setReports(getGeneratedReports());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("શું તમે આ અહેવાલ હિસ્ટ્રી ડિલીટ કરવા માંગો છો? (Are you sure you want to delete this report record?)")) {
      return;
    }
    deleteGeneratedReport(id);
    addAuditLog(currentUser.name, `Deleted Report History record ID: ${id}`);
    loadReports();
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
  };

  const handlePrint = (report: GeneratedReport) => {
    const printWindow = document.createElement("iframe");
    printWindow.style.position = "fixed";
    printWindow.style.right = "0";
    printWindow.style.bottom = "0";
    printWindow.style.width = "0";
    printWindow.style.height = "0";
    printWindow.style.border = "0";
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    const htmlContent = getReportPreviewHtml(report);

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.reportName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Inter:wght@400;600;700;800&display=swap');
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Noto Sans Gujarati', 'Inter', sans-serif;
              color: #000;
              background-color: #fff;
              margin: 0;
              padding: 0;
              font-size: 13px;
              line-height: 1.6;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div>${htmlContent}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printWindow);
      }, 1000);
    }, 500);
  };

  const handleDownloadPDF = (report: GeneratedReport) => {
    if (report.reportType === "FORWARDING_LETTER" && report.dataSnapshot) {
      const snap = report.dataSnapshot;
      exportForwardingLetterPDF(
        report.trade || snap.trade || "Trade",
        report.batch || snap.batch || "Batch",
        snap.letterDate || new Date().toISOString().split("T")[0],
        snap.letterSiName || report.generatedBy,
        snap.irregularCandidates || [],
        report.reportName.replace(/\s+/g, "_"),
        snap.letterTemplate
      );
    } else {
      handlePrint(report);
    }
  };

  const handleDownloadWord = (report: GeneratedReport) => {
    if (report.reportType === "FORWARDING_LETTER" && report.dataSnapshot) {
      const snap = report.dataSnapshot;
      exportForwardingLetterWord(
        report.trade || snap.trade || "Trade",
        report.batch || snap.batch || "Batch",
        snap.letterDate || new Date().toISOString().split("T")[0],
        snap.letterSiName || report.generatedBy,
        snap.irregularCandidates || [],
        report.reportName.replace(/\s+/g, "_"),
        snap.letterTemplate
      );
    } else {
      // Export generic HTML snippet as Word .doc
      const htmlContent = getReportPreviewHtml(report);
      const blob = new Blob([`
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${report.reportName}</title></head>
        <body style="font-family: Arial, sans-serif;">${htmlContent}</body>
        </html>
      `], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.reportName.replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getReportPreviewHtml = (report: GeneratedReport): string => {
    if (!report.dataSnapshot) {
      return `<div style="padding: 20px; text-align: center; color: #666;">No document layout snapshot available for this record.</div>`;
    }

    const snap = report.dataSnapshot;

    if (report.reportType === "FORWARDING_LETTER") {
      if (snap.letterTemplate) {
        return resolveLetterHtml(snap.letterTemplate, {
          resolvedSiName: snap.letterSiName || report.generatedBy,
          gujTradeName: report.trade || snap.trade || "",
          dateFormatted: snap.letterDate ? new Date(snap.letterDate).toLocaleDateString("gu-IN") : "",
          batchListString: report.batch || snap.batch || "",
          irregularCandidatesCount: snap.irregularCandidates ? snap.irregularCandidates.length : 0,
          irregularCandidates: snap.irregularCandidates || []
        });
      }
    }

    if (report.reportType === "GENERAL_LETTER" || snap.body || snap.subject) {
      return renderSharedLetterLayout({
        resolvedSiName: snap.siName || report.generatedBy,
        designation: snap.designation || "Supervisor Instructor",
        instituteName: snap.instituteName || "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર",
        dateFormatted: snap.date || new Date().toLocaleDateString("gu-IN"),
        recipient: snap.recipient || "પ્રતિ, આચાર્યશ્રી",
        subject: snap.subject || "વિષય: સામાન્ય પત્ર",
        body: snap.body || "",
        closing: snap.closing || "આપનો વિશ્વાસુ,",
        signature: snap.signature || snap.siName || report.generatedBy
      });
    }

    return `<div style="padding: 20px; font-family: 'Noto Sans Gujarati', sans-serif;">
      <h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px;">${report.reportName}</h2>
      <p><strong>રિપોર્ટ પ્રકાર:</strong> ${report.reportType}</p>
      <p><strong>તારીખ:</strong> ${new Date(report.generatedAt).toLocaleString("gu-IN")}</p>
      <p><strong>બનાવનાર:</strong> ${report.generatedBy}</p>
      <hr style="margin: 15px 0;" />
      <pre style="white-space: pre-wrap; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px;">${JSON.stringify(snap, null, 2)}</pre>
    </div>`;
  };

  // Filtered list logic
  const filteredReports = reports.filter(r => {
    // Search matching
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = r.reportName?.toLowerCase().includes(searchLower);
    const tradeMatch = r.trade?.toLowerCase().includes(searchLower);
    const batchMatch = r.batch?.toLowerCase().includes(searchLower);
    const authorMatch = r.generatedBy?.toLowerCase().includes(searchLower);
    const monthMatch = String(r.month || "").toLowerCase().includes(searchLower);

    const isSearchMatch = !searchTerm || nameMatch || tradeMatch || batchMatch || authorMatch || monthMatch;

    // Type matching
    const isTypeMatch = typeFilter === "ALL" || r.reportType === typeFilter;

    // Trade matching
    const isTradeMatch = tradeFilter === "ALL" || r.trade === tradeFilter;

    return isSearchMatch && isTypeMatch && isTradeMatch;
  });

  const tradesList = Array.from(new Set(reports.map(r => r.trade).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 font-display">
              અહેવાલ હિસ્ટ્રી ડેશબોર્ડ (Report History Module)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              સંસ્થાના તમામ જનરેટ થયેલા ઓફિશિયલ ફોરવર્ડિંગ પત્રો, હાજરી અહેવાલો અને સંસ્થાકીય રિપોર્ટ્સનું ઓનલાઇન કાયમી આર્કાઇવ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>રિફ્રેશ (Refresh)</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="શોધો (રિપોર્ટ નામ, ટ્રેડ, બેચ, માસ, અથવા ઈન્સ્ટ્રક્ટર)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">તમામ અહેવાલ પ્રકારો (All Types)</option>
            <option value="FORWARDING_LETTER">ફોરવર્ડિંગ પત્ર (Forwarding Letter)</option>
            <option value="ATTENDANCE_DEFAULTER">ગેરહાજરી અહેવાલ (Attendance Defaulter)</option>
            <option value="GENERAL_LETTER">સામાન્ય પત્ર (General Letter)</option>
            <option value="ON_ROLL_REPORT">ઓન-રોલ રિપોર્ટ (On-Roll Report)</option>
            <option value="OTHER">અન્ય (Other)</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">તમામ ટ્રેડ (All Trades)</option>
            {tradesList.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-indigo-600" />
            જનરેટ થયેલા અહેવાલોની યાદી (Total: {filteredReports.length})
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            સુરક્ષિત સુપાબેઝ લાઇવ ડેટાબેઝ
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText size={48} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">કોઈ અહેવાલ હિસ્ટ્રી રેકોર્ડ મળ્યો નથી.</p>
            <p className="text-xs text-slate-400">
              નવા રિપોર્ટ્સ જનરેટ અથવા ડાઉનલોડ કરતી વખતે તેઓ અહીં સ્વચાલિત રીતે સેવ થશે.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="p-3">અહેવાલનું નામ (Report Name)</th>
                  <th className="p-3">પ્રકાર (Type)</th>
                  <th className="p-3">ટ્રેડ & બેચ</th>
                  <th className="p-3">માસ / સેશન</th>
                  <th className="p-3">જનરેટ કરનાર</th>
                  <th className="p-3">તારીખ & સમય</th>
                  <th className="p-3 text-right">એક્શન્સ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredReports.map((report) => {
                  const dateStr = new Date(report.generatedAt).toLocaleDateString("gu-IN");
                  const timeStr = new Date(report.generatedAt).toLocaleTimeString("gu-IN", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-600 shrink-0" />
                          <span>{report.reportName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          report.reportType === "FORWARDING_LETTER"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : report.reportType === "ATTENDANCE_DEFAULTER"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : report.reportType === "GENERAL_LETTER"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {report.reportType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {report.trade ? `${report.trade} (${report.batch || "-"})` : "-"}
                      </td>
                      <td className="p-3 font-semibold text-slate-600">
                        {report.month || report.academicSession || "-"}
                      </td>
                      <td className="p-3 text-slate-800 font-bold">
                        {report.generatedBy}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {dateStr} <span className="text-slate-400">{timeStr}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReport(report)}
                            title="પ્રિવ્યૂ જુઓ (View Preview)"
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">જુઓ</span>
                          </button>

                          <button
                            onClick={() => handlePrint(report)}
                            title="પ્રિન્ટ કાઢો (Print)"
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <Printer size={14} />
                          </button>

                          <button
                            onClick={() => handleDownloadPDF(report)}
                            title="પીડીએફ ડાઉનલોડ (PDF)"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <Download size={14} />
                          </button>

                          <button
                            onClick={() => handleDownloadWord(report)}
                            title="વર્ડ ફાઇલ ડાઉનલોડ (Word)"
                            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <FileCode size={14} />
                          </button>

                          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR_INSTRUCTOR) && (
                            <button
                              onClick={() => handleDelete(report.id)}
                              title="ડિલીટ કરો (Delete)"
                              className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  અહેવાલ પ્રિવ્યૂ: {selectedReport.reportName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  જનરેટ તારીખ: {new Date(selectedReport.generatedAt).toLocaleString("gu-IN")} • ઈન્સ્ટ્રક્ટર: {selectedReport.generatedBy}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selectedReport)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer size={14} /> પ્રિન્ટ
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedReport)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} /> PDF
                </button>
                <button
                  onClick={() => handleDownloadWord(selectedReport)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCode size={14} /> Word
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
              <div 
                className="bg-white p-8 rounded-xl shadow-md border border-slate-200 max-w-3xl mx-auto min-h-[600px] text-slate-900"
                dangerouslySetInnerHTML={{ __html: getReportPreviewHtml(selectedReport) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
