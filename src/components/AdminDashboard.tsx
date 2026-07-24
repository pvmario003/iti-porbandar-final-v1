import React, { useState, useEffect } from "react";
import { 
  Users, Layers, GraduationCap, CheckCircle2, Clock, 
  AlertCircle, ShieldAlert, Plus, Edit2, Check, X, Search, Filter, Database, BookOpen,
  FileSpreadsheet, FileText, Trash2
} from "lucide-react";
import { 
  User, UserRole, Batch, BatchStatus, Student, StudentStatus, AuditLog, STUDENT_STATUS_LABELS, Trade, BatchAssignmentHistory, PromotionRecord, SIProfile 
} from "../types";
import { 
  getUsers, saveUser, deleteUser, getBatches, saveBatch, getStudents, getLogs, addAuditLog, getTrades, saveTrade, getAssignmentHistory, addAssignmentHistoryRecord, generateId,
  getWorkingDays, saveWorkingDays, deleteWorkingDays, getAttendance, saveAttendance, saveAttendanceBatch,
  getPromotions, promoteStudents, reversePromotion, saveStudent, deleteStudent, getSIProfileByUserId, saveSIProfile, deleteSIProfile, transliterateEnglishToGujarati
} from "../utils/storage";
import {
  exportStudentsExcel, exportStudentsPDF, exportStudentsWord,
  exportScholarshipExcel, exportScholarshipPDF, exportScholarshipWord,
  exportBankExcel, exportBankPDF, exportBankWord,
  exportTradeSummaryExcel, exportTradeSummaryPDF, exportTradeSummaryWord,
  exportBatchSummaryExcel, exportBatchSummaryPDF, exportBatchSummaryWord,
  exportOnRollSummaryExcel, exportOnRollSummaryPDF, exportOnRollSummaryWord,
  exportPromotionHistoryExcel, exportPromotionHistoryPDF, exportPromotionHistoryWord,
  exportMissingDocsExcel, exportMissingDocsPDF, exportMissingDocsWord,
  exportCMDRegisterExcel
} from "../utils/exportUtils";
import DashboardStatsCard from "./DashboardStatsCard";
import StudentProfileModal from "./StudentProfileModal";
import ExitedStudentsList from "./ExitedStudentsList";
import AnalyticsDashboard from "./AnalyticsDashboard";
import LeaveManagementModule from "./LeaveManagementModule";
import GeneralLetterModule from "./GeneralLetterModule";
import { ReportHistoryModule } from "./ReportHistoryModule";
import ItiLogo from "./ItiLogo";

interface AdminDashboardProps {
  onLogout: () => void;
  currentUser: User;
}

export default function AdminDashboard({ onLogout, currentUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sis" | "trades" | "batches" | "students" | "exited" | "logs" | "scholarships" | "attendance" | "promotions" | "analytics" | "leave_management" | "general_letter" | "report_history">("overview");
  
  // Data State
  const [sis, setSis] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [trades, setTrades] = useState<string[]>([]);
  const [tradeObjects, setTradeObjects] = useState<Trade[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<BatchAssignmentHistory[]>([]);

  // Selected student for Profile View
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // S.I. CRUD state
  const [editingSi, setEditingSi] = useState<User | null>(null);
  const [siForm, setSiForm] = useState({ name: "", username: "", password: "", isActive: true, supervisorNameEnglish: "", supervisorNameGujarati: "" });
  const [isCreatingSi, setIsCreatingSi] = useState(false);

  // S.I. Profile CRUD state
  const [selectedSiForProfile, setSelectedSiForProfile] = useState<User | null>(null);
  const [siProfileForm, setSiProfileForm] = useState({
    id: "",
    designationEnglish: "Supervisor Instructor",
    designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
    officeEnglish: "ITI Porbandar",
    officeGujarati: "આઈ.ટી.આઈ. પોરબંદર",
    departmentEnglish: "Employment and Training",
    departmentGujarati: "રોજગાર અને તાલીમ વિભાગ",
    employeeId: "",
    mobile: "",
    addressEnglish: "",
    addressGujarati: "",
    salary: ""
  });

  // Trade CRUD state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [tradeForm, setTradeForm] = useState({ name: "", isActive: true, tradeNameEnglish: "", tradeNameGujarati: "", seatCapacity: "" as string | number });
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);

  // Batch Creator / Assignment state
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    tradeName: "",
    batchNumber: "",
    batchSection: "A",
    academicSession: `${new Date().getFullYear()}-${new Date().getFullYear() + 2}`,
    year: "Year 1",
    shift: "Shift 1",
    assignedSIId: "",
    capacity: "" as string | number
  });

  const [assignmentSIId, setAssignmentSIId] = useState<string>("");
  const [selectedBatchIdsForAssignment, setSelectedBatchIdsForAssignment] = useState<string[]>([]);

  // Batch Editing State
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchEditForm, setBatchEditForm] = useState({ academicSession: "", year: "Year 1", shift: "Shift 1", capacity: "" as string | number });

  // Student list filter states
  const [studentSearch, setStudentSearch] = useState("");
  const [studentTradeFilter, setStudentTradeFilter] = useState("");
  const [studentBatchFilter, setStudentBatchFilter] = useState("");
  const [studentDocFilter, setStudentDocFilter] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  // Student Manual Creation state
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    studentName: "",
    fatherName: "",
    surname: "",
    enrollmentNumber: "",
    dateOfBirth: "",
    gender: "Male",
    trade: "",
    batchId: "",
    studentMobileNumber: "",
    parentMobileNumber: "",
    address: "",
    admissionDate: new Date().toISOString().split("T")[0],
    cmdDepositNumber: "",
    aadhaarNumber: "",
    category: "GEN",
    admissionYear: new Date().getFullYear().toString()
  });

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.studentName || !studentForm.fatherName || !studentForm.surname || !studentForm.enrollmentNumber || !studentForm.batchId || !studentForm.category) {
      alert("Please fill in all mandatory student details (Student Name, Father's Name, Surname, Enrollment Number, Batch, Category).");
      return;
    }

    const selectedBatch = batches.find(b => b.id === studentForm.batchId);
    if (!selectedBatch) {
      alert("Invalid batch selected.");
      return;
    }

    const engFull = `${studentForm.studentName} ${studentForm.fatherName} ${studentForm.surname}`.trim();
    const gujFull = transliterateEnglishToGujarati(engFull);

    const newStudent: Student = {
      id: "stu-" + generateId(),
      studentName: studentForm.studentName.trim(),
      fatherName: studentForm.fatherName.trim(),
      surname: studentForm.surname.trim(),
      enrollmentNumber: studentForm.enrollmentNumber.trim(),
      dateOfBirth: studentForm.dateOfBirth,
      gender: studentForm.gender,
      trade: selectedBatch.tradeName,
      batchId: selectedBatch.id,
      batchName: selectedBatch.displayName,
      academicSession: selectedBatch.academicSession,
      year: selectedBatch.year,
      shift: selectedBatch.shift,
      studentMobileNumber: studentForm.studentMobileNumber.trim(),
      parentMobileNumber: studentForm.parentMobileNumber.trim(),
      address: studentForm.address.trim(),
      admissionDate: studentForm.admissionDate,
      currentStatus: StudentStatus.ACTIVE,
      cmdDepositNumber: studentForm.cmdDepositNumber.trim(),
      aadhaarNumber: studentForm.aadhaarNumber.trim(),
      category: studentForm.category,
      admissionYear: studentForm.admissionYear,
      fullNameEnglish: engFull,
      fullNameGujarati: gujFull,
      addressEnglish: studentForm.address.trim(),
      addressGujarati: transliterateEnglishToGujarati(studentForm.address.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveStudent(newStudent);
    addAuditLog(currentUser.name, `Created student manually: ${newStudent.studentName} ${newStudent.surname} (${newStudent.enrollmentNumber})`);
    
    // Reset Student Form
    setStudentForm({
      studentName: "",
      fatherName: "",
      surname: "",
      enrollmentNumber: "",
      dateOfBirth: "",
      gender: "Male",
      trade: "",
      batchId: "",
      studentMobileNumber: "",
      parentMobileNumber: "",
      address: "",
      admissionDate: new Date().toISOString().split("T")[0],
      cmdDepositNumber: "",
      aadhaarNumber: "",
      category: "GEN",
      admissionYear: new Date().getFullYear().toString()
    });
    setIsCreatingStudent(false);
    loadAllData();
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student '${studentName}'? This action cannot be undone.`)) {
      return;
    }
    deleteStudent(studentId);
    addAuditLog(currentUser.name, `Permanently deleted student record: ${studentName}`);
    loadAllData();
  };

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentTradeFilter, studentBatchFilter, studentDocFilter]);

  // Allotments & Batches page filters
  const [batchSearch, setBatchSearch] = useState("");
  const [batchTradeFilter, setBatchTradeFilter] = useState("");
  const [batchSIFilter, setBatchSIFilter] = useState("");
  const [batchSessionFilter, setBatchSessionFilter] = useState("");

  // --- Scholarship Tab Filter States ---
  const [scholarshipTypeFilter, setScholarshipTypeFilter] = useState("");
  const [scholarshipStatusFilter, setScholarshipStatusFilter] = useState("");
  const [scholarshipTradeFilter, setScholarshipTradeFilter] = useState("");
  const [scholarshipBatchFilter, setScholarshipBatchFilter] = useState("");
  const [scholarshipSearchText, setScholarshipSearchText] = useState("");

  // --- Attendance Tab States ---
  const [attendanceSubTab, setAttendanceSubTab] = useState<"dashboard" | "config">("dashboard");
  const [workingDaysList, setWorkingDaysList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  
  // Working days form state
  const [wdAcademicYear, setWdAcademicYear] = useState("2025-26");
  const [wdMonth, setWdMonth] = useState("July 2026");
  const [wdDays, setWdDays] = useState(26);
  const [editingWdId, setEditingWdId] = useState<string | null>(null);

  // Attendance Dashboard filter states
  const [attTradeFilter, setAttTradeFilter] = useState("");
  const [attBatchFilter, setAttBatchFilter] = useState("");
  const [attMonthFilter, setAttMonthFilter] = useState("");
  const [attYearFilter, setAttYearFilter] = useState("");
  const [attPercentFilter, setAttPercentFilter] = useState("ALL");
  const [attSearchText, setAttSearchText] = useState("");

  // Student Promotion & Forwarding State
  const [promotionHistory, setPromotionHistory] = useState<PromotionRecord[]>([]);
  const [promoSubTab, setPromoSubTab] = useState<"promote" | "history" | "stats">("promote");
  const [promoSrcTrade, setPromoSrcTrade] = useState("");
  const [promoSrcBatchId, setPromoSrcBatchId] = useState("");
  const [promoSelectedStudentIds, setPromoSelectedStudentIds] = useState<string[]>([]);
  const [promoDestBatchId, setPromoDestBatchId] = useState("");
  const [promoSearch, setPromoSearch] = useState("");
  const [promoHistSearch, setPromoHistSearch] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

      // Ctrl + / to focus student search input
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

      // Alt Shortcuts for quick page routing
      if (e.altKey) {
        e.preventDefault();
        switch (e.key.toLowerCase()) {
          case "o":
          case "1":
            setActiveTab("overview");
            break;
          case "i":
          case "2":
            setActiveTab("sis");
            break;
          case "t":
          case "3":
            setActiveTab("trades");
            break;
          case "b":
          case "4":
            setActiveTab("batches");
            break;
          case "s":
          case "5":
            setActiveTab("students");
            break;
          case "e":
          case "6":
            setActiveTab("exited");
            break;
          case "d":
          case "7":
            setActiveTab("scholarships");
            break;
          case "a":
          case "8":
            setActiveTab("analytics");
            break;
          case "p":
          case "9":
            setActiveTab("promotions");
            break;
          case "u":
          case "0":
            setActiveTab("logs");
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

  const loadAllData = () => {
    const allUsers = getUsers();
    setSis(allUsers.filter(u => u.role === UserRole.SUPERVISOR_INSTRUCTOR));
    
    const allBatches = getBatches();
    setBatches(allBatches);
    
    const allStudents = getStudents();
    setStudents(allStudents);
    
    setLogs(getLogs());

    const allTrades = getTrades();
    setTradeObjects(allTrades);
    setTrades(allTrades.map(t => t.name));
    setAssignmentHistory(getAssignmentHistory());

    setWorkingDaysList(getWorkingDays());
    setAttendanceList(getAttendance());
    setPromotionHistory(getPromotions());
  };

  const handleCreateSi = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if username exists
    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === siForm.username.toLowerCase())) {
      alert("This username is already taken. Please choose another.");
      return;
    }

    const englishName = siForm.supervisorNameEnglish.trim() || siForm.name.trim();

    const newSi: User = {
      id: "si-" + generateId(),
      name: englishName,
      username: siForm.username,
      password: siForm.password || "password", // default password
      role: UserRole.SUPERVISOR_INSTRUCTOR,
      isActive: siForm.isActive,
      createdAt: new Date().toISOString().split("T")[0],
      supervisorNameEnglish: englishName,
      supervisorNameGujarati: siForm.supervisorNameGujarati.trim()
    };

    saveUser(newSi);
    addAuditLog(currentUser.name, `Created Supervisor Instructor account: ${newSi.name} (${newSi.username})`);
    
    // Reset Form
    setSiForm({ name: "", username: "", password: "", isActive: true, supervisorNameEnglish: "", supervisorNameGujarati: "" });
    setIsCreatingSi(false);
    loadAllData();
  };

  const handleEditSi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSi) return;

    // Check if username is taken by another user
    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === siForm.username.toLowerCase() && u.id !== editingSi.id)) {
      alert("This username is already taken. Please choose another.");
      return;
    }

    const englishName = siForm.supervisorNameEnglish.trim() || siForm.name.trim();

    const updatedSi: User = {
      ...editingSi,
      name: englishName,
      username: siForm.username,
      password: siForm.password || editingSi.password, // Keep existing if not changed
      isActive: siForm.isActive,
      supervisorNameEnglish: englishName,
      supervisorNameGujarati: siForm.supervisorNameGujarati.trim()
    };

    saveUser(updatedSi);
    addAuditLog(currentUser.name, `Updated S.I. account details for: ${updatedSi.name}`);
    
    setEditingSi(null);
    setSiForm({ name: "", username: "", password: "", isActive: true, supervisorNameEnglish: "", supervisorNameGujarati: "" });
    loadAllData();
  };

  const toggleSiStatus = (si: User) => {
    const updated = { ...si, isActive: !si.isActive };
    saveUser(updated);
    addAuditLog(currentUser.name, `${updated.isActive ? 'Activated' : 'Deactivated'} S.I. account: ${si.name}`);
    loadAllData();
  };

  const handleDeleteSi = (si: User) => {
    const confirmMsg = `Are you sure you want to completely DELETE S.I. Instructor: ${si.name}?\nThis will remove their profile and staff records.`;
    if (!confirm(confirmMsg)) return;

    deleteUser(si.id);
    const existingProfile = getSIProfileByUserId(si.id);
    if (existingProfile) {
      deleteSIProfile(existingProfile.id);
    }

    addAuditLog(currentUser.name, `Deleted S.I. Instructor staff record: ${si.name}`);
    loadAllData();
    alert("Instructor staff record deleted successfully.");
  };

  const openSiProfileEditor = (si: User) => {
    setSelectedSiForProfile(si);
    const existingProfile = getSIProfileByUserId(si.id);
    if (existingProfile) {
      setSiProfileForm({
        id: existingProfile.id,
        designationEnglish: existingProfile.designationEnglish,
        designationGujarati: existingProfile.designationGujarati,
        officeEnglish: existingProfile.officeEnglish,
        officeGujarati: existingProfile.officeGujarati,
        departmentEnglish: existingProfile.departmentEnglish,
        departmentGujarati: existingProfile.departmentGujarati,
        employeeId: existingProfile.employeeId,
        mobile: existingProfile.mobile,
        addressEnglish: existingProfile.addressEnglish,
        addressGujarati: existingProfile.addressGujarati,
        salary: existingProfile.salary
      });
    } else {
      setSiProfileForm({
        id: "sip-" + generateId(),
        designationEnglish: "Supervisor Instructor",
        designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
        officeEnglish: "ITI Porbandar",
        officeGujarati: "આઈ.ટી.આઈ. પોરબંદર",
        departmentEnglish: "Employment and Training",
        departmentGujarati: "રોજગાર અને તાલીમ વિભાગ",
        employeeId: "",
        mobile: "",
        addressEnglish: "",
        addressGujarati: "",
        salary: ""
      });
    }
  };

  const handleSaveSiProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiForProfile) return;

    const profileToSave: SIProfile = {
      id: siProfileForm.id || "sip-" + generateId(),
      userId: selectedSiForProfile.id,
      nameEnglish: selectedSiForProfile.supervisorNameEnglish || selectedSiForProfile.name,
      nameGujarati: selectedSiForProfile.supervisorNameGujarati || "",
      designationEnglish: siProfileForm.designationEnglish.trim(),
      designationGujarati: siProfileForm.designationGujarati.trim(),
      officeEnglish: siProfileForm.officeEnglish.trim(),
      officeGujarati: siProfileForm.officeGujarati.trim(),
      departmentEnglish: siProfileForm.departmentEnglish.trim(),
      departmentGujarati: siProfileForm.departmentGujarati.trim(),
      employeeId: siProfileForm.employeeId.trim(),
      mobile: siProfileForm.mobile.trim(),
      addressEnglish: siProfileForm.addressEnglish.trim(),
      addressGujarati: siProfileForm.addressGujarati.trim(),
      salary: siProfileForm.salary.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveSIProfile(profileToSave);
    addAuditLog(currentUser.name, `Updated Supervisor Instructor Profile details for: ${selectedSiForProfile.name}`);
    alert(`Instructor profile details successfully saved/updated.`);
    setSelectedSiForProfile(null);
    loadAllData();
  };

  // 1. TRADE MANAGEMENT HANDLERS
  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const tradeNameEng = tradeForm.tradeNameEnglish.trim() || tradeForm.name.trim();
    if (!tradeNameEng) return;

    // Check for duplicate trade names (case-insensitive)
    const existing = tradeObjects.find(
      t => (t.tradeNameEnglish || t.name).toLowerCase() === tradeNameEng.toLowerCase() && (!editingTrade || t.id !== editingTrade.id)
    );
    if (existing) {
      alert("A trade with this name is already registered.");
      return;
    }

    const tradeToSave: Trade = {
      id: editingTrade ? editingTrade.id : "trade-" + generateId(),
      name: tradeNameEng,
      isActive: tradeForm.isActive,
      tradeNameEnglish: tradeNameEng,
      tradeNameGujarati: tradeForm.tradeNameGujarati.trim(),
      seatCapacity: tradeForm.seatCapacity ? Number(tradeForm.seatCapacity) : undefined
    };

    saveTrade(tradeToSave);
    addAuditLog(
      currentUser.name,
      `${editingTrade ? "Updated" : "Registered"} trade: ${tradeToSave.name}`
    );

    // Reset Form
    setTradeForm({ name: "", isActive: true, tradeNameEnglish: "", tradeNameGujarati: "", seatCapacity: "" });
    setEditingTrade(null);
    setIsCreatingTrade(false);
    loadAllData();
  };

  const startEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setTradeForm({
      name: trade.name,
      isActive: trade.isActive !== false,
      tradeNameEnglish: trade.tradeNameEnglish || trade.name,
      tradeNameGujarati: trade.tradeNameGujarati || "",
      seatCapacity: trade.seatCapacity !== undefined ? trade.seatCapacity : ""
    });
    setIsCreatingTrade(true);
  };

  const toggleTradeStatus = (trade: Trade) => {
    const updated: Trade = { ...trade, isActive: !(trade.isActive !== false) };
    saveTrade(updated);
    addAuditLog(
      currentUser.name,
      `${updated.isActive ? "Activated" : "Deactivated"} trade: ${trade.name}`
    );
    loadAllData();
  };

  const cancelEditTrade = () => {
    setEditingTrade(null);
    setTradeForm({ name: "", isActive: true, tradeNameEnglish: "", tradeNameGujarati: "", seatCapacity: "" });
    setIsCreatingTrade(false);
  };

  // 2. BATCH CREATION & ALLOTMENT HANDLERS
  const handleCreateBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchForm.tradeName) {
      alert("Please select a valid active trade.");
      return;
    }

    const tradeClean = batchForm.tradeName.split(" ")[0]; // Get short word e.g. "Welder" or "COPA"
    const finalDisplayName = `${tradeClean} ${batchForm.batchNumber}-${batchForm.batchSection.toUpperCase()}`;

    // Check for duplicate display names to prevent operator error
    const allBatches = getBatches();
    if (allBatches.some(b => b.displayName.toLowerCase() === finalDisplayName.toLowerCase() && b.status === BatchStatus.APPROVED)) {
      alert(`A batch with the name '${finalDisplayName}' is already registered in the system.`);
      return;
    }

    // Find assigned SI name
    let siName = "";
    if (batchForm.assignedSIId) {
      const selectedSI = sis.find(s => s.id === batchForm.assignedSIId);
      if (selectedSI) {
        siName = selectedSI.name;
      }
    }

    const newBatch: Batch = {
      id: "batch-" + generateId(),
      tradeName: batchForm.tradeName,
      batchNumber: batchForm.batchNumber,
      batchSection: batchForm.batchSection.toUpperCase(),
      displayName: finalDisplayName,
      academicSession: batchForm.academicSession,
      year: batchForm.year,
      shift: batchForm.shift,
      createdBy: batchForm.assignedSIId || currentUser.id, // S.I. or Admin fallback
      createdByName: siName || currentUser.name,
      status: BatchStatus.APPROVED, // Automatically approved when created by Admin!
      createdAt: new Date().toISOString(),
      assignedSIId: batchForm.assignedSIId || null,
      assignedSIName: siName || null,
      capacity: batchForm.capacity ? Number(batchForm.capacity) : undefined
    };

    saveBatch(newBatch);
    addAuditLog(currentUser.name, `Admin created batch: ${newBatch.displayName} (Assigned to: ${siName || "Unassigned"})`);

    if (newBatch.assignedSIId) {
      // Record in history
      const histRec: BatchAssignmentHistory = {
        id: "hist-" + generateId(),
        batchId: newBatch.id,
        batchName: newBatch.displayName,
        previousSIId: null,
        previousSIName: null,
        newSIId: newBatch.assignedSIId,
        newSIName: newBatch.assignedSIName,
        assignedBy: currentUser.name,
        transferDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      addAssignmentHistoryRecord(histRec);
    }
    
    // Reset Form & state
    setIsCreatingBatch(false);
    setBatchForm({
      tradeName: tradeObjects.filter(t => t.isActive !== false)[0]?.name || "",
      batchNumber: "",
      batchSection: "A",
      academicSession: `${new Date().getFullYear()}-${new Date().getFullYear() + 2}`,
      year: "Year 1",
      shift: "Shift 1",
      assignedSIId: "",
      capacity: ""
    });
    
    alert(`Batch '${finalDisplayName}' successfully created.`);
    loadAllData();
  };

  // Monitor Assignment S.I. selection to pre-fill checked batches
  useEffect(() => {
    if (assignmentSIId) {
      const siBatches = batches.filter(b => b.assignedSIId === assignmentSIId).map(b => b.id);
      setSelectedBatchIdsForAssignment(siBatches);
    } else {
      setSelectedBatchIdsForAssignment([]);
    }
  }, [assignmentSIId, batches]);

  // Submit Bulk Batch Assignment
  const handleBatchAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentSIId) {
      alert("Please select a Supervisor Instructor (S.I.) first.");
      return;
    }

    const selectedSI = sis.find(s => s.id === assignmentSIId);
    if (!selectedSI) {
      alert("Selected Instructor not found.");
      return;
    }

    let transfersCount = 0;
    let assignmentsCount = 0;
    let unassignmentsCount = 0;

    const allBatches = getBatches();
    const updatedBatches = allBatches.map(batch => {
      const shouldBeAssigned = selectedBatchIdsForAssignment.includes(batch.id);
      const currentlyAssigned = batch.assignedSIId === assignmentSIId;

      if (shouldBeAssigned && !currentlyAssigned) {
        // Record assignment / transfer in history
        const prevSIId = batch.assignedSIId || null;
        const prevSIName = batch.assignedSIName || null;

        if (prevSIId) {
          transfersCount++;
        } else {
          assignmentsCount++;
        }

        const histRec: BatchAssignmentHistory = {
          id: "hist-" + generateId(),
          batchId: batch.id,
          batchName: batch.displayName,
          previousSIId: prevSIId,
          previousSIName: prevSIName,
          newSIId: assignmentSIId,
          newSIName: selectedSI.name,
          assignedBy: currentUser.name,
          transferDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        addAssignmentHistoryRecord(histRec);

        // Update batch properties
        return {
          ...batch,
          assignedSIId: assignmentSIId,
          assignedSIName: selectedSI.name,
          createdBy: assignmentSIId, // align creator for student import accessibility
          createdByName: selectedSI.name
        };
      } else if (!shouldBeAssigned && currentlyAssigned) {
        // Record unassignment in history
        unassignmentsCount++;
        const histRec: BatchAssignmentHistory = {
          id: "hist-" + generateId(),
          batchId: batch.id,
          batchName: batch.displayName,
          previousSIId: assignmentSIId,
          previousSIName: selectedSI.name,
          newSIId: null,
          newSIName: null,
          assignedBy: currentUser.name,
          transferDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        addAssignmentHistoryRecord(histRec);

        return {
          ...batch,
          assignedSIId: null,
          assignedSIName: null
        };
      }

      return batch;
    });

    // Save batches
    updatedBatches.forEach(b => saveBatch(b));

    addAuditLog(
      currentUser.name,
      `Updated batch allotments for S.I. ${selectedSI.name}. Assigned: ${assignmentsCount}, Transferred: ${transfersCount}, Unassigned: ${unassignmentsCount}`
    );

    alert(`Allotment complete!\n\n- New Assignments: ${assignmentsCount}\n- Transferred Batches: ${transfersCount}\n- Unassigned Batches: ${unassignmentsCount}`);
    
    // Reset selection and load updated data
    setAssignmentSIId("");
    loadAllData();
  };

  // Direct Quick Transfer from registry table
  const handleQuickTransferBatch = (batchId: string, targetSIId: string | null) => {
    const allBatches = getBatches();
    const batch = allBatches.find(b => b.id === batchId);
    if (!batch) return;

    const prevSIId = batch.assignedSIId || null;
    const prevSIName = batch.assignedSIName || null;

    let targetSIName: string | null = null;
    if (targetSIId) {
      const targetSI = sis.find(s => s.id === targetSIId);
      if (targetSI) {
        targetSIName = targetSI.name;
      }
    }

    if (prevSIId === targetSIId) return; // same assignment

    const updatedBatch: Batch = {
      ...batch,
      assignedSIId: targetSIId,
      assignedSIName: targetSIName,
      createdBy: targetSIId || batch.createdBy,
      createdByName: targetSIName || batch.createdByName
    };

    saveBatch(updatedBatch);

    const histRec: BatchAssignmentHistory = {
      id: "hist-" + generateId(),
      batchId: batch.id,
      batchName: batch.displayName,
      previousSIId: prevSIId,
      previousSIName: prevSIName,
      newSIId: targetSIId,
      newSIName: targetSIName,
      assignedBy: currentUser.name,
      transferDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    addAssignmentHistoryRecord(histRec);

    addAuditLog(
      currentUser.name,
      `Transferred batch ${batch.displayName} from ${prevSIName || "Unassigned"} to ${targetSIName || "Unassigned"}`
    );

    alert(`Batch '${batch.displayName}' successfully transferred to ${targetSIName || "Unassigned"}.`);
    loadAllData();
  };

  // Batch actions
  const handleBatchApproval = (batch: Batch, approve: boolean) => {
    const updatedBatch: Batch = {
      ...batch,
      status: approve ? BatchStatus.APPROVED : BatchStatus.REJECTED
    };
    saveBatch(updatedBatch);
    addAuditLog(
      currentUser.name,
      `${approve ? 'Approved' : 'Rejected'} batch request: ${batch.displayName} submitted by ${batch.createdByName}`
    );
    loadAllData();
  };

  const handleDeactivateBatch = (batch: Batch) => {
    if (!window.confirm(`Are you sure you want to deactivate the batch ${batch.displayName}?`)) {
      return;
    }
    const updatedBatch: Batch = {
      ...batch,
      status: BatchStatus.INACTIVE
    };
    saveBatch(updatedBatch);
    addAuditLog(currentUser.name, `Deactivated batch: ${batch.displayName}`);
    loadAllData();
  };

  const startEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchEditForm({
      academicSession: batch.academicSession,
      year: batch.year,
      shift: batch.shift,
      capacity: batch.capacity !== undefined ? batch.capacity : ""
    });
  };

  const handleSaveBatchEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    const updated: Batch = {
      ...editingBatch,
      academicSession: batchEditForm.academicSession,
      year: batchEditForm.year,
      shift: batchEditForm.shift,
      capacity: batchEditForm.capacity ? Number(batchEditForm.capacity) : undefined
    };
    saveBatch(updated);
    addAuditLog(currentUser.name, `Edited batch administrative parameters for ${updated.displayName}`);
    
    // Update cached students' batch names if needed
    setEditingBatch(null);
    loadAllData();
  };

  // Stats Counters
  const totalSis = sis.length;
  const totalBatches = batches.length;
  const totalStudents = students.length;
  const activeStudentsCount = students.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
  const exitedStudentsCount = students.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;
  const pendingBatchApprovalsCount = batches.filter(b => b.status === BatchStatus.PENDING).length;

  // Scholarship Stats
  const totalScholarshipsApplied = students.filter(s => s.scholarshipType && s.scholarshipType !== "None").length;
  const scholarshipApprovedCount = students.filter(s => s.scholarshipType && s.scholarshipType !== "None" && s.scholarshipStatus === "Approved").length;
  const scholarshipPendingCount = students.filter(s => s.scholarshipType && s.scholarshipType !== "None" && (s.scholarshipStatus === "Pending" || !s.scholarshipStatus || s.scholarshipStatus === "Applied")).length;
  const scholarshipRejectedCount = students.filter(s => s.scholarshipType && s.scholarshipType !== "None" && s.scholarshipStatus === "Rejected").length;
  const scholarshipCompletedCount = students.filter(s => s.scholarshipType && s.scholarshipType !== "None" && s.scholarshipStatus === "Completed").length;

  // --- STUDENT PROMOTION MODULE VARIABLES & HELPERS ---
  const activeSrcStudents = students.filter(s => {
    const isStatusActive = s.currentStatus === StudentStatus.ACTIVE;
    const matchesTrade = !promoSrcTrade || s.trade === promoSrcTrade;
    const matchesBatch = !promoSrcBatchId || s.batchId === promoSrcBatchId;
    const matchesSearch = !promoSearch || 
      `${s.studentName} ${s.surname}`.toLowerCase().includes(promoSearch.toLowerCase()) ||
      s.enrollmentNumber.toLowerCase().includes(promoSearch.toLowerCase());
    return isStatusActive && matchesTrade && matchesBatch && matchesSearch;
  });

  const selectedPromoStudents = students.filter(s => promoSelectedStudentIds.includes(s.id));
  const destBatch = batches.find(b => b.id === promoDestBatchId);
  const activeDestStudents = students.filter(s => s.batchId === promoDestBatchId && s.currentStatus === StudentStatus.ACTIVE);
  const duplicateConflicts = selectedPromoStudents.filter(s => 
    activeDestStudents.some(ds => ds.enrollmentNumber.trim().toLowerCase() === s.enrollmentNumber.trim().toLowerCase())
  );
  const hasConflicts = duplicateConflicts.length > 0;

  const handleExecutePromotion = () => {
    if (promoSelectedStudentIds.length === 0) {
      alert("Please select at least one student to promote.");
      return;
    }
    if (!promoDestBatchId || !destBatch) {
      alert("Please select a destination batch.");
      return;
    }
    if (hasConflicts) {
      alert("Cannot proceed. Enrollment number duplication detected in the target batch.");
      return;
    }

    const confirmMsg = `Are you sure you want to promote ${promoSelectedStudentIds.length} students to ${destBatch.displayName}?`;
    if (!confirm(confirmMsg)) return;

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const promoRecords: PromotionRecord[] = selectedPromoStudents.map(s => {
      const currentBatch = batches.find(b => b.id === s.batchId);
      return {
        id: "promo-" + generateId(),
        studentId: s.id,
        studentName: `${s.studentName} ${s.surname}`,
        enrollmentNumber: s.enrollmentNumber,
        oldTrade: s.trade,
        oldBatchId: s.batchId,
        oldBatchName: s.batchName,
        newTrade: destBatch.tradeName,
        newBatchId: destBatch.id,
        newBatchName: destBatch.displayName,
        oldYear: s.year || currentBatch?.year || "Year 1",
        newYear: destBatch.year,
        oldShift: s.shift || currentBatch?.shift || "Shift 1",
        newShift: destBatch.shift,
        promotionDate: nowStr,
        promotedBy: currentUser.name
      };
    });

    promoteStudents(promoRecords);
    addAuditLog(currentUser.name, `Promoted ${promoSelectedStudentIds.length} trainees from ${promoSrcBatchId ? batches.find(b => b.id === promoSrcBatchId)?.displayName : "Multiple"} to ${destBatch.displayName}`);
    
    setPromoSelectedStudentIds([]);
    setPromoDestBatchId("");
    loadAllData();
    alert(`Successfully promoted ${promoRecords.length} students to ${destBatch.displayName}!`);
    setPromoSubTab("history");
  };

  const selectAllVisible = () => {
    const visibleIds = activeSrcStudents.map(s => s.id);
    const allAlreadySelected = visibleIds.every(id => promoSelectedStudentIds.includes(id));
    if (allAlreadySelected) {
      setPromoSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setPromoSelectedStudentIds(prev => {
        const combined = [...prev, ...visibleIds];
        return Array.from(new Set(combined));
      });
    }
  };

  const filteredHistory = promotionHistory.filter(p => {
    if (!promoHistSearch) return true;
    const q = promoHistSearch.toLowerCase();
    return p.studentName.toLowerCase().includes(q) ||
      p.enrollmentNumber.toLowerCase().includes(q) ||
      p.oldBatchName.toLowerCase().includes(q) ||
      p.newBatchName.toLowerCase().includes(q) ||
      p.promotedBy.toLowerCase().includes(q);
  });

  const handleReverse = (record: PromotionRecord) => {
    const confirmMsg = `Are you sure you want to REVERSE (UNDO) the promotion for ${record.studentName}?\nThis will revert their Trade, Batch, and Section back to: ${record.oldTrade} (${record.oldBatchName}).`;
    if (!confirm(confirmMsg)) return;

    const success = reversePromotion(record.id, currentUser.name);
    if (success) {
      addAuditLog(currentUser.name, `REVERSED promotion of ${record.studentName} (${record.enrollmentNumber}) back to ${record.oldBatchName}`);
      loadAllData();
      alert("Promotion successfully reversed! Student data restored.");
    } else {
      alert("Error reversing promotion.");
    }
  };

  // Analytics helper maps
  const activePromo = promotionHistory.filter(p => !p.isReversed);
  const promotedToday = activePromo.filter(p => {
    const todayStr = new Date().toISOString().split("T")[0];
    return p.promotionDate.startsWith(todayStr);
  }).length;

  const monthWiseMap: { [month: string]: number } = {};
  activePromo.forEach(p => {
    const parts = p.promotionDate.split("-");
    if (parts.length >= 2) {
      const monthYear = parts[0] + "-" + parts[1];
      monthWiseMap[monthYear] = (monthWiseMap[monthYear] || 0) + 1;
    }
  });

  const tradeWiseMap: { [trade: string]: number } = {};
  activePromo.forEach(p => {
    tradeWiseMap[p.newTrade] = (tradeWiseMap[p.newTrade] || 0) + 1;
  });

  const batchWiseMap: { [batch: string]: number } = {};
  activePromo.forEach(p => {
    batchWiseMap[p.newBatchName] = (batchWiseMap[p.newBatchName] || 0) + 1;
  });

  const maxMonthCount = Math.max(...Object.values(monthWiseMap), 1);
  const maxTradeCount = Math.max(...Object.values(tradeWiseMap), 1);
  const maxBatchCount = Math.max(...Object.values(batchWiseMap), 1);

  // Student filtering
  const filteredStudents = students.filter(student => {
    const fullName = `${student.studentName} ${student.fatherName} ${student.surname}`.toLowerCase();
    const searchLower = studentSearch.toLowerCase();
    
    const matchesSearch = 
      studentSearch === "" ||
      fullName.includes(searchLower) ||
      student.enrollmentNumber.toLowerCase().includes(searchLower) ||
      student.studentMobileNumber.includes(searchLower) ||
      student.parentMobileNumber.includes(searchLower) ||
      (student.cmdDepositNumber || "").toLowerCase().includes(searchLower);

    const matchesTrade = studentTradeFilter === "" || student.trade === studentTradeFilter;
    const matchesBatch = studentBatchFilter === "" || student.batchId === studentBatchFilter;

    // Check missing required documents
    const requiredKeys = ["aadhaar", "photo", "bank_passbook", "leaving_certificate", "ssc_marksheet", "passport_size_photo"];
    const isMissing = !student.documents || requiredKeys.some(key => !student.documents?.[key]);
    
    const matchesDoc = 
      studentDocFilter === "" ||
      (studentDocFilter === "missing" && isMissing) ||
      (studentDocFilter === "complete" && !isMissing);

    return matchesSearch && matchesTrade && matchesBatch && matchesDoc;
  });

  const STUDENTS_PER_PAGE = 25;
  const paginatedStudents = filteredStudents.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans lg:h-screen lg:overflow-hidden">
      
      {/* Top Banner & Header */}
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
              Government of Gujarat • Industrial Training Institute, Porbandar
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
                  {currentUser.role === "ADMIN" ? "Administrator" : "Supervisor Instructor"}
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
              { id: "overview", label: "Dashboard Overview", icon: "dashboard" },
              { id: "analytics", label: "Analytics Dashboard", icon: "analytics" },
              { id: "sis", label: "S.I. Instructors", icon: "supervisor_account" },
              { id: "trades", label: "Trade Management", icon: "settings" },
              { id: "batches", label: "Batches & Allotments", icon: "layers" },
              { id: "students", label: "Student Registry", icon: "school" },
              { id: "promotions", label: "Student Promotion", icon: "rocket_launch" },
              { id: "scholarships", label: "Scholarship Mgmt", icon: "payments" },
              { id: "attendance", label: "Attendance Mgmt", icon: "calendar_today" },
              { id: "leave_management", label: "Leave Module (રજા મોડ્યુલ)", icon: "badge" },
              { id: "general_letter", label: "Letters & Reports (હાજર રિપોર્ટ)", icon: "edit_note" },
              { id: "report_history", label: "Report History (અહેવાલ હિસ્ટ્રી)", icon: "history_edu" },
              { id: "exited", label: "Exited Archives", icon: "logout" },
              { id: "logs", label: "System Audits", icon: "receipt_long" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  loadAllData();
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
          </nav>
          
          <div className="mt-auto pt-4 border-t border-slate-100 hidden lg:block">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-3xs">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs font-bold text-slate-700">Foundation v1.0.4</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Bento Grid layout */}
              <div className="grid grid-cols-12 gap-4">
                
                {/* Stat Cards - Bento Styled */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#2563EB]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructors (S.I.)</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-slate-800">{totalSis}</span>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-md border border-[#2563EB]/20">Active SI</span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#06B6D4]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Batches</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-slate-800">{totalBatches}</span>
                    <span className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-md border border-[#06B6D4]/20">
                      Total Active
                    </span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#10B981]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#10B981]">{totalStudents}</span>
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md border border-[#10B981]/20">Registered</span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#F59E0B]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Trades</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#F59E0B]">{tradeObjects.length}</span>
                    <button 
                      onClick={() => setActiveTab("trades")}
                      className="text-[10px] font-bold bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] px-2 py-0.5 rounded-md uppercase transition-colors"
                    >
                      Trades
                    </button>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#8B5CF6]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Attendance</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#8B5CF6]">
                      {attendanceList.length > 0
                        ? (attendanceList.reduce((sum, rec) => sum + rec.attendancePercentage, 0) / attendanceList.length).toFixed(1)
                        : "84.5"}%
                    </span>
                    <span className="text-[10px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-md border border-[#8B5CF6]/20">
                      Overall
                    </span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-3xs min-h-[110px] border-t-4 border-t-[#EC4899]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">On-Roll Status</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-black text-[#EC4899]">{activeStudentsCount}</span>
                    <span className="text-[10px] font-bold text-[#EC4899] bg-[#EC4899]/10 px-2 py-0.5 rounded-md border border-[#EC4899]/20 uppercase">Active</span>
                  </div>
                </div>

                {/* Row 2: Left large card (Recent Batch Allotments List), Right sidebar bento panels */}
                {/* Recent Batch Allotment Card */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-3xs flex flex-col overflow-hidden min-h-[350px]">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                      <Layers size={14} className="text-slate-400" /> Recent Batch Allotments
                    </h2>
                    <button onClick={() => setActiveTab("batches")} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
                      Manage Allotments
                    </button>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    {batches.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center h-full space-y-2">
                        <span className="text-4xl">🛠️</span>
                        <p className="text-xs font-bold text-slate-600">No batches registered</p>
                        <p className="text-[11px]">Go to Batches & Allotments to register and allot batches to S.I. Instructors.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-200">
                            <th className="px-6 py-3">Batch Code</th>
                            <th className="px-6 py-3">Trade Name</th>
                            <th className="px-6 py-3">Assigned S.I. Instructor</th>
                            <th className="px-6 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batches.slice(-5).reverse().map((batch) => (
                            <tr key={batch.id} className="text-xs font-medium hover:bg-slate-50/50">
                              <td className="px-6 py-4">
                                <span className="bg-slate-100 text-slate-700 font-mono px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                                  {batch.displayName}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{batch.tradeName}</td>
                              <td className="px-6 py-4 font-bold text-slate-900">
                                {batch.assignedSIName ? (
                                  <span className="text-indigo-600 font-bold">👤 {batch.assignedSIName}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">⚠️ Unassigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  batch.status === BatchStatus.APPROVED 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : "bg-slate-100 text-slate-600 border border-slate-300"
                                }`}>
                                  {batch.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Sidebar Bento Block 1: Student Exit System Slate-900 card */}
                <div className="col-span-12 lg:col-span-4 bg-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                  <div>
                    <h3 className="text-white font-black text-sm mb-1 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={16} className="text-amber-500" /> Student Exit System
                    </h3>
                    <p className="text-slate-400 text-[11px] leading-relaxed mt-2">
                      Manage Naamkami (Left), Raajinaamu (Resigned), and Passout status changes with fully secure historical audit tracking.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("exited")}
                    className="w-full mt-4 py-2.5 bg-white text-slate-900 hover:bg-slate-50 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-98 cursor-pointer text-center"
                  >
                    Exited Student Archives →
                  </button>
                </div>

                {/* Scholarship Statistics Bento Panel */}
                <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-3xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        💳 Scholarship Statistics
                      </h3>
                      <button onClick={() => setActiveTab("scholarships")} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
                        Manage →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applied</span>
                        <span className="text-xl font-black text-slate-800">{totalScholarshipsApplied}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Approved</span>
                        <span className="text-xl font-black text-emerald-700">{scholarshipApprovedCount}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        <span className="text-xl font-black text-amber-700">{scholarshipPendingCount}</span>
                      </div>
                      <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejected</span>
                        <span className="text-xl font-black text-rose-700">{scholarshipRejectedCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Completed Stipends:</span>
                    <span className="text-slate-900 font-black">{scholarshipCompletedCount} Trainees</span>
                  </div>
                </div>

                {/* Row 3: Quick Actions Grid and Log highlights */}
                <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-3xs p-5 flex flex-col">
                  <h3 className="text-slate-900 font-extrabold text-xs mb-3 uppercase tracking-wider">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={() => { setIsCreatingSi(true); setActiveTab("sis"); }}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">👤</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 group-hover:text-indigo-700">Add S.I.</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab("batches")}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">🛠️</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 group-hover:text-indigo-700">Batches</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab("students")}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">🎓</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 group-hover:text-indigo-700">Registry</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab("logs")}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">📝</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 group-hover:text-indigo-700">Audits</span>
                    </button>
                  </div>
                  
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cut Status Composition</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">નામકમી / રાજીનામું (Exited)</span>
                        <span className="font-extrabold text-slate-800">{exitedStudentsCount}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-500"
                          style={{ width: `${totalStudents > 0 ? (exitedStudentsCount / totalStudents) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portal Audits Bento Highlight Panel */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-3xs p-5 flex flex-col justify-between">
                  <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        Recent Activity Logs
                      </h3>
                      <button onClick={() => setActiveTab("logs")} className="text-xs text-indigo-600 font-bold hover:underline">
                        Full Logs →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[190px] overflow-y-auto pr-1">
                      {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs font-medium text-slate-600 hover:bg-slate-50/40 px-1 rounded-lg font-sans">
                          <div>
                            <span className="font-extrabold text-slate-800">{log.user}: </span>
                            <span>{log.action}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold shrink-0">{log.date} {log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        {/* ANALYTICS DASHBOARD TAB */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard 
            students={students}
            batches={batches}
            sis={sis}
            tradeObjects={tradeObjects}
            onDataImported={loadAllData}
            currentUser={currentUser}
          />
        )}

        {/* SUPERVISOR INSTRUCTORS (S.I.) TAB */}
        {activeTab === "sis" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Supervisor Instructor Accounts</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Manage separate secure logins for your S.I. instructors.</p>
              </div>
              {!isCreatingSi && !editingSi && (
                <button
                  onClick={() => {
                    setSiForm({ name: "", username: "", password: "", isActive: true });
                    setIsCreatingSi(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold tracking-wide shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add S.I. Account
                </button>
              )}
            </div>

            {/* S.I. Creation / Edit Form */}
            {(isCreatingSi || editingSi) && (
              <form onSubmit={editingSi ? handleEditSi : handleCreateSi} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  {editingSi ? `Edit Supervisor: ${editingSi.name}` : "Create New Supervisor Instructor Account"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Supervisor Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={siForm.supervisorNameEnglish || siForm.name}
                      onChange={e => setSiForm({ ...siForm, supervisorNameEnglish: e.target.value, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Supervisor Name (Gujarati) *</label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. રમેશ પટેલ"
                      value={siForm.supervisorNameGujarati}
                      onChange={e => setSiForm({ ...siForm, supervisorNameGujarati: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Code / Unique Identifier *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ramesh_si"
                      disabled={!!editingSi} // Code shouldn't be edited once created
                      value={siForm.username}
                      onChange={e => setSiForm({ ...siForm, username: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Staff Activation Status</label>
                    <select
                      value={siForm.isActive ? "true" : "false"}
                      onChange={e => setSiForm({ ...siForm, isActive: e.target.value === "true" })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="true">Active Staff Member</option>
                      <option value="false">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingSi(false);
                      setEditingSi(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    {editingSi ? "Update Record" : "Create Record"}
                  </button>
                </div>
              </form>
            )}

            {/* S.I. Accounts Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Supervisor Instructor</th>
                    <th className="p-4">System Identifier</th>
                    <th className="p-4">Registration Date</th>
                    <th className="p-4">Staff Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {sis.map(si => {
                    const assignedBatches = batches.filter(b => b.createdBy === si.id);
                    return (
                      <tr key={si.id} className="hover:bg-slate-50/30">
                        <td className="p-4">
                          <div className="font-bold text-slate-950 text-sm">{si.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Active Batches: {assignedBatches.filter(b => b.status === "APPROVED").map(b => b.displayName).join(", ") || "None"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">Unique Code: <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{si.username}</span></div>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{si.createdAt}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            si.isActive 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${si.isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
                            {si.isActive ? "ACTIVE" : "SUSPENDED"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingSi(si);
                                setSiForm({
                                  name: si.name,
                                  username: si.username,
                                  password: "",
                                  isActive: si.isActive,
                                  supervisorNameEnglish: si.supervisorNameEnglish || si.name,
                                  supervisorNameGujarati: si.supervisorNameGujarati || ""
                                });
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-300 cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => openSiProfileEditor(si)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1"
                              title="Edit Instructor Professional Profile"
                            >
                              <FileText size={11} /> Manage Profile
                            </button>
                            <button
                              onClick={() => toggleSiStatus(si)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                si.isActive 
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {si.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDeleteSi(si)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* S.I. Profile Modal (Full CRUD on si_profiles table) */}
            {selectedSiForProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Manage Instructor Professional Profile</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Updating profile of <strong>{selectedSiForProfile.name}</strong> • Connected with <code className="bg-slate-100 px-1 rounded text-indigo-600">si_profiles</code></p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedSiForProfile(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveSiProfile} className="p-6 space-y-4">
                    {/* Identification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Employee ID / Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. EMP-9824"
                          value={siProfileForm.employeeId}
                          onChange={e => setSiProfileForm({ ...siProfileForm, employeeId: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mobile Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +91 9876543210"
                          value={siProfileForm.mobile}
                          onChange={e => setSiProfileForm({ ...siProfileForm, mobile: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>

                    {/* Designation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Designation (English) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Supervisor Instructor"
                          value={siProfileForm.designationEnglish}
                          onChange={e => setSiProfileForm({ ...siProfileForm, designationEnglish: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Designation (Gujarati) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. સુપરવાઇઝર ઇન્સ્ટ્રક્ટર"
                          value={siProfileForm.designationGujarati}
                          onChange={e => setSiProfileForm({ ...siProfileForm, designationGujarati: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>

                    {/* Office */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Office Name (English) *</label>
                        <input
                          type="text"
                          required
                          value={siProfileForm.officeEnglish}
                          onChange={e => setSiProfileForm({ ...siProfileForm, officeEnglish: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Office Name (Gujarati) *</label>
                        <input
                          type="text"
                          required
                          value={siProfileForm.officeGujarati}
                          onChange={e => setSiProfileForm({ ...siProfileForm, officeGujarati: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Department (English) *</label>
                        <input
                          type="text"
                          required
                          value={siProfileForm.departmentEnglish}
                          onChange={e => setSiProfileForm({ ...siProfileForm, departmentEnglish: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Department (Gujarati) *</label>
                        <input
                          type="text"
                          required
                          value={siProfileForm.departmentGujarati}
                          onChange={e => setSiProfileForm({ ...siProfileForm, departmentGujarati: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>

                    {/* Salary */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monthly Basic Salary (INR) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 53100"
                        value={siProfileForm.salary}
                        onChange={e => setSiProfileForm({ ...siProfileForm, salary: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                      />
                    </div>

                    {/* Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address (English) *</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Enter residential address in English..."
                          value={siProfileForm.addressEnglish}
                          onChange={e => setSiProfileForm({ ...siProfileForm, addressEnglish: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address (Gujarati) *</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="રહેણાંક સરનામું ગુજરાતીમાં લખો..."
                          value={siProfileForm.addressGujarati}
                          onChange={e => setSiProfileForm({ ...siProfileForm, addressGujarati: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedSiForProfile(null)}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save Profile Details
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRADES MANAGEMENT TAB */}
        {activeTab === "trades" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Trade Management</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Define academic curriculum fields and toggle active/inactive status.</p>
              </div>
              {!isCreatingTrade && (
                <button
                  onClick={() => {
                    setTradeForm({ name: "", isActive: true, tradeNameEnglish: "", tradeNameGujarati: "" });
                    setEditingTrade(null);
                    setIsCreatingTrade(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold tracking-wide shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Academic Trade
                </button>
              )}
            </div>

            {/* Trade Register Form */}
            {isCreatingTrade && (
              <form onSubmit={handleSaveTrade} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  {editingTrade ? `Modify Trade: ${editingTrade.name}` : "Register New Curriculum Trade"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Trade Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Welder"
                      value={tradeForm.tradeNameEnglish || tradeForm.name}
                      onChange={e => setTradeForm({ ...tradeForm, tradeNameEnglish: e.target.value, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Trade Name (Gujarati) *</label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. વેલ્ડર"
                      value={tradeForm.tradeNameGujarati}
                      onChange={e => setTradeForm({ ...tradeForm, tradeNameGujarati: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Seat Capacity (બેઠક ક્ષમતા)</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={tradeForm.seatCapacity}
                      onChange={e => setTradeForm({ ...tradeForm, seatCapacity: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                    <select
                      value={tradeForm.isActive ? "true" : "false"}
                      onChange={e => setTradeForm({ ...tradeForm, isActive: e.target.value === "true" })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="true">Active (Enabled)</option>
                      <option value="false">Inactive (Disabled)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cancelEditTrade}
                    className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500"
                  >
                    {editingTrade ? "Update Trade" : "Register Trade"}
                  </button>
                </div>
              </form>
            )}

            {/* Trades Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Trade Name</th>
                    <th className="p-4">Seat Capacity</th>
                    <th className="p-4">Total Registered Batches</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {tradeObjects.map(trade => {
                    const associatedBatchesCount = batches.filter(b => b.tradeName === trade.name).length;
                    return (
                      <tr key={trade.id} className="hover:bg-slate-50/20">
                        <td className="p-4">
                          <div className="font-bold text-slate-950 text-sm">{trade.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase font-mono">ID: {trade.id}</div>
                        </td>
                        <td className="p-4 font-bold font-mono text-slate-800">
                          {trade.seatCapacity ? `${trade.seatCapacity} seats` : "Not specified"}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                            {associatedBatchesCount} Batches
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            trade.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-300"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${trade.isActive !== false ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {trade.isActive !== false ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEditTrade(trade)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-300 cursor-pointer"
                              title="Edit Name"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => toggleTradeStatus(trade)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                trade.isActive !== false
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {trade.isActive !== false ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BATCHES & ALLOTMENTS TAB */}
        {activeTab === "batches" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Batches & S.I. Allotments</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Admin-controlled system for trade batch setups and instructor assignment transfers.</p>
              </div>
              <div className="flex gap-2">
                {!isCreatingBatch && (
                  <button
                    onClick={() => {
                      const activeTradeList = tradeObjects.filter(t => t.isActive !== false);
                      setBatchForm({
                        tradeName: activeTradeList[0]?.name || "",
                        batchNumber: "",
                        batchSection: "A",
                        academicSession: `${new Date().getFullYear()}-${new Date().getFullYear() + 2}`,
                        year: "Year 1",
                        shift: "Shift 1",
                        assignedSIId: ""
                      });
                      setIsCreatingBatch(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold tracking-wide shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Training Batch
                  </button>
                )}
              </div>
            </div>

            {/* Batch Edit Form (Parameter override) */}
            {editingBatch && (
              <form onSubmit={handleSaveBatchEdit} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Edit Batch Parameters: {editingBatch.displayName}
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Session</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2025-2027"
                      value={batchEditForm.academicSession}
                      onChange={e => setBatchEditForm({ ...batchEditForm, academicSession: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
                    <select
                      value={batchEditForm.year}
                      onChange={e => setBatchEditForm({ ...batchEditForm, year: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Shift</label>
                    <select
                      value={batchEditForm.shift}
                      onChange={e => setBatchEditForm({ ...batchEditForm, shift: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="Shift 1">Shift 1</option>
                      <option value="Shift 2">Shift 2</option>
                      <option value="Shift 3">Shift 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Student Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={batchEditForm.capacity}
                      onChange={e => setBatchEditForm({ ...batchEditForm, capacity: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Batch Register Form */}
            {isCreatingBatch && (
              <form onSubmit={handleCreateBatchSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Register New Academic Batch
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Associated Trade *</label>
                    <select
                      required
                      value={batchForm.tradeName}
                      onChange={e => setBatchForm({ ...batchForm, tradeName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- Select Active Trade --</option>
                      {tradeObjects.filter(t => t.isActive !== false).map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Number (e.g. 84) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 84"
                      value={batchForm.batchNumber}
                      onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Section (e.g. A, B) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A"
                      value={batchForm.batchSection}
                      onChange={e => setBatchForm({ ...batchForm, batchSection: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Session *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2025-2027"
                      value={batchForm.academicSession}
                      onChange={e => setBatchForm({ ...batchForm, academicSession: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
                    <select
                      value={batchForm.year}
                      onChange={e => setBatchForm({ ...batchForm, year: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Shift</label>
                    <select
                      value={batchForm.shift}
                      onChange={e => setBatchForm({ ...batchForm, shift: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="Shift 1">Shift 1</option>
                      <option value="Shift 2">Shift 2</option>
                      <option value="Shift 3">Shift 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Student Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={batchForm.capacity}
                      onChange={e => setBatchForm({ ...batchForm, capacity: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Allot to S.I. Instructor</label>
                    <select
                      value={batchForm.assignedSIId}
                      onChange={e => setBatchForm({ ...batchForm, assignedSIId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- Leave Unassigned --</option>
                      {sis.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.username})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreatingBatch(false)}
                    className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500"
                  >
                    Create & Approve Batch
                  </button>
                </div>
              </form>
            )}

            {/* S.I. BATCH ALLOTMENT PANEL (BENTO WIDGET) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  📥 Fast Instructor Batch Allotment Panel
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Select an S.I. Instructor, then check/uncheck batches to assign or transfer them instantly.</p>
              </div>

              <form onSubmit={handleBatchAssignmentSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* S.I. Selector Column */}
                <div className="md:col-span-4 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">1. Select S.I. Faculty</label>
                  <select
                    required
                    value={assignmentSIId}
                    onChange={e => setAssignmentSIId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-extrabold border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {sis.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>👤 {s.name}</option>
                    ))}
                  </select>

                  {assignmentSIId && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Faculty Information</p>
                      <p className="text-xs text-slate-700 font-semibold">
                        Selected: <strong className="text-indigo-900">{sis.find(s => s.id === assignmentSIId)?.name}</strong>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Total Batches Currently Allotted: <strong className="text-indigo-900">{batches.filter(b => b.assignedSIId === assignmentSIId).length}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Batches Checkboxes Column */}
                <div className="md:col-span-8 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">2. Allotment Checklist</label>
                  
                  {batches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No batches created yet. Register a batch first.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      {batches.filter(b => b.status === BatchStatus.APPROVED).map(batch => {
                        const isChecked = selectedBatchIdsForAssignment.includes(batch.id);
                        const assignedToOther = batch.assignedSIId && batch.assignedSIId !== assignmentSIId;
                        return (
                          <label key={batch.id} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked 
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-3xs" 
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!assignmentSIId}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedBatchIdsForAssignment([...selectedBatchIdsForAssignment, batch.id]);
                                } else {
                                  setSelectedBatchIdsForAssignment(selectedBatchIdsForAssignment.filter(id => id !== batch.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <span className="font-extrabold text-sm font-mono block leading-none">{batch.displayName}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{batch.tradeName}</span>
                              {assignedToOther && (
                                <span className="text-[9px] text-amber-600 font-bold block mt-0.5 bg-amber-50 border border-amber-200/50 px-1 py-0.2 rounded-sm w-fit">
                                  ⚠️ Assigned to {batch.assignedSIName}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!assignmentSIId}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Update Faculty Allotments
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Global Batches Registry */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  All Registered Batches Registry
                </h3>
                
                {/* Registry filters */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search batch..."
                    value={batchSearch}
                    onChange={e => setBatchSearch(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white w-full sm:w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                  <select
                    value={batchTradeFilter}
                    onChange={e => setBatchTradeFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="">-- All Trades --</option>
                    {trades.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={batchSIFilter}
                    onChange={e => setBatchSIFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="">-- All S.I.s --</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                    {sis.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Filtering of Table */}
              {(() => {
                const filteredBatchesList = batches.filter(b => {
                  const matchesSearch = batchSearch === "" || b.displayName.toLowerCase().includes(batchSearch.toLowerCase());
                  const matchesTrade = batchTradeFilter === "" || b.tradeName === batchTradeFilter;
                  
                  let matchesSI = true;
                  if (batchSIFilter === "UNASSIGNED") {
                    matchesSI = !b.assignedSIId;
                  } else if (batchSIFilter !== "") {
                    matchesSI = b.assignedSIId === batchSIFilter;
                  }

                  return matchesSearch && matchesTrade && matchesSI;
                });

                return (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="p-4">Batch Identifier</th>
                            <th className="p-4">Session & Year / Shift</th>
                            <th className="p-4">Assigned Supervisor Instructor</th>
                            <th className="p-4">Transfer Batch Assignment</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {filteredBatchesList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium">
                                No training batches matched the current filter constraints.
                              </td>
                            </tr>
                          ) : (
                            filteredBatchesList.map(batch => {
                              const batchStudentsCount = students.filter(s => s.batchId === batch.id).length;
                              return (
                                <tr key={batch.id} className="hover:bg-slate-50/20">
                                  <td className="p-4">
                                    <div className="font-extrabold text-slate-900 text-sm">{batch.displayName}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase font-mono">Trade: {batch.tradeName}</div>
                                  </td>
                                  <td className="p-4 space-y-0.5">
                                    <div>Session: <strong className="text-slate-800 font-bold">{batch.academicSession}</strong></div>
                                    <div>Shift: <strong className="text-slate-800">{batch.year} • {batch.shift}</strong></div>
                                    <div className="text-[10px] text-slate-500 font-bold">Students: {batchStudentsCount} / {batch.capacity || "Unlimited"} enrolled</div>
                                  </td>
                                  <td className="p-4 font-bold text-slate-900 text-sm">
                                    {batch.assignedSIName ? (
                                      <span className="text-indigo-600 font-bold">👤 {batch.assignedSIName}</span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">⚠️ Unassigned</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {/* Quick transfer selector */}
                                    <select
                                      value={batch.assignedSIId || ""}
                                      onChange={e => handleQuickTransferBatch(batch.id, e.target.value || null)}
                                      className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white text-slate-700"
                                    >
                                      <option value="">Unassign</option>
                                      {sis.filter(s => s.isActive).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => startEditBatch(batch)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Edit Parameters
                                      </button>
                                      {batch.status === BatchStatus.APPROVED && (
                                        <button
                                          onClick={() => handleDeactivateBatch(batch)}
                                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Deactivate
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* S.I. BATCH ALLOTMENT TRANSFER LOG */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3 font-sans">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                📜 S.I. Allotment Transfer History Log
              </h3>
              <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                {assignmentHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No historical batch transfers have been recorded yet.</p>
                ) : (
                  assignmentHistory.slice().reverse().map(h => (
                    <div key={h.id} className="text-xs border-b border-slate-800 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-black text-indigo-400 font-mono">[{h.batchName}]</span>{" "}
                        {h.previousSIId ? (
                          <>
                            Transferred from <strong className="text-slate-300">{h.previousSIName}</strong> to <strong className="text-emerald-400">{h.newSIName || "Unassigned"}</strong>
                          </>
                        ) : (
                          <>
                            First allotted to <strong className="text-emerald-400">{h.newSIName}</strong>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 shrink-0 font-bold">
                        By Admin: <span className="text-slate-300">{h.assignedBy}</span> • {h.transferDate}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* STUDENT REGISTRY TAB */}
        {activeTab === "students" && (
          <div className="space-y-4 animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Student Registry & Records</h2>
                <p className="text-xs text-slate-500 font-medium">Search, filter, view profile folders, complete document checks, or manually register new trainees.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingStudent(!isCreatingStudent)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                {isCreatingStudent ? "✕ Close Form" : "➕ Register New Student"}
              </button>
            </div>

            {isCreatingStudent && (
              <form onSubmit={handleCreateStudentSubmit} className="p-6 bg-white border border-indigo-100 rounded-2xl shadow-xs space-y-4 animate-fadeIn">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider text-indigo-700">
                    Manually Register New Student
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Provide basic registration details. Allotted trade, session, year, and shift will be parsed from the selected batch automatically.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Student Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Student First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      value={studentForm.studentName}
                      onChange={e => setStudentForm({ ...studentForm, studentName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Father's Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Karsanbhai"
                      value={studentForm.fatherName}
                      onChange={e => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Surname */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Surname / Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Odedara"
                      value={studentForm.surname}
                      onChange={e => setStudentForm({ ...studentForm, surname: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Enrollment Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Enrollment Number (ENR) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ENR202684001"
                      value={studentForm.enrollmentNumber}
                      onChange={e => setStudentForm({ ...studentForm, enrollmentNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* CMD Deposit Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">CMD Deposit Receipt No</label>
                    <input
                      type="text"
                      placeholder="e.g. CMD-1092"
                      value={studentForm.cmdDepositNumber}
                      onChange={e => setStudentForm({ ...studentForm, cmdDepositNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Aadhaar Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Aadhaar Card Number</label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 345678901234"
                      value={studentForm.aadhaarNumber}
                      onChange={e => setStudentForm({ ...studentForm, aadhaarNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Date of Birth</label>
                    <input
                      type="date"
                      value={studentForm.dateOfBirth}
                      onChange={e => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Gender *</label>
                    <select
                      value={studentForm.gender}
                      onChange={e => setStudentForm({ ...studentForm, gender: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Batch Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Allot to Batch *</label>
                    <select
                      required
                      value={studentForm.batchId}
                      onChange={e => setStudentForm({ ...studentForm, batchId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-700"
                    >
                      <option value="">-- Select Target Batch --</option>
                      {batches.filter(b => b.status === "APPROVED").map(b => (
                        <option key={b.id} value={b.id}>{b.displayName} ({b.tradeName})</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Category *</label>
                    <select
                      value={studentForm.category}
                      onChange={e => setStudentForm({ ...studentForm, category: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="GEN">General (GEN / સામાન્ય)</option>
                      <option value="SEBC">SEBC / OBC (બક્ષીપંચ)</option>
                      <option value="SC">SC (અનુસૂચિત જાતિ)</option>
                      <option value="ST">ST (અનુસૂચિત જનજાતિ)</option>
                      <option value="EWS">EWS (આર્થિક નબળો વર્ગ)</option>
                    </select>
                  </div>

                  {/* Admission Year */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Admission Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026"
                      value={studentForm.admissionYear}
                      onChange={e => setStudentForm({ ...studentForm, admissionYear: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Student Mobile */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Student Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={studentForm.studentMobileNumber}
                      onChange={e => setStudentForm({ ...studentForm, studentMobileNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Parent Mobile */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Parent Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543211"
                      value={studentForm.parentMobileNumber}
                      onChange={e => setStudentForm({ ...studentForm, parentMobileNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Admission Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Admission Date</label>
                    <input
                      type="date"
                      value={studentForm.admissionDate}
                      onChange={e => setStudentForm({ ...studentForm, admissionDate: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                    />
                  </div>

                  {/* Address */}
                  <div className="col-span-1 sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-sans">Residential Address</label>
                    <textarea
                      placeholder="Enter complete resident address details..."
                      rows={2}
                      value={studentForm.address}
                      onChange={e => setStudentForm({ ...studentForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreatingStudent(false)}
                    className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                  >
                    Save & Enroll Student
                  </button>
                </div>
              </form>
            )}

            {/* Filtering Box */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-3xs grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  id="student-search-input"
                  type="text"
                  placeholder="Search by name, ENR, phone..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Trade Filter */}
              <div>
                <select
                  value={studentTradeFilter}
                  onChange={e => setStudentTradeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- All Trades --</option>
                  {trades.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Batch Filter */}
              <div>
                <select
                  value={studentBatchFilter}
                  onChange={e => setStudentBatchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- All Batches --</option>
                  {batches.filter(b => b.status === "APPROVED").map(b => (
                    <option key={b.id} value={b.id}>{b.displayName}</option>
                  ))}
                </select>
              </div>

              {/* Document Status Filter */}
              <div>
                <select
                  value={studentDocFilter}
                  onChange={e => setStudentDocFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- All Document Statuses --</option>
                  <option value="missing">Missing Required Docs (અપૂર્ણ દસ્તાવેજો)</option>
                  <option value="complete">All Docs Complete (પૂર્ણ દસ્તાવેજો)</option>
                </select>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>Showing {filteredStudents.length} of {students.length} students enrolled</span>
              
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-indigo-600 font-bold uppercase mr-1">CMD Register:</span>
                <button
                  onClick={() => exportCMDRegisterExcel(filteredStudents, "CMD_Register_Maintenance")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-colors cursor-pointer mr-2"
                  title="Export CMD Register (CMD Number, Trade, Student Full Name)"
                >
                  <FileSpreadsheet size={13} /> Export CMD Register (Excel)
                </button>

                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Missing Docs Report:</span>
                <button
                  onClick={() => exportMissingDocsExcel(filteredStudents, "Missing_Required_Documents_Report")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={12} /> Excel
                </button>
                <button
                  onClick={() => exportMissingDocsPDF(filteredStudents, "Missing_Required_Documents_Report")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-colors cursor-pointer"
                >
                  <FileText size={12} /> PDF
                </button>
                <button
                  onClick={() => exportMissingDocsWord(filteredStudents, "Missing_Required_Documents_Report")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-extrabold shadow-2xs transition-colors cursor-pointer"
                >
                  <FileText size={12} /> Word
                </button>
              </div>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                <GraduationCap size={44} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No matching students found</p>
                <p className="text-xs text-slate-400 mt-1">Try modifying your filtering or search terms.</p>
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
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-700 border border-indigo-200 rounded-md cursor-pointer transition-all"
                                >
                                  View Folder
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id, `${student.studentName} ${student.surname}`)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-700 border border-red-200 rounded-md cursor-pointer transition-all"
                                  title="Delete Student Record"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredStudents.length > STUDENTS_PER_PAGE && (
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
                        disabled={studentPage * STUDENTS_PER_PAGE >= filteredStudents.length}
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
                            {Math.min(studentPage * STUDENTS_PER_PAGE, filteredStudents.length)}
                          </span>{" "}
                          of <span className="font-extrabold">{filteredStudents.length}</span> students filtered
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
                          
                          {Array.from({ length: Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE) }).map((_, index) => {
                            const pageNum = index + 1;
                            if (
                              pageNum === 1 ||
                              pageNum === Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE) ||
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
                              pageNum === Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE) - 1
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
                            disabled={studentPage * STUDENTS_PER_PAGE >= filteredStudents.length}
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

        {/* EXITED ARCHIVES TAB */}
        {activeTab === "exited" && (
          <div className="space-y-4 animate-fadeIn">
            <ExitedStudentsList 
              onOpenProfile={(stu) => setSelectedStudent(stu)}
            />
          </div>
        )}

        {/* SYSTEM AUDITS TAB */}
        {activeTab === "logs" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">System Activity Audit Log</h2>
                <p className="text-xs text-slate-500 font-medium">Detailed tracking log of administrative portal actions for security audits.</p>
              </div>
              <button
                onClick={loadAllData}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                Refresh Logs
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 w-20">Log ID</th>
                    <th className="p-4 w-48">Actor User</th>
                    <th className="p-4">Action Done</th>
                    <th className="p-4 w-44 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600 font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30">
                      <td className="p-4 text-slate-400">#{log.id}</td>
                      <td className="p-4 font-bold text-slate-800 font-sans">{log.user}</td>
                      <td className="p-4 font-sans font-medium text-slate-700">{log.action}</td>
                      <td className="p-4 text-right text-slate-400">{log.date} {log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHOLARSHIP MANAGEMENT TAB */}
        {activeTab === "scholarships" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header with quick stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Scholarship & Stipend Directory</h2>
                <p className="text-xs text-slate-500 font-medium">Manage trainee scholarships, stipend eligibility, bank account statuses, and generate exports.</p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Trainees</p>
                <p className="text-xl font-black text-slate-800 mt-1">{students.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Digital Gujarat</p>
                <p className="text-xl font-black text-indigo-600 mt-1">
                  {students.filter(s => s.scholarshipType === "Digital Gujarat").length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Institute Stipend</p>
                <p className="text-xl font-black text-amber-600 mt-1">
                  {students.filter(s => s.scholarshipType === "Institute Stipend").length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Other / Scholarships</p>
                <p className="text-xl font-black text-teal-600 mt-1">
                  {students.filter(s => s.scholarshipType === "Other").length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs col-span-2 md:col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Approved / Completed</p>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {students.filter(s => s.scholarshipStatus === "Approved" || s.scholarshipStatus === "Completed").length}
                </p>
              </div>
            </div>

            {/* Universal Export Panel */}
            <div className="bg-indigo-950/95 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="text-sm font-bold">Universal Integrated Export Manager</h3>
                  <p className="text-[11px] text-slate-300">Generate and download official records for students, bank details, trades, batches, or on-roll sum.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                {[
                  { label: "Student Registry", action: (fmt: string) => {
                    const fn = "Student_Registry_Report";
                    if (fmt === "xlsx") exportStudentsExcel(students, fn);
                    else if (fmt === "pdf") exportStudentsPDF(students, fn);
                    else exportStudentsWord(students, fn);
                  }},
                  { label: "Scholarship Report", action: (fmt: string) => {
                    const fn = "Trainee_Scholarship_Distribution_Report";
                    if (fmt === "xlsx") exportScholarshipExcel(students, fn);
                    else if (fmt === "pdf") exportScholarshipPDF(students, fn);
                    else exportScholarshipWord(students, fn);
                  }},
                  { label: "Bank Details Directory", action: (fmt: string) => {
                    const fn = "Trainee_Bank_Accounts_Directory";
                    if (fmt === "xlsx") exportBankExcel(students, fn);
                    else if (fmt === "pdf") exportBankPDF(students, fn);
                    else exportBankWord(students, fn);
                  }},
                  { label: "Trade-wise Capacity", action: (fmt: string) => {
                    const fn = "Trade_Wise_Capacity_Summary";
                    if (fmt === "xlsx") exportTradeSummaryExcel(tradeObjects, students, fn);
                    else if (fmt === "pdf") exportTradeSummaryPDF(tradeObjects, students, fn);
                    else exportTradeSummaryWord(tradeObjects, students, fn);
                  }},
                  { label: "Batch-wise Intake", action: (fmt: string) => {
                    const fn = "Batch_Wise_Intake_Summary";
                    if (fmt === "xlsx") exportBatchSummaryExcel(batches, students, fn);
                    else if (fmt === "pdf") exportBatchSummaryPDF(batches, students, fn);
                    else exportBatchSummaryWord(batches, students, fn);
                  }},
                  { label: "On-Roll Summary", action: (fmt: string) => {
                    const fn = "On_Roll_Trainees_Directory";
                    if (fmt === "xlsx") exportOnRollSummaryExcel(students, fn);
                    else if (fmt === "pdf") exportOnRollSummaryPDF(students, fn);
                    else exportOnRollSummaryWord(students, fn);
                  }}
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/10 p-3 rounded-xl border border-white/10 flex flex-col justify-between space-y-2">
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => item.action("xlsx")}
                        className="flex-1 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-[9px] font-bold rounded text-emerald-400 border border-emerald-500/20 transition-colors"
                      >
                        Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => item.action("pdf")}
                        className="flex-1 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-[9px] font-bold rounded text-rose-400 border border-rose-500/20 transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => item.action("word")}
                        className="flex-1 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-[9px] font-bold rounded text-indigo-400 border border-indigo-500/20 transition-colors"
                      >
                        Word
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-3xs">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Trainee</label>
                  <input
                    type="text"
                    value={scholarshipSearchText}
                    onChange={e => setScholarshipSearchText(e.target.value)}
                    placeholder="Search by name/enrollment..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scholarship Type</label>
                  <select
                    value={scholarshipTypeFilter}
                    onChange={e => setScholarshipTypeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">All Types</option>
                    <option value="None">None</option>
                    <option value="Digital Gujarat">Digital Gujarat</option>
                    <option value="Institute Stipend">Institute Stipend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    value={scholarshipStatusFilter}
                    onChange={e => setScholarshipStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="Applied">Applied</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Trade</label>
                  <select
                    value={scholarshipTradeFilter}
                    onChange={e => setScholarshipTradeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">All Trades</option>
                    {trades.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Batch</label>
                  <select
                    value={scholarshipBatchFilter}
                    onChange={e => setScholarshipBatchFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">All Batches</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.tradeName} - {b.batchNumber}{b.batchSection}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Trainee</th>
                      <th className="p-3">Trade / Batch</th>
                      <th className="p-3">Scholarship Info</th>
                      <th className="p-3">Bank Details</th>
                      <th className="p-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                    {(() => {
                      const filtered = students.filter(s => {
                        const matchesSearch = scholarshipSearchText === "" || 
                          `${s.studentName} ${s.fatherName} ${s.surname}`.toLowerCase().includes(scholarshipSearchText.toLowerCase()) ||
                          s.enrollmentNumber.toLowerCase().includes(scholarshipSearchText.toLowerCase());
                        const matchesType = scholarshipTypeFilter === "" || s.scholarshipType === scholarshipTypeFilter || (scholarshipTypeFilter === "None" && (!s.scholarshipType || s.scholarshipType === "None"));
                        const matchesStatus = scholarshipStatusFilter === "" || s.scholarshipStatus === scholarshipStatusFilter;
                        const matchesTrade = scholarshipTradeFilter === "" || s.trade.toLowerCase() === scholarshipTradeFilter.toLowerCase();
                        const matchesBatch = scholarshipBatchFilter === "" || s.batchId === scholarshipBatchFilter;
                        return matchesSearch && matchesType && matchesStatus && matchesTrade && matchesBatch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                              No trainees match the selected filters.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/30">
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{s.studentName} {s.surname}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.enrollmentNumber}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-slate-700">{s.trade}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.batchName}</p>
                          </td>
                          <td className="p-3">
                            {s.scholarshipType && s.scholarshipType !== "None" ? (
                              <div className="space-y-1">
                                <p className="text-indigo-600 font-bold">{s.scholarshipType}</p>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {s.scholarshipId || "N/A"}</p>
                                <p className="text-[10px] text-slate-400">AY: {s.scholarshipAcademicYear || "N/A"}</p>
                                <span className={`inline-flex items-center px-1.5 py-0.25 rounded text-[9px] font-bold uppercase ${
                                  s.scholarshipStatus === "Approved" || s.scholarshipStatus === "Completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : s.scholarshipStatus === "Rejected"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                }`}>
                                  {s.scholarshipStatus || "Pending"}
                                </span>
                              </div>
                            ) : (
                              <p className="text-slate-400">None</p>
                            )}
                          </td>
                          <td className="p-3">
                            {s.bankAccountNumber ? (
                              <div className="space-y-0.5">
                                <p className="text-slate-800 font-bold leading-tight">{s.bankAccountHolderName}</p>
                                <p className="text-slate-500 font-medium">{s.bankName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  No: {s.bankAccountNumber.trim().length > 4 ? `•••• •••• ${s.bankAccountNumber.trim().slice(-4)}` : "••••"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">IFSC: {s.bankIfscCode}</p>
                              </div>
                            ) : (
                              <p className="text-slate-400">No bank details added</p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(s)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-md transition-colors cursor-pointer"
                            >
                              Edit Details
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE MANAGEMENT TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header and sub-tab selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Monthly Attendance Directory</h2>
                <p className="text-xs text-slate-500 font-medium">Configure monthly working days and view trainee attendance performance dashboard across trades.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-300/80 shadow-3xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAttendanceSubTab("dashboard")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceSubTab === "dashboard"
                      ? "bg-white text-slate-800 shadow-3xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Dashboard & Logs
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceSubTab("config")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceSubTab === "config"
                      ? "bg-white text-slate-800 shadow-3xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Working Days Config
                </button>
              </div>
            </div>

            {/* Sub-tab 1: DASHBOARD */}
            {attendanceSubTab === "dashboard" && (
              <div className="space-y-6">
                {/* Stats row */}
                {(() => {
                  const filteredRecords = attendanceList.filter(rec => {
                    const matchesTrade = attTradeFilter === "" || rec.trade.toLowerCase() === attTradeFilter.toLowerCase();
                    const matchesBatch = attBatchFilter === "" || rec.batchId === attBatchFilter;
                    const matchesMonth = attMonthFilter === "" || rec.month === attMonthFilter;
                    const matchesYear = attYearFilter === "" || rec.academicYear === attYearFilter;
                    const matchesSearch = attSearchText === "" || 
                      rec.studentName.toLowerCase().includes(attSearchText.toLowerCase()) ||
                      rec.enrollmentNumber.toLowerCase().includes(attSearchText.toLowerCase());
                    
                    let matchesPercent = true;
                    if (attPercentFilter === "BELOW_80") {
                      matchesPercent = rec.attendancePercentage < 80;
                    } else if (attPercentFilter === "80_ABOVE") {
                      matchesPercent = rec.attendancePercentage >= 80;
                    }
                    return matchesTrade && matchesBatch && matchesMonth && matchesYear && matchesPercent && matchesSearch;
                  });

                  // Calculate stats
                  const totalRecordsCount = filteredRecords.length;
                  const avgPercent = totalRecordsCount > 0 
                    ? (filteredRecords.reduce((sum, rec) => sum + rec.attendancePercentage, 0) / totalRecordsCount).toFixed(2)
                    : "0.00";

                  // Find Highest/Lowest average attendance batches
                  const batchAverages: { [key: string]: { sum: number; count: number; name: string } } = {};
                  filteredRecords.forEach(rec => {
                    if (!batchAverages[rec.batchId]) {
                      batchAverages[rec.batchId] = { sum: 0, count: 0, name: rec.batchName };
                    }
                    batchAverages[rec.batchId].sum += rec.attendancePercentage;
                    batchAverages[rec.batchId].count += 1;
                  });

                  let highestBatchName = "N/A";
                  let highestBatchVal = -1;
                  let lowestBatchName = "N/A";
                  let lowestBatchVal = 101;

                  Object.values(batchAverages).forEach(ba => {
                    const avg = ba.sum / ba.count;
                    if (avg > highestBatchVal) {
                      highestBatchVal = avg;
                      highestBatchName = ba.name;
                    }
                    if (avg < lowestBatchVal) {
                      lowestBatchVal = avg;
                      lowestBatchName = ba.name;
                    }
                  });

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Average Attendance</p>
                          <p className="text-2xl font-black text-indigo-600 mt-1">{avgPercent}%</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Across filtered trainees</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Highest Performing Batch</p>
                          <p className="text-sm font-bold text-slate-800 mt-2 truncate">{highestBatchName}</p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">
                            {highestBatchVal > -1 ? `${highestBatchVal.toFixed(2)}% Avg` : "N/A"}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Lowest Performing Batch</p>
                          <p className="text-sm font-bold text-slate-800 mt-2 truncate">{lowestBatchName}</p>
                          <p className="text-xs font-black text-rose-600 mt-0.5">
                            {lowestBatchVal < 101 ? `${lowestBatchVal.toFixed(2)}% Avg` : "N/A"}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Trainees Tracked</p>
                          <p className="text-2xl font-black text-slate-800 mt-1">{totalRecordsCount}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Monthly log records</p>
                        </div>
                      </div>

                      {/* Filter panel */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-3xs">
                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Trainee</label>
                            <input
                              type="text"
                              value={attSearchText}
                              onChange={e => setAttSearchText(e.target.value)}
                              placeholder="Name or enrollment..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
                            <select
                              value={attYearFilter}
                              onChange={e => setAttYearFilter(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <option value="">All Years</option>
                              <option value="2025-26">2025-26</option>
                              <option value="2026-27">2026-27</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
                            <select
                              value={attMonthFilter}
                              onChange={e => setAttMonthFilter(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <option value="">All Months</option>
                              {Array.from(new Set(attendanceList.map(item => item.month))).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Trade</label>
                            <select
                              value={attTradeFilter}
                              onChange={e => setAttTradeFilter(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <option value="">All Trades</option>
                              {trades.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Class</label>
                            <select
                              value={attPercentFilter}
                              onChange={e => setAttPercentFilter(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <option value="ALL">All Attendance</option>
                              <option value="BELOW_80">Below Required (&lt; 80%)</option>
                              <option value="80_ABOVE">Eligible (&gt;= 80%)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Trainee Records Table */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="p-3">Trainee Name</th>
                                <th className="p-3">Trade / Batch</th>
                                <th className="p-3 text-center">Month</th>
                                <th className="p-3 text-center">Working Days</th>
                                <th className="p-3 text-center">Present Days</th>
                                <th className="p-3 text-center">Percentage</th>
                                <th className="p-3 text-center">Eligibility Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                              {filteredRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                                    No attendance records found matching filters.
                                  </td>
                                </tr>
                              ) : (
                                filteredRecords.map(rec => (
                                  <tr key={rec.id} className="hover:bg-slate-50/30">
                                    <td className="p-3">
                                      <p className="font-bold text-slate-800">{rec.studentName}</p>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.enrollmentNumber}</p>
                                    </td>
                                    <td className="p-3">
                                      <p className="text-slate-700">{rec.trade}</p>
                                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{rec.batchName}</p>
                                    </td>
                                    <td className="p-3 text-center text-slate-700">{rec.month}</td>
                                    <td className="p-3 text-center text-slate-800 font-bold">{rec.workingDays}</td>
                                    <td className="p-3 text-center text-indigo-600 font-black">{rec.presentDays}</td>
                                    <td className="p-3 text-center">
                                      <span className={`font-black text-sm ${rec.attendancePercentage >= 80 ? "text-emerald-600" : "text-rose-600"}`}>
                                        {rec.attendancePercentage}%
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                        rec.attendancePercentage >= 80
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : "bg-rose-50 text-rose-700 border border-rose-100"
                                      }`}>
                                        {rec.attendancePercentage >= 80 ? "Eligible" : "Below Required"}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Sub-tab 2: WORKING DAYS CONFIG */}
            {attendanceSubTab === "config" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Creator Form */}
                <div className="md:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span>⚙️</span> {editingWdId ? "Edit Working Days" : "Add Monthly Working Days"}
                  </h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (wdDays < 1 || wdDays > 31) {
                      alert("Working days must be between 1 and 31.");
                      return;
                    }
                    const newWd = {
                      id: editingWdId || "wd-" + generateId(),
                      academicYear: wdAcademicYear,
                      month: wdMonth,
                      workingDays: wdDays
                    };
                    saveWorkingDays(newWd);
                    addAuditLog(currentUser.name, `${editingWdId ? "Updated" : "Added"} monthly working days config for ${wdMonth} (${wdDays} days)`);
                    
                    // Reset Form
                    setEditingWdId(null);
                    setWdDays(26);
                    loadAllData();
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year (શૈક્ષણિક વર્ષ)</label>
                      <select
                        value={wdAcademicYear}
                        onChange={e => setWdAcademicYear(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="2025-26">2025-26</option>
                        <option value="2026-27">2026-27</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month & Year (માસ અને વર્ષ)</label>
                      <select
                        value={wdMonth}
                        onChange={e => setWdMonth(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="January 2026">January 2026</option>
                        <option value="February 2026">February 2026</option>
                        <option value="March 2026">March 2026</option>
                        <option value="April 2026">April 2026</option>
                        <option value="May 2026">May 2026</option>
                        <option value="June 2026">June 2026</option>
                        <option value="July 2026">July 2026</option>
                        <option value="August 2026">August 2026</option>
                        <option value="September 2026">September 2026</option>
                        <option value="October 2026">October 2026</option>
                        <option value="November 2026">November 2026</option>
                        <option value="December 2026">December 2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Working Days (કુલ કામકાજના દિવસો)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={wdDays}
                        onChange={e => setWdDays(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 26"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {editingWdId ? "Update Config" : "Save Config"}
                      </button>
                      {editingWdId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWdId(null);
                            setWdDays(26);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Configurations List */}
                <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    Configured Working Days
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Month</th>
                          <th className="p-3">Academic Year</th>
                          <th className="p-3 text-center">Working Days</th>
                          <th className="p-3 text-center w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                        {workingDaysList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                              No working days configured yet. Use the form to configure.
                            </td>
                          </tr>
                        ) : (
                          workingDaysList.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/30">
                              <td className="p-3 font-bold text-slate-800">{item.month}</td>
                              <td className="p-3 text-slate-500">{item.academicYear}</td>
                              <td className="p-3 text-center text-indigo-600 font-black">{item.workingDays} Days</td>
                              <td className="p-3 text-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingWdId(item.id);
                                    setWdAcademicYear(item.academicYear);
                                    setWdMonth(item.month);
                                    setWdDays(item.workingDays);
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete working days configuration for ${item.month}?`)) {
                                      deleteWorkingDays(item.id);
                                      addAuditLog(currentUser.name, `Deleted monthly working days config for ${item.month}`);
                                      loadAllData();
                                    }
                                  }}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROMOTIONS TAB */}
        {activeTab === "promotions" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>🚀</span> Student Promotion & Batch Forwarding (પ્રમોશન અને બેચ ફોરવર્ડિંગ)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Promote individual trainees, entire batches, or entire trades. Keep audit trails and perform instant reversals.
                </p>
              </div>
              
              {/* Sub-tab Switchers */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start border border-slate-200 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setPromoSubTab("promote")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    promoSubTab === "promote"
                      ? "bg-white text-indigo-700 shadow-3xs border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🚀 Promote Students
                </button>
                <button
                  type="button"
                  onClick={() => setPromoSubTab("history")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    promoSubTab === "history"
                      ? "bg-white text-indigo-700 shadow-3xs border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📋 Promotion History
                </button>
                <button
                  type="button"
                  onClick={() => setPromoSubTab("stats")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    promoSubTab === "stats"
                      ? "bg-white text-indigo-700 shadow-3xs border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📊 Analytics Dashboard
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Promote Wizard */}
            {promoSubTab === "promote" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Source Filters Card */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="text-base">⚙️</span>
                        <h3 className="text-sm font-bold text-slate-800">1. Source Selection (સોર્સ પસંદ કરો)</h3>
                      </div>

                      {/* Trade Select */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Trade (વ્યવસાય)</label>
                        <select
                          value={promoSrcTrade}
                          onChange={e => {
                            setPromoSrcTrade(e.target.value);
                            setPromoSrcBatchId("");
                            setPromoSelectedStudentIds([]);
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                        >
                          <option value="">-- All Trades --</option>
                          {trades.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Batch Select */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Batch (બેચ)</label>
                        <select
                          value={promoSrcBatchId}
                          onChange={e => {
                            setPromoSrcBatchId(e.target.value);
                            setPromoSelectedStudentIds([]);
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                        >
                          <option value="">-- All Batches --</option>
                          {batches
                            .filter(b => b.status === BatchStatus.APPROVED && (!promoSrcTrade || b.tradeName === promoSrcTrade))
                            .map(b => (
                              <option key={b.id} value={b.id}>{b.displayName} ({b.academicSession})</option>
                            ))}
                        </select>
                      </div>

                      <div className="pt-2">
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                          <span>Students Loaded:</span>
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px]">{activeSrcStudents.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Destination Batch Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="text-base">🎯</span>
                        <h3 className="text-sm font-bold text-slate-800">3. Destination Batch (પ્રમોશન બેચ)</h3>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Batch (લક્ષ્ય બેચ)</label>
                        <select
                          value={promoDestBatchId}
                          onChange={e => setPromoDestBatchId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500 text-indigo-600 font-extrabold"
                        >
                          <option value="">-- Select Destination Batch --</option>
                          {batches
                            .filter(b => b.status === BatchStatus.APPROVED && b.id !== promoSrcBatchId)
                            .map(b => (
                              <option key={b.id} value={b.id}>{b.displayName} ({b.academicSession}) • {b.year} • {b.shift}</option>
                            ))}
                        </select>
                      </div>

                      {destBatch && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-1 uppercase text-[9px] tracking-wider">Target Details</h4>
                          <div className="grid grid-cols-2 gap-2 font-semibold text-slate-600">
                            <div>Trade: <span className="text-slate-800 font-bold">{destBatch.tradeName}</span></div>
                            <div>Session: <span className="text-slate-800 font-bold">{destBatch.academicSession}</span></div>
                            <div>Section: <span className="text-slate-800 font-bold">{destBatch.batchSection}</span></div>
                            <div>Year/Shift: <span className="text-slate-800 font-bold">{destBatch.year} / {destBatch.shift}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student List Grid selection */}
                  <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex-1 flex flex-col space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">👥</span>
                          <h3 className="text-sm font-bold text-slate-800">2. Select Trainees (તાલીમાર્થીઓ પસંદ કરો)</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllVisible}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {activeSrcStudents.length > 0 && activeSrcStudents.every(s => promoSelectedStudentIds.includes(s.id))
                              ? "Deselect All Visible"
                              : "Select All Visible"
                            }
                          </button>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs font-semibold text-slate-500">
                            Selected: <span className="text-indigo-600 font-black">{promoSelectedStudentIds.length}</span>
                          </span>
                        </div>
                      </div>

                      {/* Search students */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by Trainee Name or Enrollment Number..."
                          value={promoSearch}
                          onChange={e => setPromoSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                        />
                      </div>

                      {/* Students Scroller table */}
                      <div className="overflow-y-auto max-h-[340px] border border-slate-200 rounded-xl flex-1">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="p-3 w-12 text-center">Select</th>
                              <th className="p-3">Trainee Name</th>
                              <th className="p-3">Enrollment No</th>
                              <th className="p-3">Current Batch</th>
                              <th className="p-3">Trade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                            {activeSrcStudents.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-10 text-center text-slate-400 font-medium">
                                  No active trainees found matching the filters.
                                </td>
                              </tr>
                            ) : (
                              activeSrcStudents.map(student => {
                                const isChecked = promoSelectedStudentIds.includes(student.id);
                                return (
                                  <tr 
                                    key={student.id} 
                                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isChecked ? "bg-indigo-50/25" : ""}`}
                                    onClick={() => {
                                      setPromoSelectedStudentIds(prev => 
                                        prev.includes(student.id)
                                          ? prev.filter(id => id !== student.id)
                                          : [...prev, student.id]
                                      );
                                    }}
                                  >
                                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setPromoSelectedStudentIds(prev => 
                                            prev.includes(student.id)
                                              ? prev.filter(id => id !== student.id)
                                              : [...prev, student.id]
                                          );
                                        }}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded-md focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">{student.studentName} {student.surname}</td>
                                    <td className="p-3 text-slate-500 font-mono text-[11px]">{student.enrollmentNumber}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px]">{student.batchName}</span></td>
                                    <td className="p-3 text-slate-500">{student.trade}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* STEP 4: PREVIEW PANEL */}
                      {promoSelectedStudentIds.length > 0 && destBatch && (
                        <div className="p-4 rounded-xl border space-y-3 shadow-3xs animate-fadeIn bg-white border-slate-200 mt-2">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📋</span> 4. Promotion Verification (ચકાસણી)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Promotion Size</p>
                              <p className="font-bold text-slate-700">Selected <span className="text-indigo-600 font-black">{promoSelectedStudentIds.length}</span> students</p>
                            </div>
                            <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                              <p className="text-[10px] text-indigo-400 font-bold uppercase mb-0.5">Forwarding Destination</p>
                              <p className="font-bold text-indigo-700">{destBatch.displayName} • {destBatch.academicSession}</p>
                            </div>
                          </div>

                          {/* Duplicate check visualization */}
                          {hasConflicts ? (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                              <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                DUPLICATE DETECTED: {duplicateConflicts.length} Conflicts Found!
                              </p>
                              <p className="text-[10px] text-rose-500 font-medium leading-relaxed">
                                The following students are already registered / active in the target batch. You cannot promote them again:
                              </p>
                              <div className="max-h-24 overflow-y-auto divide-y divide-rose-100/50 pt-1">
                                {duplicateConflicts.map(c => (
                                  <div key={c.id} className="text-[10px] py-1 font-bold text-rose-600 flex justify-between">
                                    <span>{c.studentName} {c.surname}</span>
                                    <span className="font-mono">{c.enrollmentNumber}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-emerald-800">✅ Duplicate Check Passed</p>
                                <p className="text-[10px] text-emerald-600 font-medium">All enrollment numbers are unique in the target batch. Safe to forward.</p>
                              </div>
                            </div>
                          )}

                          {/* Execute Button */}
                          <button
                            type="button"
                            onClick={handleExecutePromotion}
                            disabled={hasConflicts}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs ${
                              hasConflicts
                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.01]"
                            }`}
                          >
                            <span>🚀</span> Confirm & Execute Batch Forwarding
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Sub-Tab 2: History and Reversals */}
            {promoSubTab === "history" && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>📋</span> Promotion Audit History (પ્રમોશન લૉગ્સ)
                    </h3>

                    {/* Export buttons row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportPromotionHistoryExcel(filteredHistory)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <span>📊</span> Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPromotionHistoryPDF(filteredHistory)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <span>📄</span> Export PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPromotionHistoryWord(filteredHistory)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <span>📝</span> Export Word
                      </button>
                    </div>
                  </div>

                  {/* Search filter for history */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search history by Trainee Name, Enrollment Number, old/new batch, or administrator..."
                      value={promoHistSearch}
                      onChange={e => setPromoHistSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                    />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Trainee Name</th>
                          <th className="p-3">Enrollment No</th>
                          <th className="p-3">Old Class (Trade / Batch)</th>
                          <th className="p-3">New Class (Trade / Batch)</th>
                          <th className="p-3 text-center">Promotion Date</th>
                          <th className="p-3 text-center">Promoted By</th>
                          <th className="p-3 text-center w-36">Status / Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-slate-400 font-medium">
                              No promotion events found.
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50/30">
                              <td className="p-3 font-bold text-slate-800">{record.studentName}</td>
                              <td className="p-3 font-mono text-[11px] text-slate-500">{record.enrollmentNumber}</td>
                              <td className="p-3">
                                <div className="text-slate-700">{record.oldTrade}</div>
                                <div className="text-[10px] text-slate-400">{record.oldBatchName} ({record.oldYear})</div>
                              </td>
                              <td className="p-3">
                                <div className="text-indigo-600 font-bold">{record.newTrade}</div>
                                <div className="text-[10px] text-indigo-400">{record.newBatchName} ({record.newYear})</div>
                              </td>
                              <td className="p-3 text-center font-mono text-slate-500">{record.promotionDate}</td>
                              <td className="p-3 text-center text-slate-700">{record.promotedBy}</td>
                              <td className="p-3 text-center">
                                {record.isReversed ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200/50 rounded-md text-[9px] font-bold">
                                      Undone (રીવર્સ કરેલ)
                                    </span>
                                    <div className="text-[9px] text-slate-400 scale-95" title={`Reversed by ${record.reversedBy} on ${record.reversedDate}`}>
                                      by {record.reversedBy}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleReverse(record)}
                                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-800 border border-slate-200 hover:border-rose-200 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer"
                                  >
                                    ↩ Reverse (Undo)
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Sub-Tab 3: Analytics Dashboard */}
            {promoSubTab === "stats" && (
              <div className="space-y-6 animate-fadeIn">
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-[110px]">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promoted Today (આજે પ્રમોટ)</p>
                      <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-slate-800">{promotedToday}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Today</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-[110px]">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Promotions (કુલ પ્રમોશન)</p>
                      <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-emerald-600">{activePromo.length}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">Total Active</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-[110px]">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reversed Actions (પુલબેક)</p>
                      <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-rose-500">{promotionHistory.filter(p => p.isReversed).length}</span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Undone Logs</span>
                      </div>
                    </div>

                    <div className="bg-indigo-600 p-5 rounded-2xl flex flex-col justify-between shadow-lg shadow-indigo-100 min-h-[110px]">
                      <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Promotion Success Rate</p>
                      <div className="flex items-end justify-between text-white mt-2">
                        <span className="text-3xl font-black">
                          {promotionHistory.length > 0 
                            ? Math.round((activePromo.length / promotionHistory.length) * 100)
                            : 100
                          }%
                        </span>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 border border-white/20 rounded-md">Accuracy</span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown Graphs bento grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Month-wise Promotions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🗓️ Month-wise Promotions (માસિક પ્રમોશન)</h4>
                      </div>
                      <div className="space-y-3">
                        {Object.keys(monthWiseMap).length === 0 ? (
                          <p className="text-xs font-medium text-slate-400 text-center py-6">No promotions data available yet.</p>
                        ) : (
                          Object.entries(monthWiseMap).map(([month, count]) => (
                            <div key={month} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>{month}</span>
                                <span>{count} Trainees</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${(count / maxMonthCount) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Trade-wise Promotions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🔧 Trade-wise Promotions (ટ્રેડ-વાઇઝ પ્રમોશન)</h4>
                      </div>
                      <div className="space-y-3">
                        {Object.keys(tradeWiseMap).length === 0 ? (
                          <p className="text-xs font-medium text-slate-400 text-center py-6">No trade promotions data available yet.</p>
                        ) : (
                          Object.entries(tradeWiseMap).map(([trade, count]) => (
                            <div key={trade} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>{trade}</span>
                                <span>{count} Trainees</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${(count / maxTradeCount) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Batch-wise Promotions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🛠️ Batch-wise Promotions (બેચ-વાઇઝ પ્રમોશન)</h4>
                      </div>
                      <div className="space-y-3">
                        {Object.keys(batchWiseMap).length === 0 ? (
                          <p className="text-xs font-medium text-slate-400 text-center py-6">No batch promotions data available yet.</p>
                        ) : (
                          Object.entries(batchWiseMap).map(([batchName, count]) => (
                            <div key={batchName} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>{batchName}</span>
                                <span>{count} Trainees</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-400 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${(count / maxBatchCount) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
          </div>
        )}

        {/* LEAVE MANAGEMENT TAB */}
        {activeTab === "leave_management" && (
          <LeaveManagementModule currentUser={currentUser} />
        )}

        {/* GENERAL LETTER & HAJAR REPORT TAB */}
        {activeTab === "general_letter" && (
          <GeneralLetterModule currentUser={currentUser} />
        )}

        {/* REPORT HISTORY TAB */}
        {activeTab === "report_history" && (
          <ReportHistoryModule currentUser={currentUser} />
        )}

        </main>
        
        {/* Footer with Developer Attribution */}
        <footer className="mt-auto py-4 border-t border-slate-200 bg-white text-center text-[11px] font-bold text-slate-500">
          App Developer: Gaurav Dodiya (ITI Porbandar)
        </footer>
      </div>

      {/* STUDENT PROFILE FLOATING MODAL */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          currentUser={currentUser}
          onClose={() => setSelectedStudent(null)}
          onUpdate={() => {
            loadAllData();
            // also update the selectedStudent if currently displayed
            const updated = getStudents().find(s => s.id === selectedStudent.id);
            if (updated) setSelectedStudent(updated);
          }}
        />
      )}

    </div>
  );
}
