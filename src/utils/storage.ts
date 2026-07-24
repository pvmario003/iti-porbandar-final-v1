import { 
  User, 
  UserRole, 
  Trade, 
  Batch, 
  BatchStatus, 
  Student, 
  StudentStatus, 
  StudentStatusHistory, 
  AuditLog,
  BatchAssignmentHistory,
  MonthlyWorkingDays,
  StudentAttendance,
  PromotionRecord,
  GeneralLetterData,
  LetterReportDraft,
  SIProfile,
  LeaveApplication,
  MonthlyReportSnapshot,
  GeneratedReport
} from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// In-Memory Database for Supabase mode (avoids localStorage and mock data)
export const MEMORY_DB: Record<string, any> = {};

// Helper to convert camelCase to snake_case for Supabase
export function camelToSnake(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  const n: any = {};
  Object.keys(obj).forEach(k => {
    let newKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newKey = newKey
      .replace(/_s_i_id$/g, "_si_id")
      .replace(/_s_i_name$/g, "_si_name")
      .replace(/_s_i_/g, "_si_");
    n[newKey] = typeof obj[k] === 'object' && k !== 'documents' ? camelToSnake(obj[k]) : obj[k];
  });
  return n;
}

// Helper to convert snake_case to camelCase for local React state
export function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const n: any = {};
  Object.keys(obj).forEach(k => {
    let newKey = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    newKey = newKey
      .replace(/SiId$/g, "SIId")
      .replace(/SiName$/g, "SIName");
    n[newKey] = typeof obj[k] === 'object' && k !== 'documents' ? snakeToCamel(obj[k]) : obj[k];
  });
  return n;
}

// Helper to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Initial Seed Data
const DEFAULT_USERS: User[] = [
  {
    id: "user-admin",
    username: "admin",
    password: "password123",
    name: "Institute Administrator",
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: "2026-01-01"
  },
  {
    id: "user-si",
    username: "si",
    password: "password123",
    name: "Supervisor Instructor",
    role: UserRole.SUPERVISOR_INSTRUCTOR,
    isActive: true,
    createdAt: "2026-07-21",
    supervisorNameEnglish: "Supervisor Instructor",
    supervisorNameGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર"
  },
  {
    id: "user-si-ramesh",
    username: "ramesh_si",
    password: "password123",
    name: "Ramesh Patel (S.I. Welder)",
    role: UserRole.SUPERVISOR_INSTRUCTOR,
    isActive: true,
    createdAt: "2026-01-02",
    supervisorNameEnglish: "Ramesh Patel",
    supervisorNameGujarati: "રમેશ પટેલ"
  },
  {
    id: "user-si-sonal",
    username: "sonal_si",
    password: "password123",
    name: "Sonal Shah (S.I. COPA)",
    role: UserRole.SUPERVISOR_INSTRUCTOR,
    isActive: true,
    createdAt: "2026-01-03",
    supervisorNameEnglish: "Sonal Shah",
    supervisorNameGujarati: "સોનલ શાહ"
  },
  {
    id: "user-si-rahul",
    username: "rahul_si",
    password: "password123",
    name: "Rahul Mehta (S.I. Electrician)",
    role: UserRole.SUPERVISOR_INSTRUCTOR,
    isActive: false, // Inactive user for testing deactivation
    createdAt: "2026-01-04",
    supervisorNameEnglish: "Rahul Mehta",
    supervisorNameGujarati: "રાહુલ મહેતા"
  }
];

const DEFAULT_TRADES: Trade[] = [
  { id: "trade-1", name: "Welder", isActive: true, tradeNameEnglish: "Welder", tradeNameGujarati: "વેલ્ડર" },
  { id: "trade-2", name: "Electrician", isActive: true, tradeNameEnglish: "Electrician", tradeNameGujarati: "ઇલેક્ટ્રિશિયન" },
  { id: "trade-3", name: "COPA (Computer Operator & Programming Assistant)", isActive: true, tradeNameEnglish: "COPA (Computer Operator & Programming Assistant)", tradeNameGujarati: "કોપા" },
  { id: "trade-4", name: "Fitter", isActive: true, tradeNameEnglish: "Fitter", tradeNameGujarati: "ફિટર" },
  { id: "trade-5", name: "Draughtsman Civil", isActive: true, tradeNameEnglish: "Draughtsman Civil", tradeNameGujarati: "ડ્રાફ્ટસમેન સિવિલ" },
  { id: "trade-6", name: "Architectural Metal Fabricator", isActive: true, tradeNameEnglish: "Architectural Metal Fabricator", tradeNameGujarati: "આર્કિટેક્ચરલ મેટલ ફેબ્રિકેટર" },
  { id: "trade-7", name: "Health Sanitary Inspector", isActive: true, tradeNameEnglish: "Health Sanitary Inspector", tradeNameGujarati: "હેલ્થ સેનિટરી ઇન્સ્પેક્ટર" },
  { id: "trade-8", name: "Sewing Technology", isActive: true, tradeNameEnglish: "Sewing Technology", tradeNameGujarati: "સીવણ ટેકનોલોજી" },
  { id: "trade-9", name: "Wireman", isActive: true, tradeNameEnglish: "Wireman", tradeNameGujarati: "વાયરમેન" },
  { id: "trade-10", name: "Mechanic Diesel", isActive: true, tradeNameEnglish: "Mechanic Diesel", tradeNameGujarati: "મિકેનિક ડીઝલ" },
  { id: "trade-11", name: "Electronics Mechanic", isActive: true, tradeNameEnglish: "Electronics Mechanic", tradeNameGujarati: "ઇલેક્ટ્રોનિક્સ મિકેનિક" }
];

const DEFAULT_BATCHES: Batch[] = [
  {
    id: "batch-1",
    tradeName: "Welder",
    batchNumber: "84",
    batchSection: "A",
    displayName: "Welder 84-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    createdBy: "user-si-ramesh",
    createdByName: "Ramesh Patel (S.I. Welder)",
    status: BatchStatus.APPROVED,
    createdAt: "2026-01-10T10:00:00",
    assignedSIId: "user-si-ramesh",
    assignedSIName: "Ramesh Patel (S.I. Welder)"
  },
  {
    id: "batch-2",
    tradeName: "Welder",
    batchNumber: "84",
    batchSection: "B",
    displayName: "Welder 84-B",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 2",
    createdBy: "user-si-ramesh",
    createdByName: "Ramesh Patel (S.I. Welder)",
    status: BatchStatus.APPROVED,
    createdAt: "2026-01-11T11:30:00",
    assignedSIId: "user-si-ramesh",
    assignedSIName: "Ramesh Patel (S.I. Welder)"
  },
  {
    id: "batch-3",
    tradeName: "Welder",
    batchNumber: "84",
    batchSection: "C",
    displayName: "Welder 84-C",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    createdBy: "user-si-ramesh",
    createdByName: "Ramesh Patel (S.I. Welder)",
    status: BatchStatus.APPROVED,
    createdAt: "2026-07-13T15:20:00",
    assignedSIId: "user-si-ramesh",
    assignedSIName: "Ramesh Patel (S.I. Welder)"
  },
  {
    id: "batch-4",
    tradeName: "COPA",
    batchNumber: "86",
    batchSection: "A",
    displayName: "COPA 86-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    createdBy: "user-si-sonal",
    createdByName: "Sonal Shah (S.I. COPA)",
    status: BatchStatus.APPROVED,
    createdAt: "2026-01-12T09:00:00",
    assignedSIId: "user-si-sonal",
    assignedSIName: "Sonal Shah (S.I. COPA)"
  }
];

const DEFAULT_STUDENTS: Student[] = [
  {
    id: "stu-1",
    studentName: "Jayesh",
    fatherName: "Kantilal",
    surname: "Rathod",
    enrollmentNumber: "ENR202584001",
    dateOfBirth: "2006-04-12",
    gender: "Male",
    trade: "Welder",
    batchId: "batch-1",
    batchName: "Welder 84-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    studentMobileNumber: "9876543210",
    parentMobileNumber: "9876543211",
    address: "Plot 42, Sector 24, Gandhinagar, Gujarat",
    admissionDate: "2025-08-01",
    currentStatus: StudentStatus.ACTIVE,
    createdAt: "2026-01-15T12:00:00",
    updatedAt: "2026-01-15T12:00:00"
  },
  {
    id: "stu-2",
    studentName: "Ketan",
    fatherName: "Bhimjibhai",
    surname: "Chavda",
    enrollmentNumber: "ENR202584002",
    dateOfBirth: "2005-11-23",
    gender: "Male",
    trade: "Welder",
    batchId: "batch-1",
    batchName: "Welder 84-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    studentMobileNumber: "9898012345",
    parentMobileNumber: "9898012346",
    address: "Kalupur Circle, Ahmedabad, Gujarat",
    admissionDate: "2025-08-01",
    currentStatus: StudentStatus.EXIT_NAMKAMI,
    exitEffectiveDate: "2026-06-15",
    exitOutwardNumber: "OUT-2026-W01",
    exitOutwardDate: "2026-06-16",
    exitReason: "Absent for more than 15 consecutive days without leave application.",
    createdAt: "2026-01-15T12:10:00",
    updatedAt: "2026-06-16T10:00:00"
  },
  {
    id: "stu-3",
    studentName: "Pooja",
    fatherName: "Rajeshbhai",
    surname: "Solanki",
    enrollmentNumber: "ENR202584003",
    dateOfBirth: "2006-08-15",
    gender: "Female",
    trade: "Welder",
    batchId: "batch-1",
    batchName: "Welder 84-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    studentMobileNumber: "9909011223",
    parentMobileNumber: "9909011224",
    address: "Village Sargasan, Gandhinagar, Gujarat",
    admissionDate: "2025-08-01",
    currentStatus: StudentStatus.ACTIVE,
    createdAt: "2026-01-15T12:20:00",
    updatedAt: "2026-01-15T12:20:00"
  },
  {
    id: "stu-4",
    studentName: "Hardik",
    fatherName: "Mansukhbhai",
    surname: "Vaghela",
    enrollmentNumber: "ENR202584021",
    dateOfBirth: "2005-09-02",
    gender: "Male",
    trade: "Welder",
    batchId: "batch-2",
    batchName: "Welder 84-B",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 2",
    studentMobileNumber: "9426055443",
    parentMobileNumber: "9426055444",
    address: "Ranip, Ahmedabad, Gujarat",
    admissionDate: "2025-08-02",
    currentStatus: StudentStatus.ACTIVE,
    createdAt: "2026-01-16T14:00:00",
    updatedAt: "2026-01-16T14:00:00"
  },
  {
    id: "stu-5",
    studentName: "Bijal",
    fatherName: "Amratbhai",
    surname: "Patel",
    enrollmentNumber: "ENR202586001",
    dateOfBirth: "2006-01-30",
    gender: "Female",
    trade: "COPA",
    batchId: "batch-4",
    batchName: "COPA 86-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    studentMobileNumber: "9099077665",
    parentMobileNumber: "9099077666",
    address: "Koba Road, Gandhinagar, Gujarat",
    admissionDate: "2025-08-05",
    currentStatus: StudentStatus.ACTIVE,
    createdAt: "2026-01-18T10:00:00",
    updatedAt: "2026-01-18T10:00:00"
  },
  {
    id: "stu-6",
    studentName: "Alpesh",
    fatherName: "Arjanbhai",
    surname: "Rabari",
    enrollmentNumber: "ENR202586002",
    dateOfBirth: "2005-05-18",
    gender: "Male",
    trade: "COPA",
    batchId: "batch-4",
    batchName: "COPA 86-A",
    academicSession: "2025-2026",
    year: "Year 1",
    shift: "Shift 1",
    studentMobileNumber: "9712398765",
    parentMobileNumber: "9712398766",
    address: "Ghatlodia, Ahmedabad, Gujarat",
    admissionDate: "2025-08-05",
    currentStatus: StudentStatus.EXIT_RAJINAMU,
    exitEffectiveDate: "2026-05-10",
    exitOutwardNumber: "OUT-2026-C04",
    exitOutwardDate: "2026-05-11",
    exitReason: "Voluntarily resigned to assist in agricultural family work.",
    createdAt: "2026-01-18T10:15:00",
    updatedAt: "2026-05-11T16:00:00"
  }
];

const DEFAULT_HISTORY: StudentStatusHistory[] = [
  {
    id: "history-1",
    studentId: "stu-2",
    studentName: "Ketan Bhimjibhai Chavda",
    enrollmentNumber: "ENR202584002",
    previousStatus: StudentStatus.ACTIVE,
    newStatus: StudentStatus.EXIT_NAMKAMI,
    effectiveDate: "2026-06-15",
    outwardNumber: "OUT-2026-W01",
    outwardDate: "2026-06-16",
    reason: "Absent for more than 15 consecutive days without leave application.",
    changedBy: "S.I. Ramesh Patel (Supervisor Instructor)",
    changedDate: "2026-06-16",
    changedTime: "10:00:00"
  },
  {
    id: "history-2",
    studentId: "stu-6",
    studentName: "Alpesh Arjanbhai Rabari",
    enrollmentNumber: "ENR202586002",
    previousStatus: StudentStatus.ACTIVE,
    newStatus: StudentStatus.EXIT_RAJINAMU,
    effectiveDate: "2026-05-10",
    outwardNumber: "OUT-2026-C04",
    outwardDate: "2026-05-11",
    reason: "Voluntarily resigned to assist in agricultural family work.",
    changedBy: "S.I. Sonal Shah (Supervisor Instructor)",
    changedDate: "2026-05-11",
    changedTime: "16:00:00"
  }
];

const DEFAULT_LOGS: AuditLog[] = [
  { id: "log-1", user: "System", action: "System database initialized with default configurations", date: "2026-07-14", time: "08:00:00" },
  { id: "log-2", user: "Institute Administrator", action: "Admin dashboard accessed", date: "2026-07-14", time: "08:05:12" }
];

// LocalStorage Keys
const KEYS = {
  USERS: "iti_users",
  TRADES: "iti_trades",
  BATCHES: "iti_batches",
  STUDENTS: "iti_students",
  HISTORY: "iti_history",
  LOGS: "iti_logs",
  ASSIGNMENT_HISTORY: "iti_assignment_history",
  WORKING_DAYS: "iti_working_days",
  ATTENDANCE: "iti_attendance",
  PROMOTIONS: "iti_promotions",
  SI_PROFILES: "iti_si_profiles",
  LEAVE_APPLICATIONS: "iti_leave_applications",
  MONTHLY_SNAPSHOTS: "iti_monthly_snapshots",
  GENERATED_REPORTS: "iti_generated_reports"
};

// IndexedDB support for offline student records mapping
export function syncStudentsToIndexedDB(students: Student[]): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve();
      return;
    }
    const request = window.indexedDB.open("iti_db", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("students")) {
        db.createObjectStore("students", { keyPath: "id" });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("students")) {
        resolve();
        return;
      }
      try {
        const transaction = db.transaction("students", "readwrite");
        const store = transaction.objectStore("students");
        store.clear().onsuccess = () => {
          students.forEach(student => {
            if (student && student.id) {
              store.put(student);
            }
          });
        };
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          resolve();
        };
      } catch (err) {
        console.error("IndexedDB transaction error during sync", err);
        resolve();
      }
    };
    request.onerror = () => {
      resolve();
    };
  });
}

export function getStudentsFromIndexedDB(): Promise<Student[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(getStudents());
      return;
    }
    const request = window.indexedDB.open("iti_db", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("students")) {
        db.createObjectStore("students", { keyPath: "id" });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("students")) {
        resolve(getStudents());
        return;
      }
      try {
        const transaction = db.transaction("students", "readonly");
        const store = transaction.objectStore("students");
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const result = getAllRequest.result || [];
          if (result.length > 0) {
            resolve(result);
          } else {
            resolve(getStudents());
          }
        };
        getAllRequest.onerror = () => {
          resolve(getStudents());
        };
      } catch (err) {
        console.error("IndexedDB error reading students", err);
        resolve(getStudents());
      }
    };
    request.onerror = () => {
      resolve(getStudents());
    };
  });
}

const COMMON_GUJARATI_WORDS: Record<string, string> = {
  jayesh: "જયેશ",
  kantilal: "કાંતિલાલ",
  rathod: "રાઠોડ",
  ketan: "કેતન",
  bhimjibhai: "ભીમજીભાઈ",
  chavda: "ચાવડા",
  pooja: "પૂજા",
  rajeshbhai: "રાજેશભાઈ",
  solanki: "સોલંકી",
  hardik: "હાર્દિક",
  mansukhbhai: "મનસુખભાઈ",
  vaghela: "વાઘેલા",
  bijal: "બીજલ",
  amratbhai: "અમરતભાઈ",
  patel: "પટેલ",
  ramesh: "રમેશ",
  sonal: "સોનલ",
  rahul: "રાહુલ",
  mehta: "મેહતા",
  shah: "શાહ",
  plot: "પ્લોટ",
  sector: "સેક્ટર",
  gandhinagar: "ગાંધીનગર",
  gujarat: "ગુજરાત",
  india: "ભારત",
  kalupur: "કાલુપુર",
  circle: "સર્કલ",
  ahmedabad: "અમદાવાદ",
  village: "ગામ",
  sargasan: "સરગાસણ",
  ranip: "રાણીપ",
  porbandar: "પોરબંદર",
  bhai: "ભાઈ",
  ben: "બેન"
};

function ruleBasedTransliterate(word: string): string {
  let result = "";
  let i = 0;
  const len = word.length;

  while (i < len) {
    const c3 = i + 3 <= len ? word.substring(i, i + 3) : "";
    const c2 = i + 2 <= len ? word.substring(i, i + 2) : "";
    const c1 = word.charAt(i);

    if (c3 === "bha") { result += "ભા"; i += 3; continue; }
    if (c3 === "cha") { result += "ચા"; i += 3; continue; }
    if (c3 === "dha") { result += "ધા"; i += 3; continue; }
    if (c3 === "gha") { result += "ઘા"; i += 3; continue; }
    if (c3 === "jha") { result += "ઝા"; i += 3; continue; }
    if (c3 === "kha") { result += "ખા"; i += 3; continue; }
    if (c3 === "pha") { result += "ફા"; i += 3; continue; }
    if (c3 === "sha") { result += "શા"; i += 3; continue; }
    if (c3 === "tha") { result += "થા"; i += 3; continue; }

    if (c2 === "bh") { result += "ભ"; i += 2; continue; }
    if (c2 === "ch") { result += "ચ"; i += 2; continue; }
    if (c2 === "dh") { result += "ધ"; i += 2; continue; }
    if (c2 === "gh") { result += "ઘ"; i += 2; continue; }
    if (c2 === "jh") { result += "ઝ"; i += 2; continue; }
    if (c2 === "kh") { result += "ખ"; i += 2; continue; }
    if (c2 === "ph") { result += "ફ"; i += 2; continue; }
    if (c2 === "sh") { result += "શ"; i += 2; continue; }
    if (c2 === "th") { result += "થ"; i += 2; continue; }
    if (c2 === "ee") { result += "ી"; i += 2; continue; }
    if (c2 === "oo") { result += "ૂ"; i += 2; continue; }
    if (c2 === "ai") { result += "ૈ"; i += 2; continue; }
    if (c2 === "au") { result += "ૌ"; i += 2; continue; }
    if (c2 === "aa") { result += "ા"; i += 2; continue; }

    if (c1 === "a") {
      if (i === 0) {
        result += "અ";
      } else if (i === len - 1) {
        result += "ા";
      } else {
        result += "ા";
      }
      i++;
      continue;
    }
    if (c1 === "i") { result += "િ"; i++; continue; }
    if (c1 === "u") { result += "ુ"; i++; continue; }
    if (c1 === "e") { result += "ે"; i++; continue; }
    if (c1 === "o") { result += "ો"; i++; continue; }

    if (c1 === "b") { result += "બ"; i++; continue; }
    if (c1 === "c") { result += "ક"; i++; continue; }
    if (c1 === "d") { result += "દ"; i++; continue; }
    if (c1 === "f") { result += "ફ"; i++; continue; }
    if (c1 === "g") { result += "ગ"; i++; continue; }
    if (c1 === "h") { result += "હ"; i++; continue; }
    if (c1 === "j") { result += "જ"; i++; continue; }
    if (c1 === "k") { result += "ક"; i++; continue; }
    if (c1 === "l") { result += "લ"; i++; continue; }
    if (c1 === "m") { result += "મ"; i++; continue; }
    if (c1 === "n") { result += "ન"; i++; continue; }
    if (c1 === "p") { result += "પ"; i++; continue; }
    if (c1 === "r") { result += "ર"; i++; continue; }
    if (c1 === "s") { result += "સ"; i++; continue; }
    if (c1 === "t") { result += "ત"; i++; continue; }
    if (c1 === "v") { result += "વ"; i++; continue; }
    if (c1 === "w") { result += "વ"; i++; continue; }
    if (c1 === "y") { result += "ય"; i++; continue; }
    if (c1 === "z") { result += "ઝ"; i++; continue; }

    result += c1;
    i++;
  }

  return result;
}

export function transliterateEnglishToGujarati(text: string): string {
  if (!text) return "";
  if (/[\u0a80-\u0aff]/.test(text)) {
    return text;
  }

  return text.split(/(\s+|,|\.|-)/).map(part => {
    const trimmed = part.trim().toLowerCase();
    if (!trimmed) return part;
    if (COMMON_GUJARATI_WORDS[trimmed]) {
      return COMMON_GUJARATI_WORDS[trimmed];
    }
    if (trimmed.endsWith("bhai") && trimmed.length > 4) {
      const base = trimmed.slice(0, -4);
      const baseTranslated = COMMON_GUJARATI_WORDS[base] || ruleBasedTransliterate(base);
      return baseTranslated + "ભાઈ";
    }
    if (trimmed.endsWith("ben") && trimmed.length > 3) {
      const base = trimmed.slice(0, -3);
      const baseTranslated = COMMON_GUJARATI_WORDS[base] || ruleBasedTransliterate(base);
      return baseTranslated + "બેન";
    }
    if (/^[a-zA-Z]+$/.test(part)) {
      return ruleBasedTransliterate(trimmed);
    }
    return part;
  }).join("");
}

// Low-level Get/Set helpers
export function getStoredData<T>(key: string): T[] {
  return (MEMORY_DB[key] as T[]) || [];
}

export function setStoredData<T>(key: string, data: T[]) {
  MEMORY_DB[key] = data;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save to localStorage", e);
  }
}

// Helper for safe non-blocking Supabase sync operations
async function safeSupabaseOp(opName: string, opFn: () => PromiseLike<any> | Promise<any>): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const res = await opFn();
    if (res && res.error) {
      console.warn(`[Supabase Sync] ${opName} warning:`, res.error.message || res.error);
    }
  } catch (err: any) {
    console.warn(`[Supabase Sync] ${opName} exception:`, err?.message || err);
  }
}

// 1. USER APIs
export function getUsers(): User[] {
  return getStoredData<User>(KEYS.USERS);
}

export function saveUser(user: User) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx > -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setStoredData(KEYS.USERS, users);

  safeSupabaseOp("Save User", () => supabase.from("users").upsert(camelToSnake(user)));
}

export function deleteUser(userId: string) {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  setStoredData(KEYS.USERS, filtered);

  safeSupabaseOp("Delete User", () => supabase.from("users").delete().eq("id", userId));
}

// 2. TRADE APIs
export function getTrades(): Trade[] {
  return getStoredData<Trade>(KEYS.TRADES);
}

export async function reloadTradesFromSupabase(): Promise<Trade[]> {
  if (!isSupabaseConfigured) return getTrades();
  try {
    const { data, error } = await supabase.from("trades").select("*");
    if (error) {
      console.error("Error reloading trades from Supabase:", error);
      return getTrades();
    }
    if (data) {
      const camelTrades = snakeToCamel(data);
      setStoredData(KEYS.TRADES, camelTrades);
      return camelTrades;
    }
  } catch (err) {
    console.error("Exception reloading trades from Supabase:", err);
  }
  return getTrades();
}

export function saveTrade(trade: Trade) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === trade.id);
  const isUpdate = idx > -1;

  if (isUpdate) {
    trades[idx] = trade;
  } else {
    trades.push(trade);
  }
  setStoredData(KEYS.TRADES, trades);

  safeSupabaseOp("Save Trade", async () => {
    const payload = camelToSnake(trade);

    console.log(`[Supabase Trade Sync] Upserting on table 'trades', Record ID: '${trade.id}', Payload:`, payload);

    let { data, error } = await supabase
      .from("trades")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error && (error.code === "PGRST204" || error.message?.includes("seat_capacity"))) {
      console.warn("[Supabase Trade Sync Warning] 'seat_capacity' column missing from Supabase trades table schema cache. Retrying without 'seat_capacity':", error.message);
      delete payload.seat_capacity;
      const retry = await supabase
        .from("trades")
        .upsert(payload, { onConflict: "id" })
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[Supabase Trade Sync Error] Error updating/saving trade in Supabase:", error);
    } else {
      console.log(`[Supabase Trade Sync Success] Upserted trade '${trade.id}'. Affected rows count: ${data ? data.length : 0}`, data);
      
      const { data: verified, error: verifyErr } = await supabase
        .from("trades")
        .select("*")
        .eq("id", trade.id);

      if (verifyErr) {
        console.error("[Supabase Trade Verification Error]", verifyErr);
      } else {
        console.log(`[Supabase Trade Verified] Read back record for '${trade.id}':`, verified);
      }

      await reloadTradesFromSupabase();
    }
    return { data, error };
  });
}

// 2b. BATCH ASSIGNMENT HISTORY APIs
export function getAssignmentHistory(): BatchAssignmentHistory[] {
  return getStoredData<BatchAssignmentHistory>(KEYS.ASSIGNMENT_HISTORY);
}

export function addAssignmentHistoryRecord(record: BatchAssignmentHistory) {
  const history = getAssignmentHistory();
  history.unshift(record);
  setStoredData(KEYS.ASSIGNMENT_HISTORY, history);

  safeSupabaseOp("Save Assignment History", () => supabase.from("assignment_history").upsert(camelToSnake(record)));
}

// 3. BATCH APIs
export function getBatches(): Batch[] {
  return getStoredData<Batch>(KEYS.BATCHES);
}

export async function reloadBatchesFromSupabase(): Promise<Batch[]> {
  if (!isSupabaseConfigured) return getBatches();
  try {
    const { data, error } = await supabase.from("batches").select("*");
    if (error) {
      console.error("Error reloading batches from Supabase:", error);
      return getBatches();
    }
    if (data) {
      const camelBatches = snakeToCamel(data);
      setStoredData(KEYS.BATCHES, camelBatches);
      return camelBatches;
    }
  } catch (err) {
    console.error("Exception reloading batches from Supabase:", err);
  }
  return getBatches();
}

export function saveBatch(batch: Batch) {
  const batches = getBatches();
  const idx = batches.findIndex(b => b.id === batch.id);
  const isUpdate = idx > -1;

  if (isUpdate) {
    batches[idx] = batch;
  } else {
    batches.push(batch);
  }
  setStoredData(KEYS.BATCHES, batches);

  safeSupabaseOp("Save Batch", async () => {
    const payload = camelToSnake(batch);
    delete payload.capacity;

    console.log(`[Supabase Batch Sync] Upserting on table 'batches', Record ID: '${batch.id}', Payload:`, payload);

    const { data, error } = await supabase
      .from("batches")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) {
      console.error("[Supabase Batch Sync Error] Error updating/saving batch in Supabase:", error);
    } else {
      console.log(`[Supabase Batch Sync Success] Upserted batch '${batch.id}'. Affected rows count: ${data ? data.length : 0}`, data);

      const { data: verified, error: verifyErr } = await supabase
        .from("batches")
        .select("*")
        .eq("id", batch.id);

      if (verifyErr) {
        console.error("[Supabase Batch Verification Error]", verifyErr);
      } else {
        console.log(`[Supabase Batch Verified] Read back record for '${batch.id}':`, verified);
      }

      await reloadBatchesFromSupabase();
    }
    return { data, error };
  });
}

// 4. STUDENT APIs
export function getStudents(): Student[] {
  return getStoredData<Student>(KEYS.STUDENTS);
}

export async function reloadStudentsFromSupabase(): Promise<Student[]> {
  if (!isSupabaseConfigured) return getStudents();
  try {
    const { data, error } = await supabase.from("students").select("*");
    if (error) {
      console.error("Error reloading students from Supabase:", error);
      return getStudents();
    }
    if (data) {
      const camelStudents = snakeToCamel(data);
      setStoredData(KEYS.STUDENTS, camelStudents);
      syncStudentsToIndexedDB(camelStudents);
      return camelStudents;
    }
  } catch (err) {
    console.error("Exception reloading students from Supabase:", err);
  }
  return getStudents();
}

export function saveStudent(student: Student) {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === student.id);
  const now = new Date().toISOString();
  let updated: Student;
  if (idx > -1) {
    updated = { ...student, updatedAt: now };
    students[idx] = updated;
  } else {
    updated = { ...student, createdAt: now, updatedAt: now };
    students.push(updated);
  }
  setStoredData(KEYS.STUDENTS, students);
  syncStudentsToIndexedDB(students);

  safeSupabaseOp("Save Student", async () => {
    const payload = camelToSnake(updated);
    console.log(`[Supabase Student Sync] Upserting on table 'students', Record ID: '${updated.id}', Payload:`, payload);

    const { data, error } = await supabase
      .from("students")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) {
      console.error("[Supabase Student Sync Error] Error updating/saving student in Supabase:", error);
    } else {
      const affectedCount = data ? data.length : 0;
      console.log(`[Supabase Student Sync Success] Upserted student '${updated.id}'. Affected rows count: ${affectedCount}`, data);
      if (affectedCount === 1) {
        console.log(`[Supabase Student Sync Verified] Exactly 1 row affected for student ID '${updated.id}'.`);
      } else {
        console.warn(`[Supabase Student Sync Notice] Expected 1 affected row, got ${affectedCount}.`);
      }
      await reloadStudentsFromSupabase();
    }
    return { data, error };
  });
}

export function deleteStudent(id: string) {
  const students = getStudents();
  const updated = students.filter(s => s.id !== id);
  setStoredData(KEYS.STUDENTS, updated);
  syncStudentsToIndexedDB(updated);

  safeSupabaseOp("Delete Student", async () => {
    console.log(`[Supabase Student Delete] Deleting student ID: '${id}' from table 'students'`);

    const { data, error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("[Supabase Student Delete Error] Error deleting student from Supabase:", error);
    } else {
      const affectedCount = data ? data.length : 0;
      console.log(`[Supabase Student Delete Success] Deleted student '${id}'. Affected rows count: ${affectedCount}`, data);
      if (affectedCount === 1) {
        console.log(`[Supabase Student Delete Verified] Exactly 1 row deleted for student ID '${id}'.`);
      } else {
        console.warn(`[Supabase Student Delete Notice] Expected 1 deleted row, got ${affectedCount}.`);
      }
      await reloadStudentsFromSupabase();
    }
    return { data, error };
  });
}

export function saveStudentsBatch(newStudents: Student[]) {
  const students = getStudents();
  const now = new Date().toISOString();
  const updatedRecords: Student[] = [];

  newStudents.forEach(newStu => {
    const idx = students.findIndex(s => s.id === newStu.id || (newStu.enrollmentNumber && s.enrollmentNumber === newStu.enrollmentNumber));
    let updated: Student;
    if (idx > -1) {
      updated = { ...students[idx], ...newStu, updatedAt: now };
      students[idx] = updated;
    } else {
      updated = { ...newStu, createdAt: now, updatedAt: now };
      students.push(updated);
    }
    updatedRecords.push(updated);
  });

  setStoredData(KEYS.STUDENTS, students);
  syncStudentsToIndexedDB(students);

  if (updatedRecords.length > 0) {
    safeSupabaseOp("Save Students Batch", async () => {
      const payloadList = camelToSnake(updatedRecords);
      console.log(`[Supabase Student Batch Sync] Upserting ${payloadList.length} students on table 'students'`);

      const { data, error } = await supabase
        .from("students")
        .upsert(payloadList, { onConflict: "id" })
        .select();

      if (error) {
        console.error("[Supabase Student Batch Sync Error] Error in batch upsert:", error);
      } else {
        const affectedCount = data ? data.length : 0;
        console.log(`[Supabase Student Batch Sync Success] Upserted student batch. Affected rows count: ${affectedCount}`, data);
        await reloadStudentsFromSupabase();
      }
      return { data, error };
    });
  }
}

// 5. STATUS HISTORY APIs
export function getHistory(): StudentStatusHistory[] {
  return getStoredData<StudentStatusHistory>(KEYS.HISTORY);
}

export function addHistoryRecord(record: StudentStatusHistory) {
  const history = getHistory();
  history.unshift(record);
  setStoredData(KEYS.HISTORY, history);

  safeSupabaseOp("Save Status History", () => supabase.from("student_status_history").upsert(camelToSnake(record)));
}

// 6. AUDIT LOG APIs
export function getLogs(): AuditLog[] {
  return getStoredData<AuditLog>(KEYS.LOGS);
}

export function addAuditLog(user: string, action: string) {
  const logs = getLogs();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const userName = user || "System";
  const log: AuditLog = {
    id: generateId(),
    user: userName,
    action: action || "",
    date: dateStr,
    time: timeStr
  };
  logs.unshift(log);
  setStoredData(KEYS.LOGS, logs);

  safeSupabaseOp("Save Audit Log", () => supabase.from("audit_logs").upsert({
    id: log.id,
    user_name: log.user,
    action: log.action,
    date: log.date,
    time: log.time
  }));
}

// 7. WORKING DAYS APIs
export function getWorkingDays(): MonthlyWorkingDays[] {
  return getStoredData<MonthlyWorkingDays>(KEYS.WORKING_DAYS);
}

export function saveWorkingDays(wd: MonthlyWorkingDays) {
  const list = getWorkingDays();
  const idx = list.findIndex(item => item.id === wd.id);
  if (idx > -1) {
    list[idx] = wd;
  } else {
    list.push(wd);
  }
  setStoredData(KEYS.WORKING_DAYS, list);

  safeSupabaseOp("Save Working Days", () => supabase.from("working_days").upsert(camelToSnake(wd)));
}

export function deleteWorkingDays(id: string) {
  const list = getWorkingDays();
  const filtered = list.filter(item => item.id !== id);
  setStoredData(KEYS.WORKING_DAYS, filtered);

  safeSupabaseOp("Delete Working Days", () => supabase.from("working_days").delete().eq("id", id));
}

// 8. ATTENDANCE APIs
export function getAttendance(): StudentAttendance[] {
  return getStoredData<StudentAttendance>(KEYS.ATTENDANCE);
}

export async function reloadAttendanceFromSupabase(): Promise<StudentAttendance[]> {
  if (!isSupabaseConfigured) return getAttendance();
  try {
    const { data, error } = await supabase.from("attendance").select("*");
    if (error) {
      console.error("Error reloading attendance from Supabase:", error);
      return getAttendance();
    }
    if (data) {
      const camelAttendance = snakeToCamel(data);
      setStoredData(KEYS.ATTENDANCE, camelAttendance);
      return camelAttendance;
    }
  } catch (err) {
    console.error("Exception reloading attendance from Supabase:", err);
  }
  return getAttendance();
}

export function saveAttendance(att: StudentAttendance) {
  const list = getAttendance();
  const idx = list.findIndex(item => item.id === att.id || (item.studentId === att.studentId && item.month === att.month));
  if (idx > -1) {
    list[idx] = att;
  } else {
    list.push(att);
  }
  setStoredData(KEYS.ATTENDANCE, list);

  safeSupabaseOp("Save Attendance", () => supabase.from("attendance").upsert(camelToSnake(att), { onConflict: "id" }));
}

export function saveAttendanceBatch(attRecords: StudentAttendance[]) {
  const list = getAttendance();
  const updatedList: StudentAttendance[] = [];

  attRecords.forEach(rec => {
    const idx = list.findIndex(item => (item.id && rec.id && item.id === rec.id) || (item.studentId === rec.studentId && item.month === rec.month));
    let updated: StudentAttendance;
    if (idx > -1) {
      updated = { ...list[idx], ...rec, id: list[idx].id || rec.id };
      list[idx] = updated;
    } else {
      updated = rec;
      list.push(updated);
    }
    updatedList.push(updated);
  });

  setStoredData(KEYS.ATTENDANCE, list);

  if (updatedList.length > 0) {
    safeSupabaseOp("Save Attendance Batch", async () => {
      const payload = camelToSnake(updatedList);
      const res = await supabase.from("attendance").upsert(payload, { onConflict: "id" });
      await reloadAttendanceFromSupabase();
      return res;
    });
  }
}

export function deleteAttendance(id: string) {
  const list = getAttendance();
  const filtered = list.filter(item => item.id !== id);
  setStoredData(KEYS.ATTENDANCE, filtered);

  safeSupabaseOp("Delete Attendance", () => supabase.from("attendance").delete().eq("id", id));
}

// 8b. GENERATED REPORTS (REPORT HISTORY) APIs
export function getGeneratedReports(): GeneratedReport[] {
  return getStoredData<GeneratedReport>(KEYS.GENERATED_REPORTS);
}

export async function reloadGeneratedReportsFromSupabase(): Promise<GeneratedReport[]> {
  if (!isSupabaseConfigured) return getGeneratedReports();
  try {
    const { data, error } = await supabase.from("generated_reports").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error reloading generated_reports from Supabase:", error);
      return getGeneratedReports();
    }
    if (data) {
      const camelReports = snakeToCamel(data);
      setStoredData(KEYS.GENERATED_REPORTS, camelReports);
      return camelReports;
    }
  } catch (err) {
    console.error("Exception reloading generated_reports from Supabase:", err);
  }
  return getGeneratedReports();
}

export function saveGeneratedReport(report: GeneratedReport) {
  const reports = getGeneratedReports();
  const idx = reports.findIndex(r => r.id === report.id);
  const now = new Date().toISOString();
  let updated: GeneratedReport;
  if (idx > -1) {
    updated = { ...report, updatedAt: now };
    reports[idx] = updated;
  } else {
    updated = { ...report, createdAt: now, updatedAt: now };
    reports.unshift(updated);
  }
  setStoredData(KEYS.GENERATED_REPORTS, reports);

  safeSupabaseOp("Save Generated Report", () => supabase.from("generated_reports").upsert(camelToSnake(updated), { onConflict: "id" }));
}

export function deleteGeneratedReport(id: string) {
  const reports = getGeneratedReports();
  const filtered = reports.filter(r => r.id !== id);
  setStoredData(KEYS.GENERATED_REPORTS, filtered);

  safeSupabaseOp("Delete Generated Report", () => supabase.from("generated_reports").delete().eq("id", id));
}

// 9. PROMOTION APIs
export function getPromotions(): PromotionRecord[] {
  return getStoredData<PromotionRecord>(KEYS.PROMOTIONS);
}

export function savePromotion(rec: PromotionRecord) {
  const list = getPromotions();
  const idx = list.findIndex(item => item.id === rec.id);
  if (idx > -1) {
    list[idx] = rec;
  } else {
    list.unshift(rec);
  }
  setStoredData(KEYS.PROMOTIONS, list);

  safeSupabaseOp("Save Promotion", () => supabase.from("promotions").upsert(camelToSnake(rec)));
}

export function promoteStudents(records: PromotionRecord[]) {
  const students = getStudents();
  const promotions = getPromotions();
  
  records.forEach(rec => {
    const sIdx = students.findIndex(s => s.id === rec.studentId);
    if (sIdx > -1) {
      const student = students[sIdx];
      student.trade = rec.newTrade;
      student.batchId = rec.newBatchId;
      student.batchName = rec.newBatchName;
      student.year = rec.newYear;
      student.shift = rec.newShift;
      student.currentStatus = StudentStatus.ACTIVE;
      student.updatedAt = new Date().toISOString();
      students[sIdx] = student;
    }
    promotions.unshift(rec);
  });

  setStoredData(KEYS.STUDENTS, students);
  setStoredData(KEYS.PROMOTIONS, promotions);
  syncStudentsToIndexedDB(students);

  const studentUpdates = records.map(rec => {
    const s = students.find(x => x.id === rec.studentId);
    return s ? camelToSnake(s) : null;
  }).filter(Boolean);

  safeSupabaseOp("Promote Students", () => Promise.all([
    supabase.from("students").upsert(studentUpdates),
    supabase.from("promotions").upsert(camelToSnake(records))
  ]));
}

export function reversePromotion(promotionId: string, reversedBy: string): boolean {
  const promotions = getPromotions();
  const students = getStudents();
  
  const pIdx = promotions.findIndex(p => p.id === promotionId);
  if (pIdx === -1) return false;
  if (promotions[pIdx].isReversed) return false;

  const rec = promotions[pIdx];
  
  const sIdx = students.findIndex(s => s.id === rec.studentId);
  if (sIdx > -1) {
    const student = students[sIdx];
    student.trade = rec.oldTrade;
    student.batchId = rec.oldBatchId;
    student.batchName = rec.oldBatchName;
    student.year = rec.oldYear;
    student.shift = rec.oldShift;
    student.updatedAt = new Date().toISOString();
    students[sIdx] = student;
  }

  rec.isReversed = true;
  rec.reversedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  rec.reversedBy = reversedBy;
  promotions[pIdx] = rec;

  setStoredData(KEYS.STUDENTS, students);
  setStoredData(KEYS.PROMOTIONS, promotions);
  syncStudentsToIndexedDB(students);

  const studentObj = students.find(x => x.id === rec.studentId);
  if (studentObj) {
    safeSupabaseOp("Reverse Promotion", () => Promise.all([
      supabase.from("students").upsert(camelToSnake(studentObj)),
      supabase.from("promotions").upsert(camelToSnake(rec))
    ]));
  }
  return true;
}

// 10. LETTERS & GENERAL LETTERS helper APIs
export function getGeneralLetter(templateId: string): GeneralLetterData | null {
  return (MEMORY_DB[`general_letter_${templateId}`] as GeneralLetterData) || null;
}

export function saveGeneralLetter(templateId: string, data: GeneralLetterData) {
  MEMORY_DB[`general_letter_${templateId}`] = data;

  safeSupabaseOp("Save General Letter", () => supabase.from("general_letters").upsert(camelToSnake(data)));
}

export function getLetterDrafts(templateId?: string): LetterReportDraft[] {
  const draftsKey = "iti_letter_report_drafts";
  let list: LetterReportDraft[] = MEMORY_DB[draftsKey] || [];
  if (!list || list.length === 0) {
    const saved = localStorage.getItem(draftsKey);
    if (saved) {
      try {
        list = JSON.parse(saved);
        MEMORY_DB[draftsKey] = list;
      } catch (e) {
        list = [];
      }
    }
  }
  if (templateId) {
    return list.filter(d => d.templateId === templateId);
  }
  return list;
}

export function saveLetterDraft(draft: LetterReportDraft): void {
  const draftsKey = "iti_letter_report_drafts";
  const list = getLetterDrafts();
  const idx = list.findIndex(d => d.id === draft.id);
  if (idx > -1) {
    list[idx] = draft;
  } else {
    list.unshift(draft);
  }
  MEMORY_DB[draftsKey] = list;
  try {
    localStorage.setItem(draftsKey, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not save letter draft to localStorage", err);
  }

  safeSupabaseOp("Save Letter Draft", () => supabase.from("letter_report_drafts").upsert(camelToSnake(draft)));
}

export function deleteLetterDraft(draftId: string): void {
  const draftsKey = "iti_letter_report_drafts";
  const list = getLetterDrafts();
  const filtered = list.filter(d => d.id !== draftId);
  MEMORY_DB[draftsKey] = filtered;
  try {
    localStorage.setItem(draftsKey, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Could not update letter drafts in localStorage", err);
  }

  safeSupabaseOp("Delete Letter Draft", () => supabase.from("letter_report_drafts").delete().eq("id", draftId));
}

export function getLetterTemplate(batchId: string): string | null {
  return (MEMORY_DB[`letter_template_${batchId}`] as string) || null;
}

export function saveLetterTemplate(batchId: string, template: string) {
  MEMORY_DB[`letter_template_${batchId}`] = template;

  safeSupabaseOp("Save Letter Template", () => supabase.from("letters").upsert({ id: batchId, template_text: template }));
}

// Initializer & Sync down
export function initializeStorage() {
  // Populate MEMORY_DB with defaults or saved localStorage data
  try {
    const storedUsers = localStorage.getItem(KEYS.USERS);
    MEMORY_DB[KEYS.USERS] = storedUsers ? JSON.parse(storedUsers) : [...DEFAULT_USERS];

    const storedTrades = localStorage.getItem(KEYS.TRADES);
    MEMORY_DB[KEYS.TRADES] = storedTrades ? JSON.parse(storedTrades) : [...DEFAULT_TRADES];

    const storedBatches = localStorage.getItem(KEYS.BATCHES);
    MEMORY_DB[KEYS.BATCHES] = storedBatches ? JSON.parse(storedBatches) : [...DEFAULT_BATCHES];

    const storedStudents = localStorage.getItem(KEYS.STUDENTS);
    MEMORY_DB[KEYS.STUDENTS] = storedStudents ? JSON.parse(storedStudents) : [...DEFAULT_STUDENTS];

    const storedHistory = localStorage.getItem(KEYS.HISTORY);
    MEMORY_DB[KEYS.HISTORY] = storedHistory ? JSON.parse(storedHistory) : [...DEFAULT_HISTORY];

    const storedLogs = localStorage.getItem(KEYS.LOGS);
    MEMORY_DB[KEYS.LOGS] = storedLogs ? JSON.parse(storedLogs) : [...DEFAULT_LOGS];

    const storedAssignment = localStorage.getItem(KEYS.ASSIGNMENT_HISTORY);
    MEMORY_DB[KEYS.ASSIGNMENT_HISTORY] = storedAssignment ? JSON.parse(storedAssignment) : [];

    const storedWD = localStorage.getItem(KEYS.WORKING_DAYS);
    MEMORY_DB[KEYS.WORKING_DAYS] = storedWD ? JSON.parse(storedWD) : [];

    const storedAttendance = localStorage.getItem(KEYS.ATTENDANCE);
    MEMORY_DB[KEYS.ATTENDANCE] = storedAttendance ? JSON.parse(storedAttendance) : [];

    const storedPromotions = localStorage.getItem(KEYS.PROMOTIONS);
    MEMORY_DB[KEYS.PROMOTIONS] = storedPromotions ? JSON.parse(storedPromotions) : [];

    const storedSIProfiles = localStorage.getItem(KEYS.SI_PROFILES);
    MEMORY_DB[KEYS.SI_PROFILES] = storedSIProfiles ? JSON.parse(storedSIProfiles) : [
      {
        id: "sip-si",
        userId: "user-si",
        nameEnglish: "Supervisor Instructor",
        nameGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
        designationEnglish: "Supervisor Instructor",
        designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
        officeEnglish: "ITI Porbandar",
        officeGujarati: "આઈ.ટી.આઈ. પોરબંદર",
        departmentEnglish: "ITI Porbandar",
        departmentGujarati: "રોજગાર અને તાલીમ વિભાગ",
        employeeId: "EMP-SI",
        mobile: "+91 9876543210",
        addressEnglish: "ITI Porbandar Campus",
        addressGujarati: "આઈ.ટી.આઈ. પોરબંદર કેમ્પસ",
        salary: "53100",
        createdAt: "2026-07-21T00:00:00Z",
        updatedAt: "2026-07-21T00:00:00Z"
      }
    ];

    const storedLeave = localStorage.getItem(KEYS.LEAVE_APPLICATIONS);
    MEMORY_DB[KEYS.LEAVE_APPLICATIONS] = storedLeave ? JSON.parse(storedLeave) : [];

    const storedReports = localStorage.getItem(KEYS.GENERATED_REPORTS);
    MEMORY_DB[KEYS.GENERATED_REPORTS] = storedReports ? JSON.parse(storedReports) : [];
  } catch (err) {
    console.error("Failed to read from localStorage during initializeStorage", err);
    MEMORY_DB[KEYS.USERS] = [...DEFAULT_USERS];
    MEMORY_DB[KEYS.TRADES] = [...DEFAULT_TRADES];
    MEMORY_DB[KEYS.BATCHES] = [...DEFAULT_BATCHES];
    MEMORY_DB[KEYS.STUDENTS] = [...DEFAULT_STUDENTS];
    MEMORY_DB[KEYS.HISTORY] = [...DEFAULT_HISTORY];
    MEMORY_DB[KEYS.LOGS] = [...DEFAULT_LOGS];
    MEMORY_DB[KEYS.ASSIGNMENT_HISTORY] = [];
    MEMORY_DB[KEYS.WORKING_DAYS] = [];
    MEMORY_DB[KEYS.ATTENDANCE] = [];
    MEMORY_DB[KEYS.PROMOTIONS] = [];
    MEMORY_DB[KEYS.SI_PROFILES] = [
      {
        id: "sip-si",
        userId: "user-si",
        nameEnglish: "Supervisor Instructor",
        nameGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
        designationEnglish: "Supervisor Instructor",
        designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
        officeEnglish: "ITI Porbandar",
        officeGujarati: "આઈ.ટી.આઈ. પોરબંદર",
        departmentEnglish: "ITI Porbandar",
        departmentGujarati: "રોજગાર અને તાલીમ વિભાગ",
        employeeId: "EMP-SI",
        mobile: "+91 9876543210",
        addressEnglish: "ITI Porbandar Campus",
        addressGujarati: "આઈ.ટી.આઈ. પોરબંદર કેમ્પસ",
        salary: "53100",
        createdAt: "2026-07-21T00:00:00Z",
        updatedAt: "2026-07-21T00:00:00Z"
      }
    ];
    MEMORY_DB[KEYS.LEAVE_APPLICATIONS] = [];
  }
}

// 10. SI PROFILE APIs
export function getSIProfiles(): SIProfile[] {
  return getStoredData<SIProfile>(KEYS.SI_PROFILES);
}

export function getSIProfileByUserId(userId: string): SIProfile | null {
  const profiles = getSIProfiles();
  return profiles.find(p => p.userId === userId) || null;
}

export function saveSIProfile(profile: SIProfile) {
  const profiles = getSIProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id || p.userId === profile.userId);
  if (idx > -1) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  setStoredData(KEYS.SI_PROFILES, profiles);

  safeSupabaseOp("Save S.I. Profile", () => supabase.from("si_profiles").upsert(camelToSnake(profile), { onConflict: "user_id" }));
}

export function deleteSIProfile(profileId: string, userId?: string) {
  const profiles = getSIProfiles();
  const filtered = profiles.filter(p => p.id !== profileId && p.userId !== userId);
  setStoredData(KEYS.SI_PROFILES, filtered);

  if (profileId) {
    safeSupabaseOp("Delete S.I. Profile by id", () => supabase.from("si_profiles").delete().eq("id", profileId));
  } else if (userId) {
    safeSupabaseOp("Delete S.I. Profile by user_id", () => supabase.from("si_profiles").delete().eq("user_id", userId));
  }
}

// 11. LEAVE APPLICATION APIs
export function getLeaveApplications(): LeaveApplication[] {
  return getStoredData<LeaveApplication>(KEYS.LEAVE_APPLICATIONS);
}

export function getLeaveApplicationsByUserId(userId: string): LeaveApplication[] {
  const apps = getLeaveApplications();
  return apps.filter(a => a.userId === userId);
}

export function saveLeaveApplication(app: LeaveApplication) {
  const apps = getLeaveApplications();
  const idx = apps.findIndex(a => a.id === app.id);
  const now = new Date().toISOString();
  let updated: LeaveApplication;
  if (idx > -1) {
    updated = { ...app, updatedAt: now };
    apps[idx] = updated;
  } else {
    updated = { ...app, createdAt: now, updatedAt: now };
    apps.push(updated);
  }
  setStoredData(KEYS.LEAVE_APPLICATIONS, apps);

  const supabasePayload: any = camelToSnake(updated);
  // Encode Field No. 9 into address_during_leave_english so it persists across Supabase syncs
  if (updated.priorLeaveDate || updated.priorLeaveType || updated.priorLeaveDays) {
    supabasePayload.address_during_leave_english = JSON.stringify({
      priorLeaveDate: updated.priorLeaveDate || "",
      priorLeaveType: updated.priorLeaveType || "",
      priorLeaveDays: updated.priorLeaveDays || ""
    });
  }
  // Delete unmapped table columns to avoid PostgREST column missing error
  delete supabasePayload.prior_leave_date;
  delete supabasePayload.prior_leave_type;
  delete supabasePayload.prior_leave_days;

  safeSupabaseOp("Save Leave Application", () => supabase.from("leave_applications").upsert(supabasePayload, { onConflict: "id" }));
}

export function deleteLeaveApplication(id: string) {
  const apps = getLeaveApplications();
  const filtered = apps.filter(a => a.id !== id);
  setStoredData(KEYS.LEAVE_APPLICATIONS, filtered);

  safeSupabaseOp("Delete Leave Application", () => supabase.from("leave_applications").delete().eq("id", id));
}

/**
 * Sync from Supabase down to local state.
 */
export async function syncFromSupabase() {
  if (!isSupabaseConfigured) {
    console.log("Supabase is not configured yet. Running in offline/local storage mode.");
    return;
  }
  try {
    // Ensure default ADMIN and SI accounts exist with correct passwords and roles on Supabase
    const defaultAdmin: User = {
      id: "user-admin",
      username: "admin",
      password: "password123",
      name: "Institute Administrator",
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: "2026-01-01"
    };

    const defaultSI: User = {
      id: "user-si",
      username: "si",
      name: "Supervisor Instructor",
      role: UserRole.SUPERVISOR_INSTRUCTOR,
      isActive: true,
      createdAt: "2026-07-21",
      supervisorNameEnglish: "Supervisor Instructor",
      supervisorNameGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર"
    };

    const defaultSIProfile: SIProfile = {
      id: "sip-si",
      userId: "user-si",
      nameEnglish: "Supervisor Instructor",
      nameGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
      designationEnglish: "Supervisor Instructor",
      designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર",
      officeEnglish: "ITI Porbandar",
      officeGujarati: "આઈ.ટી.આઈ. પોરબંદર",
      departmentEnglish: "ITI Porbandar",
      departmentGujarati: "રોજગાર અને તાલીમ વિભાગ",
      employeeId: "EMP-SI",
      mobile: "+91 9876543210",
      addressEnglish: "ITI Porbandar Campus",
      addressGujarati: "આઈ.ટી.આઈ. પોરબંદર કેમ્પસ",
      salary: "53100",
      createdAt: "2026-07-21T00:00:00Z",
      updatedAt: "2026-07-21T00:00:00Z"
    };

    try {
      await Promise.all([
        supabase.from("users").upsert(camelToSnake(defaultAdmin)),
        supabase.from("users").upsert(camelToSnake(defaultSI)),
        supabase.from("si_profiles").upsert(camelToSnake(defaultSIProfile))
      ]);
      console.log("Default accounts and profile verified/upserted to Supabase successfully.");
    } catch (e) {
      console.warn("Could not auto-upsert default accounts to Supabase:", e);
    }

    const [
      { data: dbUsers, error: errUsers },
      { data: dbTrades, error: errTrades },
      { data: dbBatches, error: errBatches },
      { data: dbStudents, error: errStudents },
      { data: dbHistory, error: errHistory },
      { data: dbLogs, error: errLogs },
      { data: dbWorkingDays, error: errWorkingDays },
      { data: dbAttendance, error: errAttendance },
      { data: dbPromotions, error: errPromotions },
      { data: dbAssignmentHistory, error: errAssignmentHistory },
      { data: dbLetters, error: errLetters },
      { data: dbGeneralLetters, error: errGeneralLetters }
    ] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("trades").select("*"),
      supabase.from("batches").select("*"),
      supabase.from("students").select("*"),
      supabase.from("student_status_history").select("*"),
      supabase.from("audit_logs").select("*"),
      supabase.from("working_days").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("promotions").select("*"),
      supabase.from("assignment_history").select("*"),
      supabase.from("letters").select("*"),
      supabase.from("general_letters").select("*")
    ]);

    if (errUsers || errStudents) {
      console.warn("Could not query Supabase database. Schema may need initialization.", { errUsers, errStudents });
      return;
    }

    const hasData = (dbUsers && dbUsers.length > 0) || (dbStudents && dbStudents.length > 0);

    if (!hasData) {
      console.log("Supabase users table is empty. Seeding initial admin/supervisor accounts...");
      await supabase.from("users").insert(camelToSnake(DEFAULT_USERS));
      await supabase.from("trades").insert(camelToSnake(DEFAULT_TRADES));
      await supabase.from("batches").insert(camelToSnake(DEFAULT_BATCHES));
      await supabase.from("students").insert(camelToSnake(DEFAULT_STUDENTS));
      await supabase.from("student_status_history").insert(camelToSnake(DEFAULT_HISTORY));
      await supabase.from("audit_logs").insert(DEFAULT_LOGS.map(l => ({
        id: l.id,
        user_name: l.user,
        action: l.action,
        date: l.date,
        time: l.time
      })));

      // Re-fetch users and data
      const { data: seededUsers } = await supabase.from("users").select("*");
      const { data: seededTrades } = await supabase.from("trades").select("*");
      const { data: seededBatches } = await supabase.from("batches").select("*");
      const { data: seededStudents } = await supabase.from("students").select("*");
      const { data: seededHistory } = await supabase.from("student_status_history").select("*");
      const { data: seededLogs } = await supabase.from("audit_logs").select("*");

      MEMORY_DB[KEYS.USERS] = seededUsers ? snakeToCamel(seededUsers) : [];
      MEMORY_DB[KEYS.TRADES] = seededTrades ? snakeToCamel(seededTrades) : [];
      MEMORY_DB[KEYS.BATCHES] = seededBatches ? snakeToCamel(seededBatches) : [];
      MEMORY_DB[KEYS.STUDENTS] = seededStudents ? snakeToCamel(seededStudents) : [];
      MEMORY_DB[KEYS.HISTORY] = seededHistory ? snakeToCamel(seededHistory) : [];
      MEMORY_DB[KEYS.LOGS] = seededLogs ? seededLogs.map((l: any) => ({
        id: l.id,
        user: l.user_name || l.userName || l.user || "System",
        action: l.action || "",
        date: l.date || "",
        time: l.time || ""
      })) : [];
      MEMORY_DB[KEYS.WORKING_DAYS] = [];
      MEMORY_DB[KEYS.ATTENDANCE] = [];
      MEMORY_DB[KEYS.PROMOTIONS] = [];
      MEMORY_DB[KEYS.ASSIGNMENT_HISTORY] = [];
      return;
    }

    setStoredData(KEYS.USERS, dbUsers ? snakeToCamel(dbUsers) : []);
    // Auto-seed trades if table in Supabase is empty
    if (!dbTrades || dbTrades.length === 0) {
      console.log("Trades table in Supabase is empty. Seeding default trades...");
      const sanitizedDefaultTrades = camelToSnake(DEFAULT_TRADES).map((t: any) => {
        delete t.seat_capacity;
        return t;
      });
      await supabase.from("trades").upsert(sanitizedDefaultTrades, { onConflict: "id" });
      const { data: reFetchedTrades } = await supabase.from("trades").select("*");
      setStoredData(KEYS.TRADES, reFetchedTrades ? snakeToCamel(reFetchedTrades) : DEFAULT_TRADES);
    } else {
      setStoredData(KEYS.TRADES, snakeToCamel(dbTrades));
    }

    // Auto-seed batches if table in Supabase is empty
    if (!dbBatches || dbBatches.length === 0) {
      console.log("Batches table in Supabase is empty. Seeding default batches...");
      const sanitizedDefaultBatches = camelToSnake(DEFAULT_BATCHES).map((b: any) => {
        delete b.capacity;
        return b;
      });
      await supabase.from("batches").upsert(sanitizedDefaultBatches, { onConflict: "id" });
      const { data: reFetchedBatches } = await supabase.from("batches").select("*");
      setStoredData(KEYS.BATCHES, reFetchedBatches ? snakeToCamel(reFetchedBatches) : DEFAULT_BATCHES);
    } else {
      setStoredData(KEYS.BATCHES, snakeToCamel(dbBatches));
    }
    setStoredData(KEYS.STUDENTS, dbStudents ? snakeToCamel(dbStudents) : []);
    setStoredData(KEYS.HISTORY, dbHistory ? snakeToCamel(dbHistory) : []);
    setStoredData(KEYS.LOGS, dbLogs ? dbLogs.map((l: any) => ({
      id: l.id,
      user: l.user_name || l.userName || l.user || "System",
      action: l.action || "",
      date: l.date || "",
      time: l.time || ""
    })) : []) ;
    setStoredData(KEYS.WORKING_DAYS, dbWorkingDays ? snakeToCamel(dbWorkingDays) : []);
    setStoredData(KEYS.ATTENDANCE, dbAttendance ? snakeToCamel(dbAttendance) : []);
    setStoredData(KEYS.PROMOTIONS, dbPromotions ? snakeToCamel(dbPromotions) : []);
    setStoredData(KEYS.ASSIGNMENT_HISTORY, dbAssignmentHistory ? snakeToCamel(dbAssignmentHistory) : []);

    if (dbLetters) {
      dbLetters.forEach(l => {
        MEMORY_DB[`letter_template_${l.id}`] = l.template_text;
      });
    }
    if (dbGeneralLetters) {
      dbGeneralLetters.forEach(gl => {
        MEMORY_DB[`general_letter_${gl.id}`] = snakeToCamel(gl);
      });
    }

    // Sync S.I. Profiles and Leave Applications gracefully
    try {
      const { data: dbSIProfiles, error: errSIProfiles } = await supabase.from("si_profiles").select("*");
      if (!errSIProfiles && dbSIProfiles) {
        MEMORY_DB[KEYS.SI_PROFILES] = snakeToCamel(dbSIProfiles);
      }
    } catch (e) {
      console.warn("Could not sync si_profiles table from Supabase", e);
    }

    try {
      const { data: dbLeaveApps, error: errLeaveApps } = await supabase.from("leave_applications").select("*");
      if (!errLeaveApps && dbLeaveApps) {
        const parsedApps = snakeToCamel(dbLeaveApps).map((app: any) => {
          if (app.addressDuringLeaveEnglish) {
            try {
              const decoded = JSON.parse(app.addressDuringLeaveEnglish);
              if (decoded && typeof decoded === "object" && (decoded.priorLeaveDate || decoded.priorLeaveType || decoded.priorLeaveDays)) {
                return {
                  ...app,
                  priorLeaveDate: decoded.priorLeaveDate || app.priorLeaveDate,
                  priorLeaveType: decoded.priorLeaveType || app.priorLeaveType,
                  priorLeaveDays: decoded.priorLeaveDays || app.priorLeaveDays
                };
              }
            } catch (_) {}
          }
          return app;
        });
        MEMORY_DB[KEYS.LEAVE_APPLICATIONS] = parsedApps;
      }
    } catch (e) {
      console.warn("Could not sync leave_applications table from Supabase", e);
    }

    try {
      const { data: dbDrafts, error: errDrafts } = await supabase.from("letter_report_drafts").select("*");
      if (!errDrafts && dbDrafts) {
        MEMORY_DB["iti_letter_report_drafts"] = snakeToCamel(dbDrafts);
      }
    } catch (e) {
      console.warn("Could not sync letter_report_drafts table from Supabase", e);
    }

    try {
      const { data: dbSettings, error: errSettings } = await supabase.from("system_settings").select("*");
      if (!errSettings && dbSettings && dbSettings.length > 0) {
        const snapshotsList: any[] = [];
        dbSettings.forEach(s => {
          if (s.key) {
            MEMORY_DB[s.key] = s.value;
            if (s.key.startsWith("monthly_snapshot_") && s.value) {
              snapshotsList.push(s.value);
            }
          }
        });
        if (snapshotsList.length > 0) {
          MEMORY_DB[KEYS.MONTHLY_SNAPSHOTS] = snapshotsList;
        }
      }
    } catch (e) {
      console.warn("Could not sync system_settings table from Supabase", e);
    }

    try {
      const { data: dbReports, error: errReports } = await supabase.from("generated_reports").select("*").order("created_at", { ascending: false });
      if (!errReports && dbReports) {
        setStoredData(KEYS.GENERATED_REPORTS, snakeToCamel(dbReports));
      }
    } catch (e) {
      console.warn("Could not sync generated_reports table from Supabase", e);
    }

    console.log("Supabase data successfully synced to MEMORY_DB.");
  } catch (err) {
    console.error("Exception during Supabase data sync:", err);
  }
}

// --- OFFICIAL MONTHLY REPORT MANUAL DATA PERSISTENCE ---

export interface MonthlyReportManualEntry {
  year: number;
  month: number;
  tradeCode: string;
  batchNumber: string;
  brokenMachinesCount?: number;
  assessmentCompleted?: number;
  industrialVisitCount?: number;
  visitTraineesCount?: number;
  companiesVisitedCount?: number;
  ojtTraineesCount?: number;
  mouCompaniesCount?: number;
  instStipendCount?: number;
  socialWelfareCount?: number;
  guardianMeetingsCount?: number;
  attendedParentsCount?: number;
}

export function getMonthlyReportManualEntries(year: number, month: number): Record<string, MonthlyReportManualEntry> {
  const key = `monthly_report_manual_${year}_${month}`;
  if (MEMORY_DB[key] && Object.keys(MEMORY_DB[key]).length > 0) {
    return MEMORY_DB[key];
  }
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      MEMORY_DB[key] = parsed;
      return parsed;
    } catch (e) {
      console.error("Error parsing monthly report manual entries:", e);
    }
  }
  return MEMORY_DB[key] || {};
}

export function saveAllMonthlyReportManualEntries(year: number, month: number, entries: MonthlyReportManualEntry[]): void {
  const key = `monthly_report_manual_${year}_${month}`;
  const map: Record<string, MonthlyReportManualEntry> = {};
  entries.forEach(e => {
    map[`${e.tradeCode}_${e.batchNumber}`] = e;
  });

  MEMORY_DB[key] = map;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn("Could not save monthly report entries to localStorage:", err);
  }

  if (isSupabaseConfigured) {
    safeSupabaseOp("Save Monthly Report Manual Entries", () =>
      supabase.from("system_settings").upsert({
        key,
        value: map,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" })
    );
  }
}

// --- OFFICIAL MONTHLY REPORT SNAPSHOT PERSISTENCE ---

export function getMonthlySnapshots(): MonthlyReportSnapshot[] {
  const snapshots = getStoredData<MonthlyReportSnapshot>(KEYS.MONTHLY_SNAPSHOTS);
  if (!snapshots || snapshots.length === 0) {
    const saved = localStorage.getItem(KEYS.MONTHLY_SNAPSHOTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        MEMORY_DB[KEYS.MONTHLY_SNAPSHOTS] = parsed;
        return parsed;
      } catch (e) {
        console.error("Error parsing monthly snapshots:", e);
      }
    }
  }
  return snapshots || [];
}

export function saveMonthlySnapshot(snapshot: MonthlyReportSnapshot): void {
  const current = getMonthlySnapshots();
  const existingIdx = current.findIndex(s => s.year === snapshot.year && s.month === snapshot.month);
  
  if (existingIdx > -1) {
    current[existingIdx] = snapshot;
  } else {
    current.unshift(snapshot);
  }

  setStoredData(KEYS.MONTHLY_SNAPSHOTS, current);

  if (isSupabaseConfigured) {
    safeSupabaseOp("Save Monthly Snapshot", () =>
      supabase.from("system_settings").upsert({
        key: `monthly_snapshot_${snapshot.year}_${snapshot.month}`,
        value: snapshot,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" })
    );
  }
}

export function getMonthlySnapshotForPeriod(year: number, month: number): MonthlyReportSnapshot | null {
  const current = getMonthlySnapshots();
  return current.find(s => s.year === year && s.month === month) || null;
}

export function deleteMonthlySnapshot(id: string): void {
  const current = getMonthlySnapshots();
  const filtered = current.filter(s => s.id !== id);
  setStoredData(KEYS.MONTHLY_SNAPSHOTS, filtered);
}

