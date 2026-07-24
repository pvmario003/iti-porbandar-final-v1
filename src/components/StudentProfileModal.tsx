import React, { useState, useEffect } from "react";
import { 
  X, Phone, Calendar, User, FileText, BadgeCheck, ShieldAlert, Edit, Save, Undo, Info,
  Upload, Eye, Trash2, FolderOpen, Lock, Download, Loader
} from "lucide-react";
import { 
  Student, 
  StudentStatus, 
  STUDENT_STATUS_LABELS, 
  StudentStatusHistory, 
  UserRole,
  Batch
} from "../types";
import { 
  getHistory, 
  addHistoryRecord, 
  saveStudent, 
  addAuditLog,
  getBatches,
  transliterateEnglishToGujarati
} from "../utils/storage";
import { isSupabaseConfigured, uploadToStorage, BUCKETS } from "../utils/supabaseClient";

export const DOCUMENT_TYPES = [
  { key: "aadhaar", label: "Aadhaar Card", guLabel: "આધાર કાર્ડ", required: true },
  { key: "photo", label: "Photo", guLabel: "ફોટો", required: true },
  { key: "bank_passbook", label: "Bank Passbook", guLabel: "બેંક પાસબુક", required: true },
  { key: "leaving_certificate", label: "Leaving Certificate", guLabel: "શાળા છોડ્યાનું પ્રમાણપત્ર", required: true },
  { key: "ssc_marksheet", label: "SSC Marksheet", guLabel: "એસએસસી માર્કશીટ", required: true },
  { key: "caste_certificate", label: "Caste Certificate", guLabel: "જાતિનું પ્રમાણપત્ર", required: false },
  { key: "income_certificate", label: "Income Certificate", guLabel: "આવકનું પ્રમાણપત્ર", required: false },
  { key: "disability_certificate", label: "Disability Certificate (if applicable)", guLabel: "વિકલાંગતા પ્રમાણપત્ર (લાગુ પડતું હોય તો)", required: false },
  { key: "passport_size_photo", label: "Passport Size Photo", guLabel: "પાસપોર્ટ સાઇઝ ફોટો", required: true },
  { key: "other_documents", label: "Other Documents", guLabel: "અન્ય દસ્તાવેજો", required: false }
];

interface StudentProfileModalProps {
  student: Student;
  currentUser: { id: string; name: string; role: UserRole };
  onClose: () => void;
  onUpdate: () => void;
}

export default function StudentProfileModal({
  student: initialStudent,
  currentUser,
  onClose,
  onUpdate
}: StudentProfileModalProps) {
  const [student, setStudent] = useState<Student>(initialStudent);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; fileData: string; fileType: string; fileName: string } | null>(null);

  const studentBatch = batches.find(b => b.id === student.batchId) || getBatches().find(b => b.id === student.batchId);
  const isDocAuthorized = currentUser.role === UserRole.ADMIN || (studentBatch && studentBatch.assignedSIId === currentUser.id);

  const handleDocUpload = async (docKey: string, file: File) => {
    if (!file) return;

    if (isSupabaseConfigured) {
      try {
        const bucketName = (docKey === "photo" || docKey === "passport_size_photo")
          ? BUCKETS.PHOTOS
          : BUCKETS.DOCUMENTS;
        
        const filePath = `${student.id}/${docKey}_${Date.now()}_${file.name}`;
        
        const publicUrl = await uploadToStorage(bucketName, filePath, file, file.type);
        
        if (publicUrl) {
          const updatedDocs = {
            ...(student.documents || {}),
            [docKey]: {
              fileName: file.name,
              fileType: file.type,
              fileData: publicUrl,
              uploadedAt: new Date().toISOString()
            }
          };
          
          const updatedStudent: Student = {
            ...student,
            documents: updatedDocs,
            updatedAt: new Date().toISOString()
          };
          
          saveStudent(updatedStudent);
          setStudent(updatedStudent);
          addAuditLog(
            currentUser.name,
            `Uploaded document ${docKey} (${file.name}) to Supabase for student ${student.studentName} ${student.surname} (${student.enrollmentNumber})`
          );
          onUpdate();
          return;
        }
      } catch (err: any) {
        console.error("Supabase file upload failed, falling back to local:", err);
        alert(`Supabase upload failed: ${err.message}. Saving locally instead.`);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const updatedDocs = {
        ...(student.documents || {}),
        [docKey]: {
          fileName: file.name,
          fileType: file.type,
          fileData: base64Data,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const updatedStudent: Student = {
        ...student,
        documents: updatedDocs,
        updatedAt: new Date().toISOString()
      };
      
      saveStudent(updatedStudent);
      setStudent(updatedStudent);
      addAuditLog(
        currentUser.name,
        `Uploaded document ${docKey} (${file.name}) locally for student ${student.studentName} ${student.surname} (${student.enrollmentNumber})`
      );
      onUpdate();
    };
    reader.readAsDataURL(file);
  };

  const handleDocDelete = (docKey: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    const docs = { ...(student.documents || {}) };
    delete docs[docKey];
    
    const updatedStudent: Student = {
      ...student,
      documents: docs,
      updatedAt: new Date().toISOString()
    };
    
    saveStudent(updatedStudent);
    setStudent(updatedStudent);
    addAuditLog(
      currentUser.name,
      `Deleted document ${docKey} for student ${student.studentName} ${student.surname} (${student.enrollmentNumber})`
    );
    onUpdate();
  };

  // Edit student state
  const [editForm, setEditForm] = useState({
    studentName: initialStudent.studentName || "",
    fatherName: initialStudent.fatherName || "",
    surname: initialStudent.surname || "",
    trade: initialStudent.trade || "",
    batchId: initialStudent.batchId || "",
    batchName: initialStudent.batchName || "",
    category: initialStudent.category || "GEN",
    currentStatus: initialStudent.currentStatus || StudentStatus.ACTIVE,
    studentMobileNumber: initialStudent.studentMobileNumber || "",
    parentMobileNumber: initialStudent.parentMobileNumber || "",
    address: initialStudent.address || "",
    dateOfBirth: initialStudent.dateOfBirth || "",
    gender: initialStudent.gender || "Male",
    year: initialStudent.year || "",
    shift: initialStudent.shift || "",
    admissionDate: initialStudent.admissionDate || "",
    scholarshipType: initialStudent.scholarshipType || "None",
    scholarshipId: initialStudent.scholarshipId || "",
    scholarshipAcademicYear: initialStudent.scholarshipAcademicYear || "",
    scholarshipStatus: initialStudent.scholarshipStatus || "Pending",
    bankAccountHolderName: initialStudent.bankAccountHolderName || "",
    bankName: initialStudent.bankName || "",
    bankBranchName: initialStudent.bankBranchName || "",
    bankAccountNumber: initialStudent.bankAccountNumber || "",
    bankIfscCode: initialStudent.bankIfscCode || "",
    cmdDepositNumber: initialStudent.cmdDepositNumber || "",
    fullNameEnglish: initialStudent.fullNameEnglish || `${initialStudent.studentName || ""} ${initialStudent.fatherName || ""} ${initialStudent.surname || ""}`.trim(),
    fullNameGujarati: initialStudent.fullNameGujarati || transliterateEnglishToGujarati(`${initialStudent.studentName || ""} ${initialStudent.fatherName || ""} ${initialStudent.surname || ""}`.trim()),
    addressEnglish: initialStudent.addressEnglish || initialStudent.address || "",
    addressGujarati: initialStudent.addressGujarati || transliterateEnglishToGujarati(initialStudent.addressEnglish || initialStudent.address || "")
  });

  const [ifscError, setIfscError] = useState("");
  const [gujNameError, setGujNameError] = useState("");
  const [gujAddrError, setGujAddrError] = useState("");

  // Status change state
  const [newStatus, setNewStatus] = useState<StudentStatus>(initialStudent.currentStatus);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [outwardNumber, setOutwardNumber] = useState("");
  const [outwardDate, setOutwardDate] = useState("");
  const [exitReason, setExitReason] = useState("");

  // History list for this student
  const [studentHistory, setStudentHistory] = useState<StudentStatusHistory[]>([]);

  // Inline Gujarati states
  const [inlineGujaratiName, setInlineGujaratiName] = useState("");
  const [inlineGujaratiAddress, setInlineGujaratiAddress] = useState("");
  const [isSavingGujarati, setIsSavingGujarati] = useState(false);
  const [gujaratiSaveSuccess, setGujaratiSaveSuccess] = useState(false);
  const [inlineGujaratiNameError, setInlineGujaratiNameError] = useState("");
  const [inlineGujaratiAddressError, setInlineGujaratiAddressError] = useState("");

  useEffect(() => {
    setStudent(initialStudent);
    
    const initialGujName = initialStudent.fullNameGujarati || transliterateEnglishToGujarati(`${initialStudent.studentName || ""} ${initialStudent.fatherName || ""} ${initialStudent.surname || ""}`.trim());
    const initialGujAddress = initialStudent.addressGujarati || transliterateEnglishToGujarati(initialStudent.addressEnglish || initialStudent.address || "");

    setEditForm({
      studentName: initialStudent.studentName || "",
      fatherName: initialStudent.fatherName || "",
      surname: initialStudent.surname || "",
      trade: initialStudent.trade || "",
      batchId: initialStudent.batchId || "",
      batchName: initialStudent.batchName || "",
      category: initialStudent.category || "GEN",
      currentStatus: initialStudent.currentStatus || StudentStatus.ACTIVE,
      studentMobileNumber: initialStudent.studentMobileNumber || "",
      parentMobileNumber: initialStudent.parentMobileNumber || "",
      address: initialStudent.address || "",
      dateOfBirth: initialStudent.dateOfBirth || "",
      gender: initialStudent.gender || "Male",
      year: initialStudent.year || "",
      shift: initialStudent.shift || "",
      admissionDate: initialStudent.admissionDate || "",
      scholarshipType: initialStudent.scholarshipType || "None",
      scholarshipId: initialStudent.scholarshipId || "",
      scholarshipAcademicYear: initialStudent.scholarshipAcademicYear || "",
      scholarshipStatus: initialStudent.scholarshipStatus || "Pending",
      bankAccountHolderName: initialStudent.bankAccountHolderName || "",
      bankName: initialStudent.bankName || "",
      bankBranchName: initialStudent.bankBranchName || "",
      bankAccountNumber: initialStudent.bankAccountNumber || "",
      bankIfscCode: initialStudent.bankIfscCode || "",
      cmdDepositNumber: initialStudent.cmdDepositNumber || "",
      fullNameEnglish: initialStudent.fullNameEnglish || `${initialStudent.studentName || ""} ${initialStudent.fatherName || ""} ${initialStudent.surname || ""}`.trim(),
      fullNameGujarati: initialGujName,
      addressEnglish: initialStudent.addressEnglish || initialStudent.address || "",
      addressGujarati: initialGujAddress
    });
    setInlineGujaratiName(initialGujName);
    setInlineGujaratiAddress(initialGujAddress);
    setInlineGujaratiNameError("");
    setInlineGujaratiAddressError("");
    setGujaratiSaveSuccess(false);

    setNewStatus(initialStudent.currentStatus);
    setIfscError("");
    setGujNameError("");
    setGujAddrError("");
    loadHistory(initialStudent.id);
    setBatches(getBatches().filter(b => b.status === "APPROVED"));
  }, [initialStudent]);

  const loadHistory = (studentId: string) => {
    const allHist = getHistory();
    const filtered = allHist.filter(h => h.studentId === studentId);
    setStudentHistory(filtered);
  };

  const handleSaveGujarati = () => {
    let hasError = false;
    setInlineGujaratiNameError("");
    setInlineGujaratiAddressError("");
    setGujaratiSaveSuccess(false);

    const engName = (student.fullNameEnglish || `${student.studentName || ""} ${student.fatherName || ""} ${student.surname || ""}`.trim()).trim();
    if (engName !== "" && (!inlineGujaratiName || inlineGujaratiName.trim() === "")) {
      setInlineGujaratiNameError("Gujarati Full Name is required.");
      hasError = true;
    }

    const engAddr = (student.addressEnglish || student.address || "").trim();
    if (engAddr !== "" && (!inlineGujaratiAddress || inlineGujaratiAddress.trim() === "")) {
      setInlineGujaratiAddressError("Gujarati Address is required.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSavingGujarati(true);

    const updatedStudent: Student = {
      ...student,
      fullNameGujarati: inlineGujaratiName.trim(),
      addressGujarati: inlineGujaratiAddress.trim(),
      updatedAt: new Date().toISOString()
    };

    saveStudent(updatedStudent);
    setStudent(updatedStudent);

    // Sync with editForm state in case they toggle full edit view later
    setEditForm(prev => ({
      ...prev,
      fullNameGujarati: inlineGujaratiName.trim(),
      addressGujarati: inlineGujaratiAddress.trim()
    }));

    addAuditLog(
      currentUser.name,
      `Saved Gujarati details (Name: "${inlineGujaratiName.trim()}", Address: "${inlineGujaratiAddress.trim()}") for student ${student.studentName} ${student.surname} (${student.enrollmentNumber})`
    );

    setIsSavingGujarati(false);
    setGujaratiSaveSuccess(true);
    onUpdate();

    setTimeout(() => {
      setGujaratiSaveSuccess(false);
    }, 3000);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mandatory fields validation
    if (!editForm.studentName.trim() || !editForm.fatherName.trim() || !editForm.surname.trim() || !editForm.category.trim() || !editForm.batchId) {
      alert("Please fill in all mandatory fields: Student Name, Father's Name, Surname, Batch, and Category.");
      return;
    }

    const engFull = `${editForm.studentName.trim()} ${editForm.fatherName.trim()} ${editForm.surname.trim()}`.trim();
    const gujFull = transliterateEnglishToGujarati(engFull);
    
    const updatedStudent: Student = {
      ...student,
      ...editForm,
      studentName: editForm.studentName.trim(),
      fatherName: editForm.fatherName.trim(),
      surname: editForm.surname.trim(),
      fullNameEnglish: engFull,
      fullNameGujarati: gujFull,
      category: editForm.category.trim(),
      currentStatus: editForm.currentStatus,
      updatedAt: new Date().toISOString()
    };
    saveStudent(updatedStudent);
    setStudent(updatedStudent);
    setIsEditing(false);
    addAuditLog(
      currentUser.name, 
      `Updated profile for student ${updatedStudent.studentName} ${updatedStudent.surname} (${updatedStudent.enrollmentNumber})`
    );
    onUpdate();
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === student.currentStatus) {
      setIsChangingStatus(false);
      return;
    }

    const previous = student.currentStatus;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0];

    const isExit = newStatus !== StudentStatus.ACTIVE;

    const updatedStudent: Student = {
      ...student,
      currentStatus: newStatus,
      exitEffectiveDate: isExit ? effectiveDate : undefined,
      exitOutwardNumber: isExit ? outwardNumber : undefined,
      exitOutwardDate: isExit ? outwardDate : undefined,
      exitReason: isExit ? exitReason : undefined,
      updatedAt: now.toISOString()
    };

    saveStudent(updatedStudent);
    setStudent(updatedStudent);

    // Add to history
    const historyRecord: StudentStatusHistory = {
      id: "hist-" + Math.random().toString(36).substring(2, 11),
      studentId: student.id,
      studentName: `${updatedStudent.studentName} ${updatedStudent.fatherName} ${updatedStudent.surname}`,
      enrollmentNumber: student.enrollmentNumber,
      previousStatus: previous,
      newStatus: newStatus,
      effectiveDate,
      outwardNumber: isExit ? outwardNumber : undefined,
      outwardDate: isExit ? outwardDate : undefined,
      reason: exitReason || undefined,
      changedBy: `${currentUser.role === UserRole.ADMIN ? "Admin" : "S.I."} (${currentUser.name})`,
      changedDate: dateStr,
      changedTime: timeStr
    };

    addHistoryRecord(historyRecord);
    loadHistory(student.id);

    addAuditLog(
      currentUser.name,
      `Changed student ${updatedStudent.studentName} status from ${previous} to ${newStatus}`
    );

    // Reset fields
    setOutwardNumber("");
    setOutwardDate("");
    setExitReason("");
    setIsChangingStatus(false);
    onUpdate();
  };

  const statusLabel = STUDENT_STATUS_LABELS[student.currentStatus];
  const isExited = student.currentStatus !== StudentStatus.ACTIVE;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Student Profile</h2>
            <p className="text-xs text-slate-300 font-mono mt-0.5">{student.enrollmentNumber}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Status & Name Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-2xl border-2 border-white shadow-xs">
                {student.studentName[0]}{student.surname[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {student.studentName} {student.fatherName} {student.surname}
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  {student.trade} • <span className="font-semibold text-slate-700">{student.batchName}</span>
                </p>
              </div>
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs ${
                student.currentStatus === StudentStatus.ACTIVE 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className={`h-2 w-2 rounded-full ${student.currentStatus === StudentStatus.ACTIVE ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {statusLabel.gu} ({statusLabel.en})
              </span>
            </div>
          </div>

          {/* Quick Action Button Drawer */}
          <div className="flex flex-wrap gap-2">
            {!isEditing && !isChangingStatus && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Edit size={16} /> Edit Student
                </button>
                <button
                  onClick={() => setIsChangingStatus(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  <ShieldAlert size={16} /> Change Status / Exit
                </button>
                <a
                  href={`tel:${student.studentMobileNumber}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Phone size={16} /> Call Student
                </a>
                <a
                  href={`tel:${student.parentMobileNumber}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold hover:bg-teal-100 transition-colors"
                >
                  <Phone size={16} /> Call Parent
                </a>
              </>
            )}
          </div>

          {/* Quick Gujarati Save Banner */}
          {!isEditing && !isChangingStatus && (inlineGujaratiName.trim() !== (student.fullNameGujarati || "").trim() ||
            inlineGujaratiAddress.trim() !== (student.addressGujarati || "").trim()) && (
            <div className="flex items-center justify-between gap-4 p-3.5 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-full bg-indigo-100 text-indigo-700 text-lg">✍️</span>
                <div>
                  <p className="text-xs font-bold text-indigo-900">Unsaved Gujarati Changes</p>
                  <p className="text-[11px] text-indigo-600 font-medium">You have modified the Gujarati name or address. Please click Save below or here to persist them.</p>
                </div>
              </div>
              <button
                onClick={handleSaveGujarati}
                disabled={isSavingGujarati}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors disabled:opacity-50"
              >
                {isSavingGujarati ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                Save Gujarati Details
              </button>
            </div>
          )}

          {!isEditing && !isChangingStatus && gujaratiSaveSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              <span>✅</span> Gujarati details saved successfully! All generated letters & reports will now use these updated values.
            </div>
          )}

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleEditSubmit} className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Edit Student Details</h4>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Student First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.studentName}
                    onChange={e => {
                      const newFirst = e.target.value;
                      const engFull = `${newFirst} ${editForm.fatherName} ${editForm.surname}`.trim();
                      const gujFull = transliterateEnglishToGujarati(engFull);
                      setEditForm({ ...editForm, studentName: newFirst, fullNameEnglish: engFull, fullNameGujarati: gujFull });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Father's Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.fatherName}
                    onChange={e => {
                      const newFather = e.target.value;
                      const engFull = `${editForm.studentName} ${newFather} ${editForm.surname}`.trim();
                      const gujFull = transliterateEnglishToGujarati(engFull);
                      setEditForm({ ...editForm, fatherName: newFather, fullNameEnglish: engFull, fullNameGujarati: gujFull });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Surname *</label>
                  <input
                    type="text"
                    required
                    value={editForm.surname}
                    onChange={e => {
                      const newSurname = e.target.value;
                      const engFull = `${editForm.studentName} ${editForm.fatherName} ${newSurname}`.trim();
                      const gujFull = transliterateEnglishToGujarati(engFull);
                      setEditForm({ ...editForm, surname: newSurname, fullNameEnglish: engFull, fullNameGujarati: gujFull });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-semibold"
                  >
                    <option value="GEN">GEN (General)</option>
                    <option value="SEBC">SEBC (OBC)</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 mb-1">Gujarati Full Name (Auto-Generated)</label>
                  <input
                    type="text"
                    readOnly
                    value={editForm.fullNameGujarati}
                    className="w-full px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-indigo-50/50 text-indigo-900 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Student Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={editForm.studentMobileNumber}
                    onChange={e => setEditForm({ ...editForm, studentMobileNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Parent Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={editForm.parentMobileNumber}
                    onChange={e => setEditForm({ ...editForm, parentMobileNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Admission Date (Optional)</label>
                  <input
                    type="date"
                    value={editForm.admissionDate}
                    onChange={e => setEditForm({ ...editForm, admissionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
                  <select
                    value={editForm.year}
                    onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Shift</label>
                  <select
                    value={editForm.shift}
                    onChange={e => setEditForm({ ...editForm, shift: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Shift 1">Shift 1</option>
                    <option value="Shift 2">Shift 2</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">CMD Deposit Number</label>
                  <input
                    type="text"
                    value={editForm.cmdDepositNumber}
                    onChange={e => setEditForm({ ...editForm, cmdDepositNumber: e.target.value })}
                    placeholder="Enter CMD Number"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">English Address (Optional)</label>
                  <textarea
                    rows={2}
                    value={editForm.addressEnglish}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, addressEnglish: val, address: val, addressGujarati: transliterateEnglishToGujarati(val) });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gujarati Address (Auto-Generated / Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="દા.ત. પ્લોટ ૪૨, સેક્ટર ૨૪, ગાંધીનગર, ગુજરાત"
                    value={editForm.addressGujarati}
                    onChange={e => {
                      setEditForm({ ...editForm, addressGujarati: e.target.value });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* Scholarship Form Fields */}
              <div className="border-t border-slate-200 pt-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Scholarship Details</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Scholarship Type</label>
                    <select
                      value={editForm.scholarshipType}
                      onChange={e => setEditForm({ ...editForm, scholarshipType: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="None">None</option>
                      <option value="Digital Gujarat">Digital Gujarat</option>
                      <option value="Institute Stipend">Institute Stipend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Scholarship ID (Optional)</label>
                    <input
                      type="text"
                      value={editForm.scholarshipId}
                      onChange={e => setEditForm({ ...editForm, scholarshipId: e.target.value })}
                      placeholder="e.g. SCH12345"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={editForm.scholarshipAcademicYear}
                      onChange={e => setEditForm({ ...editForm, scholarshipAcademicYear: e.target.value })}
                      placeholder="e.g. 2025-26"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Scholarship Status</label>
                    <select
                      value={editForm.scholarshipStatus}
                      onChange={e => setEditForm({ ...editForm, scholarshipStatus: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bank Details Form Fields */}
              <div className="border-t border-slate-200 pt-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bank Details</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={editForm.bankAccountHolderName}
                      onChange={e => setEditForm({ ...editForm, bankAccountHolderName: e.target.value })}
                      placeholder="Same as in passbook"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editForm.bankName}
                      onChange={e => setEditForm({ ...editForm, bankName: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={editForm.bankBranchName}
                      onChange={e => setEditForm({ ...editForm, bankBranchName: e.target.value })}
                      placeholder="e.g. Porbandar Main"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={editForm.bankAccountNumber}
                      onChange={e => setEditForm({ ...editForm, bankAccountNumber: e.target.value })}
                      placeholder="Account Number"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editForm.bankIfscCode}
                      onChange={e => setEditForm({ ...editForm, bankIfscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                    {ifscError && (
                      <p className="text-red-500 text-xs mt-1 font-semibold">{ifscError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 inline-flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Change Status Form */}
          {isChangingStatus && (
            <form onSubmit={handleStatusSubmit} className="space-y-4 p-4 border border-amber-200 rounded-xl bg-amber-50/50">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-2">
                <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wider inline-flex items-center gap-1.5">
                  <ShieldAlert size={16} /> Change Student Exit Status
                </h4>
                <button 
                  type="button" 
                  onClick={() => setIsChangingStatus(false)}
                  className="text-amber-600 hover:text-amber-800 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Status / Exit Type</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as StudentStatus)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {Object.entries(STUDENT_STATUS_LABELS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.gu} ({value.en})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {newStatus !== StudentStatus.ACTIVE && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Outward Number (જાવક નંબર)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OUT-2026-1234"
                      value={outwardNumber}
                      onChange={e => setOutwardNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Outward Date (જાવક તારીખ)</label>
                    <input
                      type="date"
                      required
                      value={outwardDate}
                      onChange={e => setOutwardDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {newStatus !== StudentStatus.ACTIVE && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason / Remarks (કારણ / વિગત)</label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason for status change..."
                    value={exitReason}
                    onChange={e => setExitReason(e.target.value)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangingStatus(false)}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-500 inline-flex items-center gap-1.5"
                >
                  Save Status Details
                </button>
              </div>
            </form>
          )}

          {/* Student Profile Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-slate-500" /> Administrative Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Trade (ટ્રેડ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.trade}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Batch (બેચ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.batchName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Session (શૈક્ષણિક સત્ર)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.academicSession}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Year (વર્ષ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.year}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Shift (શિફ્ટ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.shift}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Admission Date (પ્રવેશ તારીખ)</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">CMD Deposit Number (સીએમડી ડિપોઝીટ નંબર)</span>
                  <span className="text-sm font-bold text-slate-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono">
                    {student.cmdDepositNumber || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" /> Personal Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Surname (અટક)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.surname}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Student Name (નામ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.studentName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Father's Name (પિતાનું નામ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.fatherName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Gender (જાતિ)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.gender}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Date of Birth (જન્મ તારીખ)</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Full Name (English)</span>
                  <span className="text-sm font-semibold text-slate-800">{student.fullNameEnglish || `${student.studentName} ${student.fatherName} ${student.surname}`.trim()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block font-medium">Full Name (Gujarati / ગુજરાતી પૂર્ણ નામ)</span>
                  <input
                    type="text"
                    className={`w-full mt-1.5 px-3 py-1.5 border ${inlineGujaratiNameError ? "border-red-400 focus:ring-red-500 bg-red-50/10" : "border-indigo-200 focus:ring-indigo-500 bg-indigo-50/30"} rounded-lg text-sm font-bold text-indigo-700 focus:outline-none focus:ring-1`}
                    value={inlineGujaratiName}
                    onChange={e => {
                      setInlineGujaratiName(e.target.value);
                      if (e.target.value.trim() !== "") setInlineGujaratiNameError("");
                    }}
                    placeholder="ગુજરાતી પૂર્ણ નામ દાખલ કરો"
                  />
                  {inlineGujaratiNameError && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">{inlineGujaratiNameError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Address Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Phone size={14} className="text-slate-500" /> Contact Numbers
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Student Mobile</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">{student.studentMobileNumber || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Parent/Guardian Mobile</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">{student.parentMobileNumber || "-"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" /> Postal Address
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Address (English)</span>
                  <span className="text-sm font-semibold text-slate-800 leading-relaxed block">{student.addressEnglish || student.address || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Address (Gujarati / ગુજરાતી સરનામું)</span>
                  <textarea
                    rows={2}
                    className={`w-full mt-1.5 px-3 py-1.5 border ${inlineGujaratiAddressError ? "border-red-400 focus:ring-red-500 bg-red-50/10" : "border-indigo-200 focus:ring-indigo-500 bg-indigo-50/30"} rounded-lg text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-1 resize-none`}
                    value={inlineGujaratiAddress}
                    onChange={e => {
                      setInlineGujaratiAddress(e.target.value);
                      if (e.target.value.trim() !== "") setInlineGujaratiAddressError("");
                    }}
                    placeholder="ગુજરાતી સરનામું દાખલ કરો"
                  />
                  {inlineGujaratiAddressError && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">{inlineGujaratiAddressError}</p>
                  )}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleSaveGujarati}
                      disabled={isSavingGujarati}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      {isSavingGujarati ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                      Save Gujarati Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scholarship & Bank Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            {/* Scholarship Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span className="text-amber-500 font-bold">★</span> Scholarship Details (શિષ્યવૃત્તિ વિગતો)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Scholarship Type</span>
                  <span className={`text-sm font-semibold ${student.scholarshipType && student.scholarshipType !== "None" ? "text-indigo-600 font-bold" : "text-slate-800"}`}>
                    {student.scholarshipType || "None"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Scholarship ID</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.scholarshipId || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Academic Year</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.scholarshipAcademicYear || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Scholarship Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                    student.scholarshipStatus === "Approved" || student.scholarshipStatus === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : student.scholarshipStatus === "Rejected"
                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                      : student.scholarshipStatus === "Applied" || student.scholarshipStatus === "Pending"
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-slate-50 text-slate-700 border border-slate-100"
                  }`}>
                    {student.scholarshipStatus || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span className="text-indigo-500 font-bold">💳</span> Bank Details (બેંક વિગતો)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block font-medium">Account Holder Name</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {student.bankAccountHolderName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Bank Name</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {student.bankName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Branch Name</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {student.bankBranchName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Bank Account Number</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.bankAccountNumber 
                      ? student.bankAccountNumber.trim().length > 4 
                        ? `•••• •••• ${student.bankAccountNumber.trim().slice(-4)}` 
                        : "••••" 
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">IFSC Code</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.bankIfscCode || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Exit Details */}
          {isExited && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/25 space-y-3">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={15} /> Exit Details (જાવક વિગત)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Outward Number (જાવક નંબર)</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">{student.exitOutwardNumber || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Outward Date (જાવક તારીખ)</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.exitOutwardDate ? new Date(student.exitOutwardDate).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Effective Date (અમલી તારીખ)</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {student.exitEffectiveDate ? new Date(student.exitEffectiveDate).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Reason / Remarks (ટિપ્પણી)</span>
                <p className="text-sm font-medium text-slate-700 leading-relaxed mt-0.5">{student.exitReason || "No remarks provided."}</p>
              </div>
            </div>
          )}

          {/* Documents Management Section */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen size={14} className="text-slate-500" /> Trainee Documents (દસ્તાવેજો)
              </h4>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                {Object.keys(student.documents || {}).length} / {DOCUMENT_TYPES.length} Uploaded
              </span>
            </div>

            {isDocAuthorized ? (
              <div className="grid grid-cols-1 gap-3">
                {DOCUMENT_TYPES.map((docType) => (
                  <DocumentRow
                    key={docType.key}
                    docType={docType}
                    student={student}
                    isAuthorized={isDocAuthorized}
                    onUpload={handleDocUpload}
                    onDelete={handleDocDelete}
                    onPreview={(label, fileData, fileType, fileName) => {
                      setPreviewDoc({ label, fileData, fileType, fileName });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200">
                <Lock size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Access Restricted</p>
                <p className="text-xs text-slate-400 mt-1">
                  Only the Administrator and the assigned S.I. have permissions to view or manage documents for this trainee.
                </p>
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" /> Student Status History (તારીખવાર ફેરફાર ઇતિહાસ)
            </h4>

            {studentHistory.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">No status history records found.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200 ml-3 space-y-6">
                {studentHistory.map((h, i) => {
                  const prevLabel = STUDENT_STATUS_LABELS[h.previousStatus];
                  const newLabel = STUDENT_STATUS_LABELS[h.newStatus];
                  return (
                    <div key={h.id || i} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400 border-2 border-white ring-4 ring-slate-100"></span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 font-mono">
                            {h.changedDate} {h.changedTime}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-500">
                            By {h.changedBy}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <p className="font-semibold text-slate-800">
                          Status changed from{" "}
                          <span className="text-slate-500 line-through">
                            {prevLabel.gu} ({prevLabel.en})
                          </span>{" "}
                          to{" "}
                          <span className="text-slate-900 font-bold">
                            {newLabel.gu} ({newLabel.en})
                          </span>
                        </p>
                        
                        {(h.outwardNumber || h.reason) && (
                          <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 max-w-lg space-y-1">
                            {h.outwardNumber && (
                              <p className="font-medium">
                                <span className="font-bold text-slate-500">Outward No:</span> {h.outwardNumber} on {h.outwardDate} (Effective: {h.effectiveDate})
                              </p>
                            )}
                            {h.reason && (
                              <p className="italic">
                                <span className="font-bold text-slate-500 not-italic">Remarks:</span> "{h.reason}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Document Preview</h3>
                <p className="text-sm font-bold text-white">{previewDoc.label}</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
              {previewDoc.fileType.startsWith("image/") ? (
                <img 
                  src={previewDoc.fileData} 
                  alt={previewDoc.label} 
                  className="max-h-[60vh] max-w-full rounded-lg shadow-sm object-contain border border-slate-200 animate-fadeIn"
                  referrerPolicy="no-referrer"
                />
              ) : previewDoc.fileType === "application/pdf" ? (
                <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-6">
                  <p className="text-sm text-slate-600 font-medium mb-4 text-center">
                    PDF preview may vary by browser. Click below to view or download.
                  </p>
                  <object 
                    data={previewDoc.fileData} 
                    type="application/pdf" 
                    className="w-full h-full rounded-lg border border-slate-200"
                  >
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                      <p className="text-sm font-semibold text-slate-700 mb-2">PDF Preview Not Supported In Browser</p>
                      <a 
                        href={previewDoc.fileData} 
                        download={previewDoc.fileName}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors"
                      >
                        <Download size={16} /> Download {previewDoc.fileName}
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="text-center p-8 bg-white border border-slate-200 rounded-xl max-w-md">
                  <p className="text-sm font-bold text-slate-700 mb-2">Unsupported Preview Format</p>
                  <p className="text-xs text-slate-400 mb-4 font-medium font-mono">{previewDoc.fileName}</p>
                  <a 
                    href={previewDoc.fileData} 
                    download={previewDoc.fileName}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm cursor-pointer"
                  >
                    <Download size={16} /> Download to View Offline
                  </a>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-mono font-medium truncate max-w-xs">{previewDoc.fileName}</span>
              <div className="flex gap-2">
                <a 
                  href={previewDoc.fileData} 
                  download={previewDoc.fileName}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Download File
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent for Document Upload/Status Row with drag-and-drop support
function DocumentRow({ 
  docType, 
  student, 
  isAuthorized, 
  onUpload, 
  onDelete, 
  onPreview 
}: { 
  key?: string;
  docType: typeof DOCUMENT_TYPES[0]; 
  student: Student; 
  isAuthorized: boolean; 
  onUpload: (key: string, file: File) => void; 
  onDelete: (key: string) => void; 
  onPreview: (label: string, fileData: string, fileType: string, fileName: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const doc = student.documents?.[docType.key];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAuthorized) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isAuthorized) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(docType.key, file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(docType.key, file);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3.5 rounded-xl border-2 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        doc 
          ? "bg-emerald-50/25 border-emerald-100 hover:border-emerald-200" 
          : "bg-slate-50 border-slate-200 border-dashed hover:border-slate-300"
      } ${isDragOver ? "bg-indigo-50 border-indigo-400 scale-[1.01]" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs text-slate-800">
            {docType.label}
          </span>
          <span className="text-[10px] text-slate-400">({docType.guLabel})</span>
          {docType.required && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
              Required
            </span>
          )}
        </div>
        
        {doc ? (
          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
            <p className="font-semibold text-slate-700 truncate">
              📄 {doc.fileName}
            </p>
            <p className="font-medium font-mono text-[9px]">
              Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Pending upload. Drag & drop or click Upload below.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 justify-end">
        {doc && (
          <button
            onClick={() => onPreview(docType.label, doc.fileData, doc.fileType, doc.fileName)}
            className="p-1.5 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
            title="Preview Document"
          >
            <Eye size={13} /> Preview
          </button>
        )}

        {isAuthorized && (
          <>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 bg-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors border cursor-pointer ${
                doc 
                  ? "text-slate-600 hover:bg-slate-50 border-slate-200" 
                  : "text-indigo-600 hover:bg-indigo-50 border-indigo-200"
              }`}
            >
              <Upload size={13} /> {doc ? "Replace" : "Upload"}
            </button>

            {doc && (
              <button
                onClick={() => onDelete(docType.key)}
                className="p-1.5 bg-white text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold inline-flex items-center transition-colors cursor-pointer"
                title="Delete Document"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
        
        {doc ? (
          <span className="text-emerald-600 text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            Uploaded ✅
          </span>
        ) : (
          <span className="text-rose-600 text-[10px] font-bold inline-flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
            Pending ❌
          </span>
        )}
      </div>
    </div>
  );
}
