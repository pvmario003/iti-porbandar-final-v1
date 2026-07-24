import React, { useState, useEffect } from "react";
import { 
  Users, Layers, GraduationCap, Clock, Plus, Filter, Search, 
  ArrowUpDown, CheckCircle, ShieldAlert, BookOpen, ChevronDown, Check, FileSpreadsheet, Sparkles
} from "lucide-react";
import { 
  User, UserRole, Batch, BatchStatus, Student, StudentStatus, STUDENT_STATUS_LABELS 
} from "../types";
import { 
  getBatches, saveBatch, getStudents, addAuditLog, getTrades, generateId,
  getWorkingDays, getAttendance, saveAttendanceBatch, getUsers,
  getLetterTemplate, saveLetterTemplate
} from "../utils/storage";
import { exportForwardingLetterPDF, exportForwardingLetterWord, exportToWord, getGujaratiTradeName, getStudentIrregularityRemark, resolveLetterHtml } from "../utils/exportUtils";
import DashboardStatsCard from "./DashboardStatsCard";
import StudentProfileModal from "./StudentProfileModal";
import ImportStudentsModal from "./ImportStudentsModal";
import ExitedStudentsList from "./ExitedStudentsList";
import ItiLogo from "./ItiLogo";
import GeneralLetterModule from "./GeneralLetterModule";
import LeaveManagementModule from "./LeaveManagementModule";
import { ReportHistoryModule } from "./ReportHistoryModule";
import { saveGeneratedReport } from "../utils/storage";
import { GeneratedReport } from "../types";

interface SupervisorDashboardProps {
  onLogout: () => void;
  currentUser: User;
}

export default function SupervisorDashboard({ onLogout, currentUser }: SupervisorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "exited" | "attendance" | "forwarding_letter" | "general_letter" | "leave_management" | "report_history">("overview");
  const [lettersMenuOpen, setLettersMenuOpen] = useState(false);

  // Data State
  const [myBatches, setMyBatches] = useState<Batch[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [trades, setTrades] = useState<string[]>([]);
  const [allWorkingDays, setAllWorkingDays] = useState<any[]>([]);

  // Selected state for detailed profile
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal control states
  const [isImportingStudents, setIsImportingStudents] = useState(false);

  // Batch Switcher state
  const [selectedBatchSwitcherId, setSelectedBatchSwitcherId] = useState<string>("ALL");

  // Student filtering & sorting state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("ALL");
  const [studentSortField, setStudentSortField] = useState<"studentName" | "enrollmentNumber">("studentName");
  const [studentSortOrder, setStudentSortOrder] = useState<"asc" | "desc">("asc");
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentStatusFilter, selectedBatchSwitcherId]);

  // Attendance Entry States
  const [attMonth, setAttMonth] = useState("");
  const [attBatchId, setAttBatchId] = useState("");
  const [presentDaysInput, setPresentDaysInput] = useState<{ [studentId: string]: number }>({});

  // Attendance Forwarding & Letter Generator States
  const [attendanceSubTab, setAttendanceSubTab] = useState<"entry" | "forward">("entry");
  const [selectedLetterBatchId, setSelectedLetterBatchId] = useState("");
  const [selectedLetterMonth, setSelectedLetterMonth] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [letterSiName, setLetterSiName] = useState(currentUser.name);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [remarksState, setRemarksState] = useState<{ [candId: string]: string }>({});

  // Letter template editing states
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [letterTemplate, setLetterTemplate] = useState("");
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [missingPlaceholders, setMissingPlaceholders] = useState<string[]>([]);

  useEffect(() => {
    if (selectedLetterBatchId) {
      const saved = getLetterTemplate(selectedLetterBatchId);
      if (saved) {
        setLetterTemplate(saved);
      } else {
        setLetterTemplate(`તારીખ: {CURRENT_DATE}

પ્રતિ,
આચાર્યશ્રી,
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર.

વિષય : તાલીમાર્થીઓની અનિયમિતતા બાબતે.

માનનીય સાહેબશ્રી,

ઉપરોક્ત વિષય અન્વયે સવિનય સાથ જણાવવાનું કે ટ્રેડ {TRADE} ના બેચ નં. {BATCH} ના નીચે જણાવેલ {STUDENT_COUNT} તાલીમાર્થીઓ અનિયમિત છે, તો આ અંગે યોગ્ય કાર્યવાહી કરવા વિનંતી.

{STUDENT_TABLE}

આપનો વિશ્વાસુ,

{SIGNATURE_NAME}
{DESIGNATION}
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર`);
      }
    }
  }, [selectedLetterBatchId]);

  const handleSaveTemplate = () => {
    const missing = [];
    if (!letterTemplate.includes("{TRADE}")) missing.push("{TRADE}");
    if (!letterTemplate.includes("{BATCH}")) missing.push("{BATCH}");
    if (!letterTemplate.includes("{STUDENT_COUNT}")) missing.push("{STUDENT_COUNT}");
    if (!letterTemplate.includes("{STUDENT_TABLE}")) missing.push("{STUDENT_TABLE}");
    if (!letterTemplate.includes("{CURRENT_DATE}")) missing.push("{CURRENT_DATE}");

    if (missing.length > 0) {
      setMissingPlaceholders(missing);
      setShowSaveWarning(true);
    } else {
      executeSaveTemplate();
    }
  };

  const executeSaveTemplate = () => {
    saveLetterTemplate(selectedLetterBatchId, letterTemplate);
    setIsEditingTemplate(false);
    setShowSaveWarning(false);
    alert("Template saved successfully!");
  };

  const getResolvedLetterHtmlForWord = (templateText: string, options: {
    resolvedSiName: string,
    gujTradeName: string,
    dateFormatted: string,
    batchListString: string,
    irregularCandidatesCount: number,
    tableHtml?: string,
    irregularCandidates?: any[]
  }) => {
    return resolveLetterHtml(templateText, options);
  };

  const getOnScreenRenderedText = () => {
    const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
    if (!selectedBatch) return letterTemplate;

    const gujTradeName = getGujaratiTradeName(selectedBatch.tradeName);
    const dateFormatted = new Date(letterDate).toLocaleDateString('gu-IN');
    const batchListString = `${selectedBatch.batchNumber}-${selectedBatch.batchSection}`;

    // Resolve Gujarati Supervisor Name
    const localUsers = getUsers();
    const matchedUser = localUsers.find(
      u => u.name.trim().toLowerCase() === letterSiName.trim().toLowerCase() ||
           (u.supervisorNameEnglish && u.supervisorNameEnglish.trim().toLowerCase() === letterSiName.trim().toLowerCase()) ||
           (u.supervisorNameGujarati && u.supervisorNameGujarati.trim().toLowerCase() === letterSiName.trim().toLowerCase())
    );
    const resolvedSiName = matchedUser?.supervisorNameGujarati || matchedUser?.supervisorNameEnglish || matchedUser?.name || letterSiName;

    const records = getAttendance().filter(
      att => att.batchId === selectedLetterBatchId && att.month === selectedLetterMonth
    );
    const irregularCandidatesCount = records.filter(att => att.attendancePercentage < 80).length;

    let text = letterTemplate;
    text = text
      .replace(/{TRADE}/g, gujTradeName)
      .replace(/{BATCH}/g, batchListString)
      .replace(/{STUDENT_COUNT}/g, String(irregularCandidatesCount))
      .replace(/{CURRENT_DATE}/g, dateFormatted)
      .replace(/{SIGNATURE_NAME}/g, resolvedSiName)
      .replace(/{DESIGNATION}/g, `સુ. ઇ. ${gujTradeName}`);

    return text;
  };

  const handleRemarkChange = (cand: any, newRemark: string) => {
    setRemarksState(prev => ({ ...prev, [cand.id]: newRemark }));
  };

  const handleSaveRemarks = (candidates: any[]) => {
    const recordsToUpdate: any[] = [];
    candidates.forEach(cand => {
      if (remarksState[cand.id] !== undefined) {
        recordsToUpdate.push({ ...cand, remark: remarksState[cand.id] });
      }
    });
    if (recordsToUpdate.length > 0) {
      saveAttendanceBatch(recordsToUpdate);
      alert("તાલીમાર્થી રિમાર્ક્સ સુપાબેઝ સક્ષમ ડેટાબેઝમાં સફળતાપૂર્વક સેવ થયા.");
    } else {
      alert("કોઈ નવો રિમાર્ક્સ ફેરફાર સેવ કરવા માટે મળ્યો નથી.");
    }
  };

  useEffect(() => {
    loadMyData();
  }, [currentUser]);

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

      // Ctrl + / focuses student search
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("student-search-input");
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
        return;
      }

      if (isTyping) {
        if (e.key === "Escape") {
          (activeEl as HTMLElement).blur();
          setSelectedStudent(null);
        }
        return;
      }

      // Alt Shortcuts for quick tab switching
      if (e.altKey) {
        e.preventDefault();
        switch (e.key.toLowerCase()) {
          case "o":
          case "1":
            setActiveTab("overview");
            break;
          case "s":
          case "2":
            setActiveTab("students");
            break;
          case "e":
          case "3":
            setActiveTab("exited");
            break;
          case "a":
          case "4":
            setActiveTab("attendance");
            break;
          case "q":
            onLogout();
            break;
        }
      } else if (e.key === "Escape") {
        setSelectedStudent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onLogout]);

  const loadMyData = () => {
    // 1. Get batches assigned to this S.I. by Admin
    const allBatches = getBatches();
    const filteredBatches = allBatches.filter(b => b.assignedSIId === currentUser.id && b.status === BatchStatus.APPROVED);
    setMyBatches(filteredBatches);

    // 2. Get students belonging to any of these batches
    const myBatchIds = filteredBatches.map(b => b.id);
    const allStudents = getStudents();
    const filteredStudents = allStudents.filter(s => myBatchIds.includes(s.batchId));
    setMyStudents(filteredStudents);

    // 3. Load Trades
    const allTrades = getTrades();
    setTrades(allTrades.map(t => t.name));

    // 4. Load Working Days configuration
    setAllWorkingDays(getWorkingDays());
  };

  const handlePrintLetter = () => {
    const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
    if (!selectedBatch) return;

    // Find submitted attendance records
    const records = getAttendance().filter(
      att => att.batchId === selectedLetterBatchId && att.month === selectedLetterMonth
    );

    if (records.length === 0) {
      alert("No attendance records found for trade and period.");
      return;
    }

    const irregularCandidates = records.filter(att => att.attendancePercentage < 80);
    const dateFormatted = new Date(letterDate).toLocaleDateString('gu-IN');
    const gujTradeName = getGujaratiTradeName(selectedBatch.tradeName);

    const batchListString = `${selectedBatch.batchNumber}-${selectedBatch.batchSection}`;

    // Resolve Gujarati Supervisor Name
    const localUsers = getUsers();
    const matchedUser = localUsers.find(
      u => u.name.trim().toLowerCase() === letterSiName.trim().toLowerCase() ||
           (u.supervisorNameEnglish && u.supervisorNameEnglish.trim().toLowerCase() === letterSiName.trim().toLowerCase()) ||
           (u.supervisorNameGujarati && u.supervisorNameGujarati.trim().toLowerCase() === letterSiName.trim().toLowerCase())
    );
    const resolvedSiName = matchedUser?.supervisorNameGujarati || matchedUser?.supervisorNameEnglish || matchedUser?.name || letterSiName;

    const resolvedLetterHtml = getResolvedLetterHtmlForWord(letterTemplate, {
      resolvedSiName,
      gujTradeName,
      dateFormatted,
      batchListString,
      irregularCandidatesCount: irregularCandidates.length,
      irregularCandidates: irregularCandidates
    });

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.right = '0';
    printWindow.style.bottom = '0';
    printWindow.style.width = '0';
    printWindow.style.height = '0';
    printWindow.style.border = '0';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Forwarding Letter - ITI Porbandar</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Inter:wght@400;600;700;800&display=swap');
            
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
            ${resolvedLetterHtml}
          </div>
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

  const handleDownloadLetterPDF = () => {
    const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
    if (!selectedBatch) return;

    const records = getAttendance().filter(
      att => att.batchId === selectedLetterBatchId && att.month === selectedLetterMonth
    );

    if (records.length === 0) {
      alert("No attendance records found to export.");
      return;
    }

    const irregularCandidates = records.filter(att => att.attendancePercentage < 80);

    const pdfBatchString = `${selectedBatch.batchNumber}-${selectedBatch.batchSection}`;

    exportForwardingLetterPDF(
      selectedBatch.tradeName,
      pdfBatchString,
      letterDate,
      letterSiName,
      irregularCandidates,
      `Forwarding_Letter_${selectedBatch.tradeName.replace(/\s+/g, '_')}_${selectedLetterMonth}`,
      letterTemplate
    );

    const reportRecordPDF: GeneratedReport = {
      id: "rep-" + generateId(),
      reportType: "FORWARDING_LETTER",
      reportName: `Forwarding Letter - ${selectedBatch.tradeName} (${selectedLetterMonth})`,
      generatedAt: new Date().toISOString(),
      trade: selectedBatch.tradeName,
      batch: pdfBatchString,
      month: selectedLetterMonth,
      academicSession: selectedBatch.academicSession || "2026-2027",
      generatedBy: currentUser.name,
      generatedByRole: currentUser.role,
      dataSnapshot: {
        letterTemplate,
        selectedLetterBatchId,
        selectedLetterMonth,
        letterDate,
        letterSiName,
        irregularCandidates
      },
      fileType: "pdf"
    };
    saveGeneratedReport(reportRecordPDF);
  };

  const handleDownloadLetterWord = () => {
    const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
    if (!selectedBatch) return;

    const records = getAttendance().filter(
      att => att.batchId === selectedLetterBatchId && att.month === selectedLetterMonth
    );

    if (records.length === 0) {
      alert("No attendance records found to export.");
      return;
    }

    const irregularCandidates = records.filter(att => att.attendancePercentage < 80);
    const batchListString = `${selectedBatch.batchNumber}-${selectedBatch.batchSection}`;

    exportForwardingLetterWord(
      selectedBatch.tradeName,
      batchListString,
      letterDate,
      letterSiName,
      irregularCandidates,
      `Forwarding_Letter_${selectedBatch.tradeName.replace(/\s+/g, '_')}_${selectedLetterMonth}`,
      letterTemplate
    );

    const reportRecordWord: GeneratedReport = {
      id: "rep-" + generateId(),
      reportType: "FORWARDING_LETTER",
      reportName: `Forwarding Letter - ${selectedBatch.tradeName} (${selectedLetterMonth})`,
      generatedAt: new Date().toISOString(),
      trade: selectedBatch.tradeName,
      batch: batchListString,
      month: selectedLetterMonth,
      academicSession: selectedBatch.academicSession || "2026-2027",
      generatedBy: currentUser.name,
      generatedByRole: currentUser.role,
      dataSnapshot: {
        letterTemplate,
        selectedLetterBatchId,
        selectedLetterMonth,
        letterDate,
        letterSiName,
        irregularCandidates
      },
      fileType: "word"
    };
    saveGeneratedReport(reportRecordWord);
  };

  // Switch Batch Switcher Helper
  const handleBatchSwitcherChange = (id: string) => {
    setSelectedBatchSwitcherId(id);
  };

  // Get current active/exited metrics for S.I.
  const myBatchIds = myBatches.map(b => b.id);
  const myApprovedBatchIds = myBatches.filter(b => b.status === BatchStatus.APPROVED).map(b => b.id);
  
  const totalMyBatches = myBatches.length;
  const totalMyStudents = myStudents.length;
  const activeStudentsCount = myStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
  const exitedStudentsCount = myStudents.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;

  // Filter students based on Batch Switcher and Search/Status Filters
  const displayedStudents = myStudents.filter(student => {
    // 1. Batch Switcher Filter
    if (selectedBatchSwitcherId !== "ALL" && student.batchId !== selectedBatchSwitcherId) {
      return false;
    }

    // 2. Search Box Match (Name, enrollment, student phone, parent phone)
    const fullName = `${student.studentName} ${student.fatherName} ${student.surname}`.toLowerCase();
    const searchLower = studentSearch.toLowerCase();
    const matchesSearch = 
      studentSearch === "" ||
      fullName.includes(searchLower) ||
      student.enrollmentNumber.toLowerCase().includes(searchLower) ||
      student.studentMobileNumber.includes(searchLower) ||
      student.parentMobileNumber.includes(searchLower) ||
      (student.cmdDepositNumber || "").toLowerCase().includes(searchLower);

    // 3. Status Filter
    const matchesStatus = 
      studentStatusFilter === "ALL" || 
      (studentStatusFilter === "ACTIVE" && student.currentStatus === StudentStatus.ACTIVE) ||
      (studentStatusFilter === "EXITED" && student.currentStatus !== StudentStatus.ACTIVE);

    return matchesSearch && matchesStatus;
  });

  // Handle Sort Toggle
  const handleSortToggle = (field: "studentName" | "enrollmentNumber") => {
    if (studentSortField === field) {
      setStudentSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setStudentSortField(field);
      setStudentSortOrder("asc");
    }
  };

  // Sort displayed students
  const sortedStudents = [...displayedStudents].sort((a, b) => {
    let valA = a[studentSortField].toLowerCase();
    let valB = b[studentSortField].toLowerCase();

    if (studentSortField === "studentName") {
      valA = `${a.studentName} ${a.surname}`.toLowerCase();
      valB = `${b.studentName} ${b.surname}`.toLowerCase();
    }

    if (valA < valB) return studentSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return studentSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const STUDENTS_PER_PAGE = 25;
  const paginatedStudents = sortedStudents.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans lg:h-screen lg:overflow-hidden">
      
      {/* Header Banner */}
      <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 p-1 bg-white border border-[#E5E7EB] rounded-full flex items-center justify-center shadow-xs shrink-0">
            <ItiLogo className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-sm lg:text-base font-extrabold leading-none text-[#0F172A] tracking-tight font-display">
              ITI Porbandar Management System
            </h1>
            <p className="text-[9px] lg:text-[10px] text-[#4B5563] font-bold uppercase tracking-wider mt-0.5">
              Government of Gujarat • Supervisor Instructor Workstation, Porbandar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex bg-[#F3F4F6] p-1 rounded-full">
            <button className="px-3 py-1 text-[11px] font-bold bg-white shadow-xs rounded-full text-[#2563EB]">EN</button>
            <button className="px-3 py-1 text-[11px] font-semibold text-[#6B7280]">ગુજરાતી</button>
          </div>
          
          {/* Notifications Icon & Profile Section */}
          <div className="flex items-center gap-4 pl-4 border-l border-[#E5E7EB]">
            <button className="relative p-1.5 hover:bg-[#F3F4F6] rounded-full transition-all flex items-center justify-center cursor-pointer text-[#4B5563] hover:text-[#2563EB]">
              <span className="material-symbols-rounded text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-3xl text-[#94A3B8] select-none">account_circle</span>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[#0F172A] leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider mt-0.5">
                  Supervisor Instructor
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#0F172A] border border-[#E5E7EB] rounded-full text-xs font-bold transition-all shadow-3xs cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Sidebar + Body */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
          <nav className="space-y-1">
            {[
              { id: "overview", label: "My Dashboard & Batches", icon: "dashboard" },
              { id: "students", label: "Student List Explorer", icon: "school" },
              { id: "exited", label: "Exited Students", icon: "logout" },
              { id: "attendance", label: "Monthly Attendance Entry", icon: "calendar_today" },
              { id: "leave_management", label: "Leave Module (રજા મોડ્યુલ)", icon: "badge" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  loadMyData();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50" 
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <span className="material-symbols-rounded text-lg">{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
              </button>
            ))}

            {/* Collapsible Letters Menu */}
            <div className="pt-1.5 border-t border-slate-100 mt-1.5">
              <button
                type="button"
                onClick={() => setLettersMenuOpen(!lettersMenuOpen)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                  (activeTab === "attendance" && attendanceSubTab === "forward") || activeTab === "general_letter"
                    ? "bg-indigo-50/40 text-indigo-700 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <span className="material-symbols-rounded text-lg">description</span>
                <span className="flex-1">Letters</span>
                <span className="material-symbols-rounded text-sm transition-transform duration-200" style={{ transform: lettersMenuOpen || (activeTab === "attendance" && attendanceSubTab === "forward") || activeTab === "general_letter" ? "rotate(180deg)" : "none" }}>
                  expand_more
                </span>
              </button>

              {(lettersMenuOpen || (activeTab === "attendance" && attendanceSubTab === "forward") || activeTab === "general_letter") && (
                <div className="pl-6 mt-1 space-y-1 animate-fadeIn">
                  <button
                    onClick={() => {
                      setActiveTab("attendance");
                      setAttendanceSubTab("forward");
                      setIsGeneratingLetter(false);
                      loadMyData();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all text-left cursor-pointer ${
                      activeTab === "attendance" && attendanceSubTab === "forward"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base">forward</span>
                    <span className="flex-1">Forwarding Letter</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("general_letter");
                      loadMyData();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all text-left cursor-pointer ${
                      activeTab === "general_letter"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base">edit_note</span>
                    <span className="flex-1">General Letter</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("general_letter");
                      loadMyData();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all text-left cursor-pointer text-slate-500 hover:bg-slate-50`}
                  >
                    <span className="material-symbols-rounded text-base font-bold text-indigo-600">assignment_turned_in</span>
                    <span className="flex-1 font-bold text-slate-700">Hajar Report (હાજર રિપોર્ટ)</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
          
          <div className="mt-auto pt-4 border-t border-slate-100 hidden lg:block">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-3xs">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs font-bold text-slate-700">SI Panel Online</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Bento Grid Layout */}
              <div className="grid grid-cols-12 gap-4">
                
                {/* Stat Cards - Bento Styled */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#2563EB]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Total Batches</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-slate-800">{totalMyBatches}</span>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-md border border-[#2563EB]/20">Registered Groups</span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#06B6D4]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Managed Students</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-slate-800">{totalMyStudents}</span>
                    <span className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-md border border-[#06B6D4]/20">Students Sum</span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#10B981]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#10B981]">{activeStudentsCount}</span>
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md border border-[#10B981]/20">ON-ROLL</span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#F59E0B]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exited / Cut Students</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#F59E0B]">{exitedStudentsCount}</span>
                    <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-md border border-[#F59E0B]/20">Exited List</span>
                  </div>
                </div>

                {/* Row 2: Right-hand custom Actions panel and main Left-hand content */}
                {/* Action Buttons Block */}
                <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-3xs border-t-4 border-t-[#2563EB]">
                  <div>
                    <h3 className="text-slate-900 font-black text-sm mb-1 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      S.I. Workstation Tasks
                    </h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed mt-2 font-semibold">
                      Manage student registry, status history, and import student rosters easily using our excel utility for your assigned batches.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (myApprovedBatchIds.length === 0) {
                          alert("You do not have any assigned batches yet. You cannot import students until Admin assigns at least one batch.");
                          return;
                        }
                        setIsImportingStudents(true);
                      }}
                      className="w-full py-2.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-transparent"
                    >
                      <span className="material-symbols-rounded text-base">upload_file</span> Import Students (XLSX)
                    </button>
                  </div>
                </div>

                {/* Instructions / Status Panel */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-3xs p-5 flex flex-col justify-between min-h-[180px]">
                  <div className="space-y-2">
                    <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider">S.I. Instructor Code of Conduct</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                      You must maintain the correctness of bilingual Gujarati unicode text for candidate profiles (e.g., student name, parent name) to ensure no mismatches in records.
                    </p>
                    <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                      For any status changes (Left, Resigned, Passout), make sure to upload/submit necessary approvals through the Student Profile dialog.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Current Academic Period</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">2026-2027</span>
                  </div>
                </div>

              </div>

            {/* My Batches Showcase list */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                My Assigned Batches Overview ({totalMyBatches})
              </h3>

              {totalMyBatches === 0 ? (
                <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center">
                  <Layers size={36} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No batches assigned yet</p>
                  <p className="text-xs text-slate-400 mt-1">Please contact the Institute Administrator to allot active training batches to your S.I. account.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {myBatches.map(batch => {
                    const batchStus = myStudents.filter(s => s.batchId === batch.id);
                    const activeCount = batchStus.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
                    const exitedCount = batchStus.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;
                    
                    return (
                      <div 
                        key={batch.id} 
                        className={`p-4 bg-white rounded-2xl border flex flex-col justify-between gap-3 shadow-3xs transition-all hover:shadow-xs ${
                          batch.status === BatchStatus.APPROVED 
                            ? "border-slate-200" 
                            : batch.status === BatchStatus.PENDING 
                              ? "border-amber-200 bg-amber-50/5" 
                              : "border-red-100 bg-red-50/5 opacity-75"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
                              batch.status === BatchStatus.APPROVED 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : batch.status === BatchStatus.PENDING 
                                  ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                  : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {batch.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              Shift {batch.shift}
                            </span>
                          </div>

                          <h4 className="text-lg font-extrabold text-slate-900 leading-none pt-1">
                            {batch.displayName}
                          </h4>
                          
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            Trade: {batch.tradeName}
                          </p>

                          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Total</span>
                              <span className="text-sm font-extrabold text-slate-800">{batchStus.length}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-emerald-500 block uppercase">Active</span>
                              <span className="text-sm font-extrabold text-emerald-600">{activeCount}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-amber-500 block uppercase">Exited</span>
                              <span className="text-sm font-extrabold text-amber-600">{exitedCount}</span>
                            </div>
                          </div>
                        </div>

                        {batch.status === BatchStatus.APPROVED && (
                          <button
                            onClick={() => {
                              setSelectedBatchSwitcherId(batch.id);
                              setActiveTab("students");
                            }}
                            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                          >
                            Open Batch →
                          </button>
                        )}
                        {batch.status === BatchStatus.PENDING && (
                          <div className="text-[10px] text-amber-700 italic text-center py-1 bg-amber-50 rounded-lg">
                            Awaiting Admin approval
                          </div>
                        )}
                        {batch.status === BatchStatus.REJECTED && (
                          <div className="text-[10px] text-red-700 italic text-center py-1 bg-red-50 rounded-lg">
                            Request rejected by Admin
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* STUDENTS LIST TAB */}
        {activeTab === "students" && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Batch Switcher and Filtering Board */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-3xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Batch:</span>
                  <div className="relative">
                    <select
                      value={selectedBatchSwitcherId}
                      onChange={e => handleBatchSwitcherChange(e.target.value)}
                      className="pl-3 pr-8 py-1 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="ALL">All My Batches</option>
                      {myBatches.filter(b => b.status === "APPROVED").map(b => (
                        <option key={b.id} value={b.id}>{b.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-400">
                  Total Active Approved Batches: {myApprovedBatchIds.length}
                </div>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    id="student-search-input"
                    type="text"
                    placeholder="Search by name, ENR, phone..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white shadow-3xs"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={studentStatusFilter}
                    onChange={e => setStudentStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">ACTIVE ONLY</option>
                    <option value="EXITED">EXITED ONLY</option>
                  </select>
                </div>

                {/* Sort dropdown */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSortToggle("studentName")}
                    className={`flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 bg-white cursor-pointer ${
                      studentSortField === "studentName" ? "border-slate-900 text-slate-900 bg-slate-50" : "text-slate-500"
                    }`}
                  >
                    Sort by Name <ArrowUpDown size={12} />
                  </button>
                  <button
                    onClick={() => handleSortToggle("enrollmentNumber")}
                    className={`flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 bg-white cursor-pointer ${
                      studentSortField === "enrollmentNumber" ? "border-slate-900 text-slate-900 bg-slate-50" : "text-slate-500"
                    }`}
                  >
                    Sort by ENR <ArrowUpDown size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count & Quick Actions */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Showing {sortedStudents.length} of {displayedStudents.length} filtered students</span>
              {selectedBatchSwitcherId !== "ALL" && (
                <button
                  onClick={() => setIsImportingStudents(true)}
                  className="text-slate-900 hover:text-slate-700 font-bold underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet size={13} /> Import here
                </button>
              )}
            </div>

            {/* Students Table */}
            {sortedStudents.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                <GraduationCap size={44} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No students registered in this batch view</p>
                <p className="text-xs text-slate-400 mt-1">Click the "Import Students" button at the top to upload an Excel/CSV spreadsheet.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">S.N.</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Enrollment Number</th>
                        <th className="p-3">Batch & Trade</th>
                        <th className="p-3">Student Mobile</th>
                        <th className="p-3">Parent Mobile</th>
                        <th className="p-3">Current Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {paginatedStudents.map((student, idx) => {
                        const label = STUDENT_STATUS_LABELS[student.currentStatus];
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/40">
                            <td className="p-3 font-mono text-slate-400">{(studentPage - 1) * STUDENTS_PER_PAGE + idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{student.studentName} {student.surname}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{student.gender}</div>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{student.enrollmentNumber}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{student.batchName}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{student.trade}</div>
                            </td>
                            <td className="p-3 font-mono text-slate-500">{student.studentMobileNumber || "-"}</td>
                            <td className="p-3 font-mono text-slate-500">{student.parentMobileNumber || "-"}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                student.currentStatus === StudentStatus.ACTIVE 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {label.gu} ({label.en})
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                              >
                                Open Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {sortedStudents.length > STUDENTS_PER_PAGE && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        disabled={studentPage === 1}
                        onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                        className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        disabled={studentPage * STUDENTS_PER_PAGE >= sortedStudents.length}
                        onClick={() => setStudentPage(p => p + 1)}
                        className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-700">
                          Showing <span className="font-extrabold">{(studentPage - 1) * STUDENTS_PER_PAGE + 1}</span> to{" "}
                          <span className="font-extrabold">
                            {Math.min(studentPage * STUDENTS_PER_PAGE, sortedStudents.length)}
                          </span>{" "}
                          of <span className="font-extrabold">{sortedStudents.length}</span> students filtered
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-3xs" aria-label="Pagination">
                          <button
                            disabled={studentPage === 1}
                            onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                            className="relative inline-flex items-center rounded-l-md px-2.5 py-1.5 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <span>&larr; Prev</span>
                          </button>
                          
                          {Array.from({ length: Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE) }).map((_, index) => {
                            const pageNum = index + 1;
                            if (
                              pageNum === 1 ||
                              pageNum === Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE) ||
                              Math.abs(pageNum - studentPage) <= 1
                            ) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setStudentPage(pageNum)}
                                  className={`relative inline-flex items-center px-3.5 py-1.5 text-xs font-extrabold focus:z-20 cursor-pointer ${
                                    studentPage === pageNum
                                      ? "z-10 bg-indigo-600 text-white"
                                      : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                            if (
                              pageNum === 2 ||
                              pageNum === Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE) - 1
                            ) {
                              return (
                                <span
                                  key={pageNum}
                                  className="relative inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}

                          <button
                            disabled={studentPage * STUDENTS_PER_PAGE >= sortedStudents.length}
                            onClick={() => setStudentPage(p => p + 1)}
                            className="relative inline-flex items-center rounded-r-md px-2.5 py-1.5 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <span>Next &rarr;</span>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* EXITED STUDENTS ARCHIVE */}
        {activeTab === "exited" && (
          <div className="space-y-4 animate-fadeIn">
            <ExitedStudentsList 
              onOpenProfile={(stu) => setSelectedStudent(stu)}
              allowedBatchIds={myBatchIds}
            />
          </div>
        )}

        {/* MONTHLY ATTENDANCE ENTRY TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Monthly Trainee Attendance Portal</h2>
              <p className="text-xs text-slate-500 font-medium">Enter daily trainee presence metrics or generate/forward official monthly irregularity reports to the administration office.</p>
            </div>

            {/* Sub-tabs for Attendance */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setAttendanceSubTab("entry")}
                className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all cursor-pointer ${
                  attendanceSubTab === "entry"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                1. Monthly Attendance Entry (હાજરી પત્રક પૂરવું)
              </button>
              <button
                onClick={() => {
                  setAttendanceSubTab("forward");
                  setIsGeneratingLetter(false);
                }}
                className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all cursor-pointer ${
                  attendanceSubTab === "forward"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                2. Irregularity Letter & Forwarding (ગેરહાજર અહેવાલ ફોરવર્ડ)
              </button>
            </div>

            {attendanceSubTab === "entry" ? (
              <div className="space-y-6">
                {/* Selector panel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. Select Trade (વ્યવસાય પસંદ કરો)</label>
                      <select
                        onChange={e => {
                          const firstBatchOfTrade = myBatches.find(b => b.tradeName === e.target.value);
                          setAttBatchId(firstBatchOfTrade ? firstBatchOfTrade.id : "");
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Trade --</option>
                        {Array.from(new Set(myBatches.map(b => b.tradeName))).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. Select Batch (બેચ પસંદ કરો)</label>
                      <select
                        value={attBatchId}
                        onChange={e => {
                          setAttBatchId(e.target.value);
                          setPresentDaysInput({});
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Batch --</option>
                        {myBatches.map(b => (
                          <option key={b.id} value={b.id}>{b.tradeName} - {b.batchNumber}{b.batchSection}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">3. Select Month (માસ પસંદ કરો)</label>
                      <select
                        value={attMonth}
                        onChange={e => {
                          setAttMonth(e.target.value);
                          setPresentDaysInput({});
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Month --</option>
                        {allWorkingDays.map(wd => (
                          <option key={wd.id} value={wd.id}>{wd.month} ({wd.workingDays} Working Days) - {wd.academicYear}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Attendance Sheet */}
                {(() => {
                  const selectedWdConfig = allWorkingDays.find(wd => wd.id === attMonth);
                  const selectedBatch = myBatches.find(b => b.id === attBatchId);

                  if (!selectedWdConfig || !selectedBatch) {
                    return (
                      <div className="bg-slate-100 p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-medium text-xs">
                        Please select both a Batch and a Configured Month to load the trainee attendance sheet.
                      </div>
                    );
                  }

                  const workingDays = selectedWdConfig.workingDays;
                  const batchStudents = myStudents.filter(s => s.batchId === selectedBatch.id && s.currentStatus === StudentStatus.ACTIVE);

                  if (batchStudents.length === 0) {
                    return (
                      <div className="bg-slate-100 p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-medium text-xs">
                        No active students found in the selected batch.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Active Attendance Sheet</p>
                          <p className="text-sm font-black text-indigo-950 mt-1">
                            Batch: {selectedBatch.tradeName} - {selectedBatch.batchNumber}{selectedBatch.batchSection} • Period: {selectedWdConfig.month} ({selectedWdConfig.academicYear})
                          </p>
                        </div>
                        <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider">Total Working Days</p>
                          <p className="text-lg font-black">{workingDays}</p>
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        for (const s of batchStudents) {
                          const present = presentDaysInput[s.id] ?? 0;
                          if (present < 0 || present > workingDays) {
                            alert(`Invalid attendance value for ${s.studentName}. Must be between 0 and ${workingDays}.`);
                            return;
                          }
                        }

                        const records = batchStudents.map(student => {
                          const present = presentDaysInput[student.id] ?? 0;
                          const pct = parseFloat(((present / workingDays) * 100).toFixed(2));
                          return {
                            id: "att-" + generateId() + "-" + student.id + "-" + selectedWdConfig.month.replace(/\s+/g, ""),
                            studentId: student.id,
                            studentName: `${student.studentName} ${student.surname}`,
                            enrollmentNumber: student.enrollmentNumber,
                            batchId: selectedBatch.id,
                            batchName: `${selectedBatch.tradeName} - ${selectedBatch.batchNumber}${selectedBatch.batchSection}`,
                            trade: student.trade,
                            month: selectedWdConfig.month,
                            academicYear: selectedWdConfig.academicYear,
                            workingDays: workingDays,
                            presentDays: present,
                            attendancePercentage: pct
                          };
                        });

                        saveAttendanceBatch(records);
                        addAuditLog(currentUser.name, `Submitted attendance for ${selectedBatch.tradeName} (${selectedWdConfig.month})`);
                        alert("Attendance sheet submitted successfully!");
                        setAttMonth("");
                        setAttBatchId("");
                        setPresentDaysInput({});
                        loadMyData();
                      }} className="space-y-4">
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="p-3 w-12 text-center">Sr.</th>
                                  <th className="p-3">Trainee Name</th>
                                  <th className="p-3">Enrollment Number</th>
                                  <th className="p-3 text-center w-40">Present Days (હાજર દિવસો)</th>
                                  <th className="p-3 text-center w-36">Attendance %</th>
                                  <th className="p-3 text-center w-36">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                                {batchStudents.map((student, idx) => {
                                  const present = presentDaysInput[student.id] ?? 0;
                                  const pct = parseFloat(((present / workingDays) * 100).toFixed(2)) || 0;
                                  const isEligible = pct >= 80;

                                  return (
                                    <tr key={student.id} className="hover:bg-slate-50/20">
                                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                      <td className="p-3">
                                        <p className="font-bold text-slate-900">{student.studentName} {student.surname}</p>
                                      </td>
                                      <td className="p-3 font-mono text-slate-500">{student.enrollmentNumber}</td>
                                      <td className="p-3 text-center">
                                        <div className="inline-flex items-center gap-2">
                                          <input
                                            type="number"
                                            min={0}
                                            max={workingDays}
                                            required
                                            value={presentDaysInput[student.id] ?? ""}
                                            onChange={e => {
                                              const val = Math.min(workingDays, Math.max(0, parseInt(e.target.value) || 0));
                                              setPresentDaysInput(prev => ({
                                                ...prev,
                                                [student.id]: val
                                              }));
                                            }}
                                            placeholder="0"
                                            className="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                          <span className="text-[10px] text-slate-400 font-bold">/ {workingDays}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={`text-sm font-black ${isEligible ? "text-emerald-600" : "text-rose-600"}`}>
                                          {pct.toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                          isEligible
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            : "bg-rose-50 text-rose-700 border border-rose-100"
                                        }`}>
                                          {isEligible ? "Eligible" : "Below Required"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAttMonth("");
                              setAttBatchId("");
                              setPresentDaysInput({});
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 rounded-xl transition-all cursor-pointer"
                          >
                            Reset Sheet
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                          >
                            Submit Attendance Records
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Letter Selection Panel */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-3xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Batch (બેચ પસંદ કરો)</label>
                    <select
                      value={selectedLetterBatchId}
                      onChange={e => {
                        setSelectedLetterBatchId(e.target.value);
                        setIsGeneratingLetter(false);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Batch --</option>
                      {myBatches.map(b => (
                        <option key={b.id} value={b.id}>{b.tradeName} - {b.batchNumber}{b.batchSection}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Month (માસ પસંદ કરો)</label>
                    <select
                      value={selectedLetterMonth}
                      onChange={e => {
                        setSelectedLetterMonth(e.target.value);
                        setIsGeneratingLetter(false);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Month --</option>
                      {allWorkingDays.map(wd => (
                        <option key={wd.id} value={wd.month}>{wd.month} ({wd.workingDays} Working Days) - {wd.academicYear}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedLetterBatchId && selectedLetterMonth && !isGeneratingLetter && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        setIsGeneratingLetter(true);
                        setLetterDate(new Date().toISOString().split('T')[0]);
                        
                        try {
                          const users = getUsers();
                          const fullUserObj = users.find(u => u.id === currentUser.id);
                          setLetterSiName(fullUserObj?.supervisorNameGujarati || currentUser.name);
                        } catch (err) {
                          setLetterSiName(currentUser.name);
                        }
                      }}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Sparkles size={14} /> Generate Government Letter (અહેવાલ જનરેટ કરો)
                    </button>
                  </div>
                )}

                {isGeneratingLetter && (() => {
                  const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
                  if (!selectedBatch) return null;

                  // Find submitted attendance records
                  const records = getAttendance().filter(
                    att => att.batchId === selectedLetterBatchId && att.month === selectedLetterMonth
                  );

                  if (records.length === 0) {
                    return (
                      <div className="p-8 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-center font-bold text-xs">
                        ⚠️ No attendance records found for trade: {selectedBatch.tradeName} and period: {selectedLetterMonth}.
                        <p className="text-[11px] font-medium text-amber-600 mt-1">Please enter and submit attendance for this month first before forwarding.</p>
                      </div>
                    );
                  }

                  // Filter irregular candidates (below 80% attendance)
                  const irregularCandidates = records.filter(att => att.attendancePercentage < 80);

                  // Find full sibling batch string for the trade
                  const siblingBatches = myBatches.filter(b => b.tradeName === selectedBatch.tradeName);
                  const batchListString = siblingBatches.map(b => `${b.batchNumber}-${b.batchSection}`).join(', ');

                  return (
                    <div className="space-y-6">
                      {/* Interactive Editor Fields */}
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <h3 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                            ✍️ Government Letter Meta Details (પત્ર વિગતો ફેરફાર કરો)
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-indigo-200"
                          >
                            📝 {isEditingTemplate ? "Hide Template Editor (સંપાદક છુપાવો)" : "Edit Letter Template (પત્ર સંપાદિત કરો)"}
                          </button>
                        </div>

                        {/* Interactive Template Plaintext Editor */}
                        {isEditingTemplate && (
                          <div className="bg-slate-50 p-4 border border-indigo-100 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-slate-600 uppercase">
                                Letter Template Plain Text Editor (પત્ર નમૂનો સંપાદક)
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to restore the default forwarding letter template?")) {
                                      setLetterTemplate(`તારીખ: {CURRENT_DATE}

પ્રતિ,
આચાર્યશ્રી,
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર.

વિષય : તાલીમાર્થીઓની અનિયમિતતા બાબતે.

માનનીય સાહેબશ્રી,

ઉપરોક્ત વિષય અન્વયે સવિનય સાથ જણાવવાનું કે ટ્રેડ {TRADE} ના બેચ નં. {BATCH} ના નીચે જણાવેલ {STUDENT_COUNT} તાલીમાર્થીઓ અનિયમિત છે, તો આ અંગે યોગ્ય કાર્યવાહી કરવા વિનંતી.

{STUDENT_TABLE}

આપનો વિશ્વાસુ,

{SIGNATURE_NAME}
{DESIGNATION}
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર`);
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[9px] font-bold rounded border border-amber-200 transition-all cursor-pointer"
                                >
                                  Reset to Default (ડિફોલ્ટ કરો)
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveTemplate}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded shadow-xs transition-all cursor-pointer"
                                >
                                  Save Template (સાચવો)
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={15}
                              value={letterTemplate}
                              onChange={(e) => setLetterTemplate(e.target.value)}
                              className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono bg-white text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="પત્ર ની વિગતો અહીં લખો..."
                            />

                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <h5 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                                Allowed Placeholders (માન્ય રાખેલ બદલી વિગતો - આ લખાણમાં વાપરી શકાય છે):
                              </h5>
                              <div className="flex flex-wrap gap-1.5 text-[9px]">
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Trade Name">{`{TRADE}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Batch list">{`{BATCH}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Student count">{`{STUDENT_COUNT}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Student table location">{`{STUDENT_TABLE}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Current letter date">{`{CURRENT_DATE}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Supervisor Name">{`{SIGNATURE_NAME}`}</code>
                                <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-100" title="Supervisor Designation">{`{DESIGNATION}`}</code>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-2 font-semibold">
                                * Note: Do NOT modify the placeholder names inside the curly braces. They will be automatically replaced with live data when exporting or printing.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Save warning details if a placeholder is missing */}
                        {showSaveWarning && (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-base">⚠️</span>
                              <div>
                                <h4 className="text-xs font-bold text-rose-800">Missing Placeholders Warning! (ખોવાયેલ બદલી વિગતોની ચેતવણી)</h4>
                                <p className="text-[10px] text-rose-700 mt-0.5 leading-normal">
                                  The following essential placeholder tags are missing from your edited letter template:
                                  <span className="font-mono font-bold ml-1">{missingPlaceholders.join(', ')}</span>.
                                </p>
                                <p className="text-[10px] text-rose-600 mt-1">
                                  Deleting these placeholders means they will not be updated dynamically with live batch details or student tables in the final PDF, Word, or Print document. Are you sure you want to save anyway?
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setShowSaveWarning(false)}
                                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded border border-slate-300 cursor-pointer"
                              >
                                Go Back & Edit (સુધારો કરો)
                              </button>
                              <button
                                type="button"
                                onClick={executeSaveTemplate}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded shadow-xs cursor-pointer"
                              >
                                Save Anyway (તેમ છતાં સાચવો)
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Date (તારીખ)</label>
                            <input
                              type="date"
                              value={letterDate}
                              onChange={e => setLetterDate(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">SI Name (સુપરવાઇઝર ઇન્સ્ટ્રક્ટર)</label>
                            <input
                              type="text"
                              value={letterSiName}
                              onChange={e => setLetterSiName(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Interactive Remarks Editor */}
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                              📝 Edit Student Remarks (તાલીમાર્થી રિમાર્ક્સ સુધારો)
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleSaveRemarks(irregularCandidates)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-rounded text-sm">save</span>
                              રિમાર્ક્સ સેવ કરો (Save Remarks)
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {irregularCandidates.map((cand) => {
                              const studentObj = myStudents.find(s => s.id === cand.studentId);
                              const displayName = studentObj
                                ? (studentObj.fullNameGujarati || studentObj.fullNameEnglish || `${studentObj.studentName} ${studentObj.surname}`)
                                : cand.studentName;
                              const currentRemark = remarksState[cand.id] !== undefined
                                ? remarksState[cand.id]
                                : (cand.remark || "");

                              return (
                                <div key={cand.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-800">{displayName}</span>
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                      {cand.attendancePercentage.toFixed(2)}%
                                    </span>
                                  </div>
                                  <textarea
                                    rows={1}
                                    value={currentRemark}
                                    onChange={(e) => handleRemarkChange(cand, e.target.value)}
                                    placeholder="રિમાર્ક્સ મેન્યુઅલી લખો..."
                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Official A4 Letter Preview Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-4xl mx-auto">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">
                            📄 Gujarati Forwarding Letter Preview
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handlePrintLetter}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              🖨️ Print Letter (બ્રાઉઝર પ્રિન્ટ)
                            </button>
                            <button
                              onClick={handleDownloadLetterPDF}
                              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-extrabold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              📥 PDF Fallback (ડાઉનલોડ)
                            </button>
                            <button
                              onClick={handleDownloadLetterWord}
                              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-[10px] font-extrabold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              📝 Word Export (વર્ડ ડાઉનલોડ)
                            </button>
                          </div>
                        </div>

                        {/* Onscreen preview element */}
                        {(() => {
                          const selectedBatch = myBatches.find(b => b.id === selectedLetterBatchId);
                          if (!selectedBatch) return null;

                          const dateFormatted = new Date(letterDate).toLocaleDateString('gu-IN');
                          const gujTradeName = getGujaratiTradeName(selectedBatch.tradeName);
                          const batchListString = `${selectedBatch.batchNumber}-${selectedBatch.batchSection}`;

                          const localUsers = getUsers();
                          const matchedUser = localUsers.find(
                            u => u.name.trim().toLowerCase() === letterSiName.trim().toLowerCase() ||
                                 (u.supervisorNameEnglish && u.supervisorNameEnglish.trim().toLowerCase() === letterSiName.trim().toLowerCase()) ||
                                 (u.supervisorNameGujarati && u.supervisorNameGujarati.trim().toLowerCase() === letterSiName.trim().toLowerCase())
                          );
                          const resolvedSiName = matchedUser?.supervisorNameGujarati || matchedUser?.supervisorNameEnglish || matchedUser?.name || letterSiName;

                          const previewHtml = resolveLetterHtml(letterTemplate, {
                            resolvedSiName,
                            gujTradeName,
                            dateFormatted,
                            batchListString,
                            irregularCandidatesCount: irregularCandidates.length,
                            irregularCandidates: irregularCandidates
                          });

                          return (
                            <div className="p-8 sm:p-12 text-slate-900 leading-relaxed bg-white rounded-b-2xl">
                              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* GENERAL LETTER TAB */}
        {activeTab === "general_letter" && (
          <GeneralLetterModule currentUser={currentUser} />
        )}

        {/* LEAVE MANAGEMENT TAB */}
        {activeTab === "leave_management" && (
          <LeaveManagementModule currentUser={currentUser} />
        )}

        {/* REPORT HISTORY TAB */}
        {activeTab === "report_history" && (
          <ReportHistoryModule currentUser={currentUser} />
        )}
      </main>
    </div>

        {/* Footer with Developer Attribution */}
        <footer className="mt-auto py-4 border-t border-slate-200 bg-white text-center text-[11px] font-bold text-slate-500">
          App Developer: Gaurav Dodiya (ITI Porbandar)
        </footer>

      {/* STUDENT PROFILE DETAILED MODAL */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
          onClose={() => setSelectedStudent(null)}
          onUpdate={() => {
            loadMyData();
            // Refresh currently viewed profile details
            const updated = getStudents().find(s => s.id === selectedStudent.id);
            if (updated) setSelectedStudent(updated);
          }}
        />
      )}

      {/* EXCEL IMPORT SPREADSHEET MODAL */}
      {isImportingStudents && (
        <ImportStudentsModal
          batches={myBatches}
          preselectedBatchId={selectedBatchSwitcherId !== "ALL" ? selectedBatchSwitcherId : ""}
          onClose={() => setIsImportingStudents(false)}
          onImportComplete={() => {
            setIsImportingStudents(false);
            loadMyData();
            alert("Students imported successfully!");
          }}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
