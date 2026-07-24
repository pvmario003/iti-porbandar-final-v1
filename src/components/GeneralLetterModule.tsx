import React, { useState, useEffect } from "react";
import { Save, Printer, Download, FileText, Undo, Check, Loader, Sparkles, Copy, FolderOpen, Trash2, Plus } from "lucide-react";
import { User, GeneralLetterData, LetterReportDraft, GeneratedReport } from "../types";
import { getUsers, addAuditLog, getGeneralLetter, saveGeneralLetter, getLetterDrafts, saveLetterDraft, deleteLetterDraft, generateId, saveGeneratedReport } from "../utils/storage";
import { exportToWord, renderSharedLetterLayout, renderHajarReportLayout } from "../utils/exportUtils";
import { NOTO_SANS_GUJARATI_BASE64 } from "../utils/notoSansGujaratiBase64";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface GeneralLetterModuleProps {
  currentUser: User;
}

export default function GeneralLetterModule({ currentUser }: GeneralLetterModuleProps) {
  const [templateId, setTemplateId] = useState<string>("general_letter");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [draftsList, setDraftsList] = useState<LetterReportDraft[]>([]);

  // Default SI Gujarati Name
  const getDefaultSiName = () => {
    let name = currentUser.name;
    try {
      const users = getUsers();
      const matchedUser = users.find(u => u.id === currentUser.id);
      if (matchedUser?.supervisorNameGujarati) {
        name = matchedUser.supervisorNameGujarati;
      } else if (matchedUser?.supervisorNameEnglish) {
        name = matchedUser.supervisorNameEnglish;
      }
    } catch (err) {
      console.error("Error fetching SI details:", err);
    }
    return name;
  };

  // Default Template Data Builders
  const buildDefaultGeneralLetter = (): GeneralLetterData => {
    const siName = getDefaultSiName();
    return {
      id: "general_letter",
      templateName: "General Letter",
      instituteName: "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર",
      siName: siName,
      designation: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
      date: new Date().toISOString().split("T")[0],
      recipient: "પ્રતિ,\nઆચાર્યશ્રી,\nઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર.",
      subject: "વિષય : તાલીમાર્થીઓની અનિયમિતતા બાબતે.",
      body: "માનનીય સાહેબશ્રી,\n\n      ઉપરોક્ત વિષય અન્વયે સવિનય સાથ જણાવવાનું કે ટ્રેડના તાલીમાર્થીઓ અનિયમિત છે, તો આ અંગે યોગ્ય કાર્યવાહી કરવા વિનંતી છે.",
      closing: "આપનો વિશ્વાસુ,",
      signature: siName,
    };
  };

  const buildDefaultHajarReport = (): GeneralLetterData => {
    const siName = getDefaultSiName() || "ગૌરવ કે. ડોડીયા";
    return {
      id: "hajar_report",
      templateName: "Hajar Report (હાજર રિપોર્ટ)",
      instituteName: "ઔદ્યોગિક તાલીમ સંસ્થા,પોરબંદર",
      siName: siName,
      designation: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર (વેલ્ડર)",
      date: "2024-12-23",
      location: "પોરબંદર",
      recipient: "પ્રતિ,\nઆચાર્યશ્રી,\nઔદ્યોગિક તાલીમ સંસ્થા,\nપોરબંદર",
      subject: "ફરજ પર હાજર થવા બાબત.",
      body: "સવિનય ઉપરોક્ત વિષય અન્વયે આપશ્રીને જણાવવાનું કે, હું તા.૧૭/૧૨/૨૦૨૪ થી તા.૨૧/૧૨/૨૦૨૪ સુધી પાછળ તા.૨૨/૧૨/૨૦૨૪ ના લાભ સાથે સ્પેશ્યલ લીવ પર હતો, જે આજ રોજ પૂર્ણ થતાં ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર ખાતે હું આજ રોજ તા.૨૩/૧૨/૨૦૨૪ના રોજ કચેરી સમય પહેલાં હાજર થાઉં છું. આપ સાહેબશ્રીને મને ફરજ પર હાજર લેવા નમ્ર વિનંતી છે.",
      closing: "આપનો વિશ્વાસુ",
      signature: `(${siName})`,
      draftName: "Hajar Report Master Template",
    };
  };

  const [letterData, setLetterData] = useState<GeneralLetterData>(buildDefaultGeneralLetter());

  // Load saved letter data or default on templateId change
  useEffect(() => {
    const saved = getGeneralLetter(templateId);
    if (saved) {
      setLetterData(saved);
    } else {
      if (templateId === "hajar_report") {
        setLetterData(buildDefaultHajarReport());
      } else {
        setLetterData(buildDefaultGeneralLetter());
      }
    }
    refreshDraftsList();
  }, [templateId]);

  const refreshDraftsList = () => {
    const list = getLetterDrafts(templateId);
    setDraftsList(list);
  };

  const handleFieldChange = (field: keyof GeneralLetterData, value: any) => {
    setLetterData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto calculate leave days if leave dates change
      if ((field === "leaveFromDate" || field === "leaveToDate") && updated.leaveFromDate && updated.leaveToDate) {
        const fromTime = new Date(updated.leaveFromDate).getTime();
        const toTime = new Date(updated.leaveToDate).getTime();
        if (!isNaN(fromTime) && !isNaN(toTime) && toTime >= fromTime) {
          const days = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1;
          updated.totalLeaveDays = String(days);
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const now = new Date().toISOString();
      const updatedData = { ...letterData, lastSavedAt: now };
      saveGeneralLetter(templateId, updatedData);
      setLetterData(updatedData);

      addAuditLog(
        currentUser.name,
        `Saved ${templateId === "hajar_report" ? "Hajar Report" : "General Letter"} master configuration permanently.`
      );

      setTimeout(() => {
        setIsSaving(false);
        setSaveMessage(`${templateId === "hajar_report" ? "Hajar Report (હાજર રિપોર્ટ)" : "General Letter"} saved successfully as active master template!`);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }, 400);
    } catch (err: any) {
      setIsSaving(false);
      alert("Failed to save report: " + err.message);
    }
  };

  const handleSaveAsNewDraft = () => {
    const defaultName = letterData.draftName || `${templateId === "hajar_report" ? "Hajar Report" : "General Letter"} Draft - ${new Date().toLocaleDateString('gu-IN')}`;
    const draftName = prompt("Enter a name to save this report draft:", defaultName);
    if (!draftName || !draftName.trim()) return;

    try {
      const draftId = "draft-" + generateId();
      const now = new Date().toISOString();
      const newDraft: LetterReportDraft = {
        id: draftId,
        templateId: templateId,
        draftName: draftName.trim(),
        lastSavedAt: now,
        data: {
          ...letterData,
          id: draftId,
          draftName: draftName.trim(),
          lastSavedAt: now,
        }
      };

      saveLetterDraft(newDraft);
      refreshDraftsList();
      alert(`Report draft "${draftName.trim()}" saved successfully! You can access it anytime from Drafts Manager.`);
      addAuditLog(currentUser.name, `Saved new report draft: ${draftName.trim()}`);
    } catch (err: any) {
      alert("Error saving draft: " + err.message);
    }
  };

  const handleDuplicate = () => {
    const dupName = prompt("Enter name for duplicated report:", `${letterData.draftName || "Report"} (Copy)`);
    if (!dupName || !dupName.trim()) return;

    const newDraft: LetterReportDraft = {
      id: "draft-" + generateId(),
      templateId: templateId,
      draftName: dupName.trim(),
      lastSavedAt: new Date().toISOString(),
      data: {
        ...letterData,
        draftName: dupName.trim(),
        date: new Date().toISOString().split("T")[0],
      }
    };

    saveLetterDraft(newDraft);
    setLetterData(newDraft.data);
    refreshDraftsList();
    alert(`Duplicated report draft saved and loaded as "${dupName.trim()}".`);
    addAuditLog(currentUser.name, `Duplicated report draft: ${dupName.trim()}`);
  };

  const handleLoadDraft = (draft: LetterReportDraft) => {
    setLetterData(draft.data);
    setShowDraftsModal(false);
    alert(`Loaded draft: ${draft.draftName}`);
  };

  const handleDeleteDraft = (draftId: string, name: string) => {
    if (confirm(`Are you sure you want to delete the draft "${name}"?`)) {
      deleteLetterDraft(draftId);
      refreshDraftsList();
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm(`Are you sure you want to restore default template values for ${templateId === "hajar_report" ? "Hajar Report" : "General Letter"}? Custom edits will be reset.`)) {
      let defaults: GeneralLetterData;
      if (templateId === "hajar_report") {
        defaults = buildDefaultHajarReport();
      } else {
        defaults = buildDefaultGeneralLetter();
      }
      setLetterData(defaults);
      saveGeneralLetter(templateId, defaults);
      addAuditLog(currentUser.name, `Restored default template for ${templateId}`);
    }
  };

  const dateFormatted = new Date(letterData.date).toLocaleDateString("gu-IN");
  const leaveFromFormatted = letterData.leaveFromDate ? new Date(letterData.leaveFromDate).toLocaleDateString("gu-IN") : "-";
  const leaveToFormatted = letterData.leaveToDate ? new Date(letterData.leaveToDate).toLocaleDateString("gu-IN") : "-";
  const joiningDateFormatted = letterData.joiningDate ? new Date(letterData.joiningDate).toLocaleDateString("gu-IN") : "-";

  // Helper to compile letter HTML content
  const getLetterHtml = (isForWord: boolean = false) => {
    if (templateId === "hajar_report") {
      return renderHajarReportLayout({
        location: letterData.location,
        dateFormatted,
        recipient: letterData.recipient,
        subject: letterData.subject,
        referenceNo: letterData.referenceNo,
        siName: letterData.siName,
        designation: letterData.designation,
        instituteName: letterData.instituteName,
        employeeId: letterData.employeeId,
        mobile: letterData.mobile,
        leaveType: letterData.leaveType,
        leaveFromDateFormatted: leaveFromFormatted,
        leaveToDateFormatted: leaveToFormatted,
        totalLeaveDays: letterData.totalLeaveDays,
        joiningDateFormatted,
        joiningTime: letterData.joiningTime,
        body: letterData.body,
        closing: letterData.closing,
        signature: letterData.signature,
        isForWord,
      });
    }

    return renderSharedLetterLayout({
      resolvedSiName: letterData.siName,
      designation: letterData.designation,
      instituteName: letterData.instituteName,
      dateFormatted,
      recipient: letterData.recipient,
      subject: letterData.subject,
      body: letterData.body,
      closing: letterData.closing,
      signature: letterData.signature,
      isForWord
    });
  };

  const handlePrint = () => {
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

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letterData.templateName} - ITI Porbandar</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Inter:wght@400;600;700&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 20mm 20mm 20mm 20mm;
            }
            
            body {
              font-family: 'Noto Sans Gujarati', 'Inter', sans-serif;
              color: #000;
              background-color: #fff;
              margin: 0;
              padding: 0;
              font-size: 13.5px;
              line-height: 1.7;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .container {
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${getLetterHtml(false)}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printWindow)) {
          document.body.removeChild(printWindow);
        }
      }, 1000);
    }, 500);

    addAuditLog(currentUser.name, `Printed ${letterData.templateName}`);

    const reportRecord: GeneratedReport = {
      id: "rep-" + generateId(),
      reportType: letterData.templateName === "Hajar Report" ? "ATTENDANCE_DEFAULTER" : "GENERAL_LETTER",
      reportName: `${letterData.templateName || "General Letter"} - ${letterData.subject || "Official Letter"}`,
      generatedAt: new Date().toISOString(),
      month: new Date().toISOString().substring(0, 7),
      generatedBy: letterData.siName || currentUser.name,
      generatedByRole: currentUser.role,
      dataSnapshot: letterData,
      fileType: "both"
    };
    saveGeneratedReport(reportRecord);
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const tempContainer = document.createElement("div");
      tempContainer.id = "temp-report-container";
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "0px";
      tempContainer.style.top = "0px";
      tempContainer.style.zIndex = "-9999";
      tempContainer.style.opacity = "1";
      tempContainer.style.pointerEvents = "none";
      tempContainer.style.width = "794px"; // A4 width at 96 DPI
      tempContainer.style.minHeight = "1123px"; // A4 height at 96 DPI
      tempContainer.style.backgroundColor = "#ffffff";
      tempContainer.style.color = "#000000";
      tempContainer.style.padding = "65px";
      tempContainer.style.boxSizing = "border-box";

      tempContainer.innerHTML = `
        <style>
          @font-face {
            font-family: 'Noto Sans Gujarati';
            src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          .pdf-font {
            font-family: 'Noto Sans Gujarati', 'Inter', sans-serif !important;
          }
        </style>
        <div class="pdf-font">
          ${getLetterHtml(false)}
        </div>
      `;

      document.body.appendChild(tempContainer);

      if (typeof document !== "undefined" && (document as any).fonts) {
        await (document as any).fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 350));

      const targetWidth = tempContainer.offsetWidth > 0 ? tempContainer.offsetWidth : 794;
      const targetHeight = tempContainer.offsetHeight > 0 ? tempContainer.offsetHeight : 1123;

      const canvas = await html2canvas(tempContainer, {
        scale: 3, // 300-600 DPI equivalent
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: targetWidth,
        height: targetHeight,
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const cleanTitle = (letterData.templateName || "Report").replace(/[\s\(\)\/]+/g, "_");
      const filename = `${cleanTitle}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      
      addAuditLog(currentUser.name, `Downloaded PDF (${filename})`);

      const reportRecord: GeneratedReport = {
        id: "rep-" + generateId(),
        reportType: letterData.templateName === "Hajar Report" ? "ATTENDANCE_DEFAULTER" : "GENERAL_LETTER",
        reportName: `${letterData.templateName || "General Letter"} - ${letterData.subject || "Official Letter"}`,
        generatedAt: new Date().toISOString(),
        month: new Date().toISOString().substring(0, 7),
        generatedBy: letterData.siName || currentUser.name,
        generatedByRole: currentUser.role,
        dataSnapshot: letterData,
        fileType: "pdf"
      };
      saveGeneratedReport(reportRecord);

      alert(`Successfully generated and downloaded PDF: ${filename}`);
    } catch (error: any) {
      console.error("Failed to generate PDF:", error);
      alert("Error generating PDF: " + error.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadWord = () => {
    const cleanTitle = (letterData.templateName || "Report").replace(/[\s\(\)\/]+/g, "_");
    const filename = `${cleanTitle}_${new Date().toISOString().split("T")[0]}`;
    const wordHtml = getLetterHtml(true);
    
    exportToWord(filename, wordHtml);
    addAuditLog(currentUser.name, `Exported Report to Word (${filename}.doc)`);

    const reportRecord: GeneratedReport = {
      id: "rep-" + generateId(),
      reportType: letterData.templateName === "Hajar Report" ? "ATTENDANCE_DEFAULTER" : "GENERAL_LETTER",
      reportName: `${letterData.templateName || "General Letter"} - ${letterData.subject || "Official Letter"}`,
      generatedAt: new Date().toISOString(),
      month: new Date().toISOString().substring(0, 7),
      generatedBy: letterData.siName || currentUser.name,
      generatedByRole: currentUser.role,
      dataSnapshot: letterData,
      fileType: "word"
    };
    saveGeneratedReport(reportRecord);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText size={20} />
            </span>
            Official Government Letters & Reports Module
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Draft, edit, save, duplicate, and export official Gujarat Government PDF templates in Noto Sans Gujarati.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowDraftsModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300 shadow-2xs"
            title="Saved Drafts Manager"
          >
            <FolderOpen size={14} className="text-indigo-600" />
            Drafts ({draftsList.length})
          </button>

          <button
            onClick={handleDuplicate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300"
            title="Duplicate Report"
          >
            <Copy size={14} /> Duplicate
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300"
            title="Restore Defaults"
          >
            <Undo size={14} /> Restore
          </button>

          <button
            onClick={handleSaveAsNewDraft}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-700 shadow-2xs"
          >
            <Plus size={14} /> Save As Draft
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-100 border border-indigo-700"
          >
            {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Save Master Template
          </button>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-fadeIn">
          <Check size={16} className="text-emerald-600 shrink-0" />
          {saveMessage}
        </div>
      )}

      {/* Active Template Selector Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-600 animate-pulse" /> Report / Letter Template Selection
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Select the official government report template to edit and preview.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Report Type:</span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full md:w-80 px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="general_letter">General Letter (ગેરહાજરી / સામાન્ય પત્ર)</option>
            <option value="hajar_report">Hajar Report (હાજર રિપોર્ટ - Duty Joining Report)</option>
          </select>
        </div>
      </div>

      {/* Two Pane Workspace: Editor Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Editor (Left Pane) - 5 Cols */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              ✍️ Report Editor Pane ({templateId === "hajar_report" ? "હાજર રિપોર્ટ" : "સામાન્ય પત્ર"})
            </h3>
            {letterData.draftName && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {letterData.draftName}
              </span>
            )}
          </div>

          {/* HAJAR REPORT EDIT FORM */}
          {templateId === "hajar_report" ? (
            <div className="space-y-4">
              
              {/* Section 1: Top-Right Header (Sender Block) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  1. Sender Header (મોકલનાર માહિતી - ઉપર જમણી તરફ)
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Employee Name (કર્મચારી નામ)</label>
                  <input
                    type="text"
                    value={letterData.siName}
                    onChange={(e) => handleFieldChange("siName", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Designation & Trade (હોદ્દો / ટ્રેડ)</label>
                  <input
                    type="text"
                    value={letterData.designation}
                    onChange={(e) => handleFieldChange("designation", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Institute / Office Name (સંસ્થા નામ)</label>
                  <input
                    type="text"
                    value={letterData.instituteName}
                    onChange={(e) => handleFieldChange("instituteName", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Report Date (તારીખ)</label>
                  <input
                    type="text"
                    value={letterData.date}
                    onChange={(e) => handleFieldChange("date", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    placeholder="2024-12-23 અથવા ૨૩/૧૨/૨૦૨૪"
                  />
                </div>
              </div>

              {/* Section 2: Recipient */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  2. Recipient Address (મેળવનાર સરનામું - ડાબી તરફ)
                </p>
                <textarea
                  rows={4}
                  value={letterData.recipient}
                  onChange={(e) => handleFieldChange("recipient", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 leading-relaxed"
                  placeholder="પ્રતિ,&#10;આચાર્યશ્રી,&#10;ઔદ્યોગિક તાલીમ સંસ્થા,&#10;પોરબંદર"
                />
              </div>

              {/* Section 3: Subject */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  3. Subject (વિષય)
                </p>
                <input
                  type="text"
                  value={letterData.subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  placeholder="ફરજ પર હાજર થવા બાબત."
                />
              </div>

              {/* Section 4: Body Paragraphs */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  4. Report Body (અહેવાલ ફકરો)
                </p>
                <textarea
                  rows={7}
                  value={letterData.body}
                  onChange={(e) => handleFieldChange("body", e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 leading-relaxed"
                  placeholder="સવિનય ઉપરોક્ત વિષય અન્વયે આપશ્રીને જણાવવાનું કે..."
                />
              </div>

              {/* Section 5: Signature */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Closing (સમાપન)</label>
                  <input
                    type="text"
                    value={letterData.closing}
                    onChange={(e) => handleFieldChange("closing", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Signature Name (સહી/નામ)</label>
                  <input
                    type="text"
                    value={letterData.signature}
                    onChange={(e) => handleFieldChange("signature", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD GENERAL LETTER FORM */
            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  Section 1: Header Details (પત્ર શિર્ષક)
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Institute Name (સંસ્થા નામ)</label>
                    <input
                      type="text"
                      value={letterData.instituteName}
                      onChange={(e) => handleFieldChange("instituteName", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">SI Name (કર્મચારી નામ)</label>
                      <input
                        type="text"
                        value={letterData.siName}
                        onChange={(e) => handleFieldChange("siName", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Designation (હોદ્દો)</label>
                      <input
                        type="text"
                        value={letterData.designation}
                        onChange={(e) => handleFieldChange("designation", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Date (તારીખ)</label>
                    <input
                      type="date"
                      value={letterData.date}
                      onChange={(e) => handleFieldChange("date", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  Section 2: Recipient (મેળવનાર સરનામું)
                </p>
                <textarea
                  rows={3}
                  value={letterData.recipient}
                  onChange={(e) => handleFieldChange("recipient", e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 leading-relaxed"
                />
              </div>

              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  Section 3: Subject (પત્ર વિષય)
                </p>
                <input
                  type="text"
                  value={letterData.subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  Section 4: Body (પત્ર વિગત)
                </p>
                <textarea
                  rows={6}
                  value={letterData.body}
                  onChange={(e) => handleFieldChange("body", e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide">Closing</p>
                  <input
                    type="text"
                    value={letterData.closing}
                    onChange={(e) => handleFieldChange("closing", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide">Signature</p>
                  <input
                    type="text"
                    value={letterData.signature}
                    onChange={(e) => handleFieldChange("signature", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview (Right Pane) - 7 Cols */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Action Bar */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-3xs">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              Official Government Master PDF Preview (A4)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1 border border-indigo-700"
              >
                <Printer size={12} /> Print (પ્રિન્ટ)
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isExportingPDF}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                {isExportingPDF ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                PDF Export
              </button>
              <button
                onClick={handleDownloadWord}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1 border border-blue-800"
              >
                <FileText size={12} /> Word Doc
              </button>
            </div>
          </div>

          {/* High Fidelity A4 Rendered Container */}
          <div className="bg-white border-2 border-slate-200 shadow-xl rounded-2xl p-8 md:p-12 min-h-[780px] flex flex-col justify-between relative text-black text-[13.5px]">
            <div className="absolute top-0 right-0 bg-indigo-50 border-b border-l border-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg">
              Official Master Format
            </div>

            <div dangerouslySetInnerHTML={{ __html: getLetterHtml(false) }} />
          </div>
        </div>

      </div>

      {/* DRAFTS MANAGER MODAL */}
      {showDraftsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FolderOpen size={18} className="text-indigo-600" />
                  Saved Report Drafts ({templateId === "hajar_report" ? "Hajar Report" : "General Letter"})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select a saved report draft to load, duplicate, or manage.
                </p>
              </div>
              <button
                onClick={() => setShowDraftsModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {draftsList.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FolderOpen size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No saved drafts for this template yet.</p>
                  <p className="text-[11px] text-slate-400">Use "Save As Draft" button in the top bar to save custom report versions.</p>
                </div>
              ) : (
                draftsList.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{draft.draftName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Last saved: {draft.lastSavedAt ? new Date(draft.lastSavedAt).toLocaleString('gu-IN') : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadDraft(draft)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id, draft.draftName)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Delete Draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDraftsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
