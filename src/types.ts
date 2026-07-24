export enum UserRole {
  ADMIN = "ADMIN",
  SUPERVISOR_INSTRUCTOR = "SUPERVISOR_INSTRUCTOR"
}

export interface User {
  id: string;
  username: string;
  password?: string; // Stored securely in local state for prototype purposes
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  supervisorNameEnglish?: string;
  supervisorNameGujarati?: string;
}

export interface Trade {
  id: string;
  name: string;
  isActive?: boolean;
  tradeNameEnglish?: string;
  tradeNameGujarati?: string;
  seatCapacity?: number;
}

export enum BatchStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  INACTIVE = "INACTIVE"
}

export interface Batch {
  id: string;
  tradeName: string;
  batchNumber: string;
  batchSection: string;
  displayName: string; // e.g. Welder 84-A
  academicSession: string; // e.g. 2024-2026
  year: string; // e.g. "Year 1" or "Year 2"
  shift: string; // e.g. "Shift 1" or "Shift 2"
  createdBy: string; // supervisor User.id (for backward compatibility / legacy tracking)
  createdByName: string; // supervisor name
  status: BatchStatus;
  createdAt: string;
  assignedSIId?: string | null; // Admin-controlled currently assigned S.I. User.id
  assignedSIName?: string | null; // S.I. Name
  capacity?: number;
}

export interface BatchAssignmentHistory {
  id: string;
  batchId: string;
  batchName: string;
  previousSIId: string | null;
  previousSIName: string | null;
  newSIId: string | null;
  newSIName: string | null;
  assignedBy: string;
  transferDate: string; // YYYY-MM-DD HH:MM:SS
}

export enum StudentStatus {
  ACTIVE = "ACTIVE",
  EXIT_NAMKAMI = "EXIT_NAMKAMI", // નામકમી
  EXIT_RAJINAMU = "EXIT_RAJINAMU", // રાજીનામું
  EXIT_TRANSFER_OUT = "EXIT_TRANSFER_OUT", // Transfer Out
  EXIT_DISCONTINUED = "EXIT_DISCONTINUED", // Discontinued
  EXIT_PASSOUT = "EXIT_PASSOUT", // Passout
  EXIT_OTHER = "EXIT_OTHER" // Other
}

// Map student statuses to Gujarati labels
export const STUDENT_STATUS_LABELS: Record<StudentStatus, { en: string; gu: string }> = {
  [StudentStatus.ACTIVE]: { en: "Active", gu: "ચાલુ" },
  [StudentStatus.EXIT_NAMKAMI]: { en: "Name Cut (Namkami)", gu: "નામકમી" },
  [StudentStatus.EXIT_RAJINAMU]: { en: "Resigned (Rajinamu)", gu: "રાજીનામું" },
  [StudentStatus.EXIT_TRANSFER_OUT]: { en: "Transfer Out", gu: "બદલી" },
  [StudentStatus.EXIT_DISCONTINUED]: { en: "Discontinued", gu: "અધૂરો અભ્યાસ" },
  [StudentStatus.EXIT_PASSOUT]: { en: "Passout", gu: "પાસ આઉટ" },
  [StudentStatus.EXIT_OTHER]: { en: "Other Exit", gu: "અન્ય કારણ" }
};

export interface Student {
  id: string;
  studentName: string;
  fatherName: string;
  surname: string;
  enrollmentNumber: string; // unique identifier
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  trade: string;
  batchId: string; // maps to Batch.id
  batchName: string; // cached display name e.g. "Welder 84-A"
  academicSession: string;
  year: string;
  shift: string;
  studentMobileNumber: string;
  parentMobileNumber: string;
  address: string;
  admissionDate: string; // YYYY-MM-DD
  studentPhoto?: string; // Base64 or local placeholder URL
  currentStatus: StudentStatus;
  cmdDepositNumber?: string; // CMD Deposit Number
  aadhaarNumber?: string; // Aadhaar Number
  category?: string; // e.g. GEN, SEBC, SC, ST, EWS
  admissionYear?: string; // Admission Year
  
  fullNameEnglish?: string;
  fullNameGujarati?: string;
  addressEnglish?: string;
  addressGujarati?: string;

  // Exit Details
  exitEffectiveDate?: string;
  exitOutwardNumber?: string;
  exitOutwardDate?: string;
  exitReason?: string;

  // Scholarship Details
  scholarshipType?: string; // Digital Gujarat, Institute Stipend, Other, None
  scholarshipId?: string;
  scholarshipAcademicYear?: string;
  scholarshipStatus?: string; // Applied, Approved, Rejected, Pending, Completed

  // Bank Details
  bankAccountHolderName?: string;
  bankName?: string;
  bankBranchName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;

  // Documents Management
  documents?: Record<string, StudentDocument>;

  createdAt: string;
  updatedAt: string;
}

export interface StudentDocument {
  fileName: string;
  fileType: string;
  fileData: string; // Base64 content
  uploadedAt: string;
}

export interface StudentStatusHistory {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  previousStatus: StudentStatus;
  newStatus: StudentStatus;
  effectiveDate: string;
  outwardNumber?: string;
  outwardDate?: string;
  reason?: string;
  changedBy: string; // e.g. "Admin (Institute Administrator)" or "S.I. Ramesh Patel"
  changedDate: string; // YYYY-MM-DD
  changedTime: string; // HH:MM:SS
}

export interface AuditLog {
  id: string;
  user: string; // e.g. "Admin" or "S.I. Ramesh Patel"
  action: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
}

export interface MonthlyWorkingDays {
  id: string;
  academicYear: string;
  month: string; // e.g. "July 2026"
  workingDays: number;
}

export interface StudentAttendance {
  id: string;
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  trade: string;
  batchId: string;
  batchName: string;
  academicYear: string;
  month: string; // e.g. "July 2026"
  workingDays: number;
  presentDays: number;
  attendancePercentage: number;
  status: "Eligible" | "Below Required Attendance";
  remark?: string;
  address?: string;
}

export interface PromotionRecord {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  oldTrade: string;
  oldBatchId: string;
  oldBatchName: string;
  newTrade: string;
  newBatchId: string;
  newBatchName: string;
  oldYear: string;
  newYear: string;
  oldShift: string;
  newShift: string;
  promotionDate: string; // YYYY-MM-DD HH:MM:SS
  promotedBy: string; // Admin's name
  isReversed?: boolean;
  reversedDate?: string;
  reversedBy?: string;
}

export interface GeneralLetterData {
  id: string;
  templateName: string;
  instituteName: string;
  siName: string;
  designation: string;
  date: string;
  recipient: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  // Hajar Report (હાજર રિપોર્ટ) Master Template Fields
  location?: string;
  referenceNo?: string;
  employeeId?: string;
  mobile?: string;
  leaveType?: string;
  leaveFromDate?: string;
  leaveToDate?: string;
  totalLeaveDays?: string | number;
  joiningDate?: string;
  joiningTime?: string;
  draftName?: string;
  lastSavedAt?: string;
}

export interface LetterReportDraft {
  id: string;
  templateId: string;
  draftName: string;
  lastSavedAt: string;
  data: GeneralLetterData;
}

export interface SIProfile {
  id: string;
  userId: string;
  nameEnglish: string;
  nameGujarati: string;
  designationEnglish: string;
  designationGujarati: string;
  officeEnglish: string;
  officeGujarati: string;
  departmentEnglish: string;
  departmentGujarati: string;
  employeeId: string;
  mobile: string;
  addressEnglish: string;
  addressGujarati: string;
  salary: string;
  bandPay?: string;
  gradePay?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplication {
  id: string;
  userId: string;
  profileId: string;
  
  // SI Details at time of application
  nameEnglish: string;
  nameGujarati: string;
  designationEnglish: string;
  designationGujarati: string;
  officeEnglish: string;
  officeGujarati: string;
  departmentEnglish: string;
  departmentGujarati: string;
  employeeId: string;
  mobile: string;
  addressEnglish: string;
  addressGujarati: string;
  salary: string;

  // Leave Details
  leaveType: string;
  customLeaveType?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  leaveReason: string;
  customLeaveReason?: string;
  addressDuringLeaveEnglish?: string;
  addressDuringLeaveGujarati?: string;

  // Government Leave Form Field No. 9 Details (Prior Leave Record)
  priorLeaveDate?: string;
  priorLeaveType?: string;
  priorLeaveDays?: string;

  // Forwarding Letter Details
  outwardNumber?: string;
  outwardDate?: string;
  letterDate: string;
  recipientEnglish?: string;
  recipientGujarati?: string;
  subjectEnglish?: string;
  subjectGujarati?: string;

  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReportSnapshot {
  id: string;
  year: number;
  month: number;
  academicYear: string;
  reportDate: string;
  instituteName: string;
  reportData: any; // Full frozen OfficialOnRollReportData object
  createdBy: string;
  createdByName: string;
  createdAt: string;
  version: string;
  status: "OFFICIAL" | "ARCHIVED";
  remarks?: string;
  ipAddress?: string;
}

export interface GeneratedReport {
  id: string;
  reportType: "FORWARDING_LETTER" | "ATTENDANCE_DEFAULTER" | "GENERAL_LETTER" | "ON_ROLL_REPORT" | "OTHER";
  reportName: string;
  generatedAt: string;
  trade?: string;
  batch?: string;
  month?: string | number;
  academicSession?: string;
  generatedBy: string;
  generatedByRole?: string;
  dataSnapshot?: any;
  fileType?: "pdf" | "word" | "both" | "html";
  createdAt?: string;
  updatedAt?: string;
}




