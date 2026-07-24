import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { Student, Batch, Trade, StudentStatus } from "../types";
import { NOTO_SANS_GUJARATI_BASE64 } from "./notoSansGujaratiBase64";
import { getStudents, getBatches, getTrades, getAttendance, getMonthlyReportManualEntries } from "./storage";

/**
 * Ensures Shruti font is registered in DOM head for html2canvas rendering
 */
export function ensureShrutiFontRegistered() {
  if (typeof document !== "undefined") {
    const styleId = "shruti-font-head-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @font-face {
          font-family: 'Shruti';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Shruti';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'Noto Sans Gujarati';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Noto Sans Gujarati';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        .shruti-report-font {
          font-family: 'Shruti', 'Noto Sans Gujarati', sans-serif !important;
        }
        .v-text-header {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: normal;
          word-break: break-word;
          text-align: center;
          font-size: 8px;
          line-height: 1.15;
          padding: 2px 1px;
          height: 125px;
          max-height: 125px;
          display: block;
          margin: 0 auto;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * Dynamically loads and verifies Shruti font into document.fonts for crisp Canvas API text drawing
 */
export async function loadShrutiFontForCanvas(): Promise<boolean> {
  if (typeof document === "undefined" || !("fonts" in document)) return false;

  try {
    const font = new FontFace("Shruti", `url(data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64})`);
    await font.load();
    document.fonts.add(font);
    console.log("Shruti font loaded successfully into document.fonts");
    return true;
  } catch (err) {
    console.warn("Could not load custom Shruti FontFace into Canvas, falling back to Noto Sans Gujarati", err);
    return false;
  }
}

export interface OnRollReportRow {
  tradeNameGujarati: string;
  tradeNameEnglish: string;
  tradeCode: string;
  batchNumber: string;
  batchSection: string;
  batchDisplay: string;
  isSenior: boolean;
  approvedSeats: number;
  filledSeats: number;
  batchA: number;
  batchB: number;
  batchC: number;
  onRoll: number;
  gen: number;
  sc: number;
  st: number;
  sebc: number;
  ews: number;
  female: number;
  male: number;
  attLessThan50: number;
  att50To80: number;
  attParentsInformed: number;
  dropoutCount: number;
  dropoutPct: string;
  assessmentCompleted: number;
  industrialVisitCount: number;
  visitTraineesCount: number;
  companiesVisitedCount: number;
  ojtTraineesCount: number;
  mouCompaniesCount: number;
  instStipendCount: number;
  socialWelfareCount: number;
  guardianMeetingsCount: number;
  attendedParentsCount: number;
  brokenMachinesCount: number;
}

export interface OnRollReportData {
  rows: OnRollReportRow[];
  juniorTotal: OnRollReportRow;
  seniorTotal: OnRollReportRow;
  grandTotal: OnRollReportRow;
  generatedDate: string;
  academicYear: string;
}

export function getLastDayOfMonthDateStr(year: number, month: number): string {
  // month is 1-based (1 for Jan, 8 for Aug, 12 for Dec)
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  return `${lastDay}/${monthStr}/${year}`;
}

export function formatReportCellVal(val: number | undefined | null): string {
  if (val === undefined || val === null || val === 0) return "-";
  return val.toString();
}

/**
 * Determines whether a student belongs to Batch Section A, B, or C
 */
export function getStudentBatchSection(s: Student, batches: Batch[]): "A" | "B" | "C" {
  const studentBatch = batches.find(b => b.id === s.batchId);
  
  // 1. Check matching batch object's section
  const sec = (studentBatch?.batchSection || "").trim().toUpperCase();
  if (sec === "B" || sec === "2" || sec.startsWith("B")) return "B";
  if (sec === "C" || sec === "3" || sec.startsWith("C")) return "C";
  if (sec === "A" || sec === "1" || sec.startsWith("A")) return "A";

  // 2. Check student's batchName (e.g., "Welder 84-A", "Wireman 84-B", "COPA 84 C", "84-B", "84-C")
  const bName = (s.batchName || "").toUpperCase();
  if (bName.includes("-B") || bName.includes(" B") || bName.includes("(B)") || bName.endsWith("B")) return "B";
  if (bName.includes("-C") || bName.includes(" C") || bName.includes("(C)") || bName.endsWith("C")) return "C";
  if (bName.includes("-A") || bName.includes(" A") || bName.includes("(A)") || bName.endsWith("A")) return "A";

  // 3. Check any custom property if set
  const customSec = String((s as any).batchSection || (s as any).section || (s as any).unit || "").trim().toUpperCase();
  if (customSec.includes("B") || customSec === "2") return "B";
  if (customSec.includes("C") || customSec === "3") return "C";

  return "A";
}

/**
 * Calculates live On-Roll data automatically from the database, overlaying saved manual entries
 */
export function calculateOnRollReportData(selectedYear: number = 2026, selectedMonth: number = 8): OnRollReportData {
  const students = getStudents();
  const batches = getBatches();
  const trades = getTrades();
  const attendanceList = getAttendance();
  const savedManualEntries = getMonthlyReportManualEntries(selectedYear, selectedMonth);

  // Official Master Template Trade & Batch Structure
  const juniorTradeConfig = [
    { srNo: 1, code: "WM", nameEng: "Wireman", nameGuj: "વાયરમેન", batch: "84", approvedSeats: 20 },
    { srNo: 2, code: "WD", nameEng: "Welder", nameGuj: "વેલ્ડર", batch: "84", approvedSeats: 60 },
    { srNo: 3, code: "M.D.", nameEng: "Mechanic Diesel", nameGuj: "મિકેનિક ડીઝલ", batch: "84", approvedSeats: 72 },
    { srNo: 4, code: "FT", nameEng: "Fitter", nameGuj: "ફિટર", batch: "84", approvedSeats: 40 },
    { srNo: 5, code: "COPA", nameEng: "COPA", nameGuj: "કોપા", batch: "84", approvedSeats: 72 },
    { srNo: 6, code: "AMR", nameEng: "Architectural Metal Fabricator", nameGuj: "આર્કિટેક્ચરલ મેટલ ફેબ્રિકેટર", batch: "84", approvedSeats: 60 },
    { srNo: 7, code: "H&SI", nameEng: "Health Sanitary Inspector", nameGuj: "હેલ્થ સેનિટરી ઇન્સ્પેક્ટર", batch: "84", approvedSeats: 48 },
    { srNo: 8, code: "S&T", nameEng: "Sewing Technology", nameGuj: "સીવણ ટેકનોલોજી", batch: "84", approvedSeats: 20 },
    { srNo: 9, code: "ET", nameEng: "Electrician", nameGuj: "ઇલેક્ટ્રિશિયન", batch: "84", approvedSeats: 40 },
    { srNo: 10, code: "ETM", nameEng: "Electronics Mechanic", nameGuj: "ઇલેક્ટ્રોનિક્સ મિકેનિક", batch: "84", approvedSeats: 24 }
  ];

  const seniorTradeConfig = [
    { srNo: 1, code: "WM", nameEng: "Wireman", nameGuj: "વાયરમેન", batch: "83", approvedSeats: 40 },
    { srNo: 2, code: "FT", nameEng: "Fitter", nameGuj: "ફિટર", batch: "83", approvedSeats: 20 },
    { srNo: 3, code: "ET", nameEng: "Electrician", nameGuj: "ઇલેક્ટ્રિશિયન", batch: "83", approvedSeats: 20 },
    { srNo: 4, code: "ETM", nameEng: "Electronics Mechanic", nameGuj: "ઇલેક્ટ્રોનિક્સ મિકેનિક", batch: "83", approvedSeats: 48 }
  ];

  const processRow = (item: typeof juniorTradeConfig[0], isSenior: boolean): OnRollReportRow => {
    const rowKey = `${item.code}_${item.batch}`;
    const manualData = savedManualEntries[rowKey];

    const matchingBatches = batches.filter(
      b => b.batchNumber === item.batch &&
           (b.tradeName.toLowerCase().includes(item.nameEng.toLowerCase()) ||
            item.nameEng.toLowerCase().includes(b.tradeName.toLowerCase()) ||
            b.tradeName.toUpperCase().includes(item.code.toUpperCase()) ||
            item.code.toUpperCase().includes(b.tradeName.toUpperCase()))
    );

    const matchingStudents = students.filter(s => {
      const tradeMatch = s.trade.toLowerCase().includes(item.nameEng.toLowerCase()) ||
                         item.nameEng.toLowerCase().includes(s.trade.toLowerCase()) ||
                         s.trade.toUpperCase() === item.code.toUpperCase() ||
                         item.code.toUpperCase() === s.trade.toUpperCase();
      
      const batchMatch = (s.batchName && s.batchName.includes(item.batch)) ||
                         (s.academicSession && s.academicSession.includes(item.batch)) ||
                         matchingBatches.some(b => b.id === s.batchId);

      // Strict separation: Batch 84 vs Batch 83
      if (item.batch === "84") {
        if (s.batchName?.includes("83") || matchingBatches.some(b => b.id === s.batchId && b.batchNumber === "83")) {
          return false;
        }
      } else if (item.batch === "83") {
        if (s.batchName?.includes("84") || matchingBatches.some(b => b.id === s.batchId && b.batchNumber === "84")) {
          return false;
        }
      }

      return tradeMatch && batchMatch;
    });

    // 5. Count ONLY Active students for On-Roll, Batch A/B/C, and Categories
    const onRollStudents = matchingStudents.filter(s => {
      const st = (s.currentStatus || "").toString().trim().toUpperCase();
      return st === StudentStatus.ACTIVE || st === "ACTIVE" || st === "ચાલુ";
    });

    // 2. Calculate Batch A / B / C for active students
    let batchA = 0, batchB = 0, batchC = 0;
    onRollStudents.forEach(s => {
      const section = getStudentBatchSection(s, batches);
      if (section === "B") batchB++;
      else if (section === "C") batchC++;
      else batchA++;
    });

    // Trade Total onRoll MUST equal A + B + C
    const onRollTotal = batchA + batchB + batchC;

    // 7. Category Columns from Active Student Profile
    let gen = 0, sc = 0, st = 0, sebc = 0, ews = 0;
    onRollStudents.forEach(s => {
      const cat = (s.category || "").toUpperCase().trim();
      if (cat.includes("SC")) sc++;
      else if (cat.includes("ST")) st++;
      else if (cat.includes("SEBC") || cat.includes("OBC")) sebc++;
      else if (cat.includes("EWS")) ews++;
      else gen++;
    });

    let female = 0, male = 0;
    onRollStudents.forEach(s => {
      const g = (s.gender || "").toLowerCase().trim();
      if (g === "female" || g === "f" || g === "મહિલા") female++;
      else male++;
    });

    let attLessThan50 = 0;
    let att50To80 = 0;
    let attParentsInformed = 0;

    onRollStudents.forEach(s => {
      const studentAtt = attendanceList.filter(a => a.studentId === s.id);
      if (studentAtt.length > 0) {
        const totalPresent = studentAtt.reduce((acc, curr) => acc + (curr.presentDays || 0), 0);
        const totalWorking = studentAtt.reduce((acc, curr) => acc + (curr.workingDays || 0), 0);
        const pct = totalWorking > 0 ? (totalPresent / totalWorking) * 100 : 100;

        if (pct < 50) {
          attLessThan50++;
          attParentsInformed++;
        } else if (pct < 80) {
          att50To80++;
          if (s.parentMobileNumber) attParentsInformed++;
        }
      }
    });

    // 6. Dropout Column calculated independently
    const dropoutCount = matchingStudents.filter(s => {
      const st = (s.currentStatus || "").toString().trim().toUpperCase();
      return st !== StudentStatus.ACTIVE && st !== "ACTIVE" && st !== "ચાલુ";
    }).length;

    const filledSeats = onRollTotal + dropoutCount;
    const dropoutPctVal = filledSeats > 0 ? ((dropoutCount / filledSeats) * 100).toFixed(1) : "0.0";

    return {
      tradeNameGujarati: item.nameGuj,
      tradeNameEnglish: item.nameEng,
      tradeCode: item.code,
      batchNumber: item.batch,
      batchSection: "A",
      batchDisplay: `${item.code} ${item.batch}`,
      isSenior,
      approvedSeats: item.approvedSeats,
      filledSeats: filledSeats,
      batchA,
      batchB,
      batchC,
      onRoll: onRollTotal,
      gen,
      sc,
      st,
      sebc,
      ews,
      female,
      male,
      attLessThan50,
      att50To80,
      attParentsInformed,
      dropoutCount,
      dropoutPct: `${dropoutPctVal}%`,
      // MANUAL ENTRY SECTION FIELDS (Strictly Admin manual entries, default 0 if unentered)
      brokenMachinesCount: manualData?.brokenMachinesCount ?? 0,
      assessmentCompleted: manualData?.assessmentCompleted ?? 0,
      industrialVisitCount: manualData?.industrialVisitCount ?? 0,
      visitTraineesCount: manualData?.visitTraineesCount ?? 0,
      companiesVisitedCount: manualData?.companiesVisitedCount ?? 0,
      ojtTraineesCount: manualData?.ojtTraineesCount ?? 0,
      mouCompaniesCount: manualData?.mouCompaniesCount ?? 0,
      instStipendCount: manualData?.instStipendCount ?? 0,
      socialWelfareCount: manualData?.socialWelfareCount ?? 0,
      guardianMeetingsCount: manualData?.guardianMeetingsCount ?? 0,
      attendedParentsCount: manualData?.attendedParentsCount ?? 0,
    };
  };

  const reportRows: OnRollReportRow[] = [
    ...juniorTradeConfig.map(cfg => processRow(cfg, false)),
    ...seniorTradeConfig.map(cfg => processRow(cfg, true))
  ];

  const createEmptyTotalRow = (labelGuj: string, labelEng: string): OnRollReportRow => ({
    tradeNameGujarati: labelGuj,
    tradeNameEnglish: labelEng,
    tradeCode: labelEng,
    batchNumber: "",
    batchSection: "",
    batchDisplay: labelEng,
    isSenior: false,
    approvedSeats: 0,
    filledSeats: 0,
    batchA: 0,
    batchB: 0,
    batchC: 0,
    onRoll: 0,
    gen: 0,
    sc: 0,
    st: 0,
    sebc: 0,
    ews: 0,
    female: 0,
    male: 0,
    attLessThan50: 0,
    att50To80: 0,
    attParentsInformed: 0,
    dropoutCount: 0,
    dropoutPct: "0.0%",
    assessmentCompleted: 0,
    industrialVisitCount: 0,
    visitTraineesCount: 0,
    companiesVisitedCount: 0,
    ojtTraineesCount: 0,
    mouCompaniesCount: 0,
    instStipendCount: 0,
    socialWelfareCount: 0,
    guardianMeetingsCount: 0,
    attendedParentsCount: 0,
    brokenMachinesCount: 0
  });

  const juniorTotal = createEmptyTotalRow("જુનીયર બેચ ટોટલ :", "Junior Batch Total :");
  const seniorTotal = createEmptyTotalRow("સીનીયર બેચ ટોટલ :", "Senior Batch Total :");
  const grandTotal = createEmptyTotalRow("કુલ તાલીમાર્થીઓ", "Total Trainees");

  const sumInto = (target: OnRollReportRow, src: OnRollReportRow) => {
    target.approvedSeats += src.approvedSeats;
    target.filledSeats += src.filledSeats;
    target.batchA += src.batchA;
    target.batchB += src.batchB;
    target.batchC += src.batchC;
    target.onRoll += src.onRoll;
    target.gen += src.gen;
    target.sc += src.sc;
    target.st += src.st;
    target.sebc += src.sebc;
    target.ews += src.ews;
    target.female += src.female;
    target.male += src.male;
    target.attLessThan50 += src.attLessThan50;
    target.att50To80 += src.att50To80;
    target.attParentsInformed += src.attParentsInformed;
    target.dropoutCount += src.dropoutCount;
    target.assessmentCompleted += src.assessmentCompleted;
    target.industrialVisitCount += src.industrialVisitCount;
    target.visitTraineesCount += src.visitTraineesCount;
    target.companiesVisitedCount += src.companiesVisitedCount;
    target.ojtTraineesCount += src.ojtTraineesCount;
    target.mouCompaniesCount += src.mouCompaniesCount;
    target.instStipendCount += src.instStipendCount;
    target.socialWelfareCount += src.socialWelfareCount;
    target.guardianMeetingsCount += src.guardianMeetingsCount;
    target.attendedParentsCount += src.attendedParentsCount;
    target.brokenMachinesCount += src.brokenMachinesCount;
  };

  reportRows.forEach(row => {
    if (row.isSenior) {
      sumInto(seniorTotal, row);
    } else {
      sumInto(juniorTotal, row);
    }
    sumInto(grandTotal, row);
  });

  juniorTotal.dropoutPct = juniorTotal.filledSeats > 0 ? `${((juniorTotal.dropoutCount / juniorTotal.filledSeats) * 100).toFixed(1)}%` : "0.0%";
  seniorTotal.dropoutPct = seniorTotal.filledSeats > 0 ? `${((seniorTotal.dropoutCount / seniorTotal.filledSeats) * 100).toFixed(1)}%` : "0.0%";
  grandTotal.dropoutPct = grandTotal.filledSeats > 0 ? `${((grandTotal.dropoutCount / grandTotal.filledSeats) * 100).toFixed(1)}%` : "0.0%";

  // 10. VALIDATION & ASSERTION ENGINE
  reportRows.forEach(row => {
    // Rule: A + B + C = Trade Total
    if (row.onRoll !== row.batchA + row.batchB + row.batchC) {
      row.onRoll = row.batchA + row.batchB + row.batchC;
    }
  });

  // Rule: Sum of all Trade Totals = Section Total
  const jrRows = reportRows.filter(r => !r.isSenior);
  juniorTotal.batchA = jrRows.reduce((sum, r) => sum + r.batchA, 0);
  juniorTotal.batchB = jrRows.reduce((sum, r) => sum + r.batchB, 0);
  juniorTotal.batchC = jrRows.reduce((sum, r) => sum + r.batchC, 0);
  juniorTotal.onRoll = jrRows.reduce((sum, r) => sum + r.onRoll, 0);

  const srRows = reportRows.filter(r => r.isSenior);
  seniorTotal.batchA = srRows.reduce((sum, r) => sum + r.batchA, 0);
  seniorTotal.batchB = srRows.reduce((sum, r) => sum + r.batchB, 0);
  seniorTotal.batchC = srRows.reduce((sum, r) => sum + r.batchC, 0);
  seniorTotal.onRoll = srRows.reduce((sum, r) => sum + r.onRoll, 0);

  // Rule: Batch 84 Section Total + Batch 83 Section Total = Grand Total
  grandTotal.batchA = juniorTotal.batchA + seniorTotal.batchA;
  grandTotal.batchB = juniorTotal.batchB + seniorTotal.batchB;
  grandTotal.batchC = juniorTotal.batchC + seniorTotal.batchC;
  grandTotal.onRoll = juniorTotal.onRoll + seniorTotal.onRoll;

  return {
    rows: reportRows,
    juniorTotal,
    seniorTotal,
    grandTotal,
    generatedDate: getLastDayOfMonthDateStr(selectedYear, selectedMonth),
    academicYear: `${selectedYear}-${selectedYear + 1}`
  };
}

export type OfficialOnRollReportData = ReturnType<typeof calculateOnRollReportData>;

export function createVerticalHeaderImage(text: string, colWidthPx: number = 38, headerHeightPx: number = 130): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = colWidthPx * 2;
  canvas.height = headerHeightPx * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(2, 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, colWidthPx, headerHeightPx);

  ctx.save();
  ctx.translate(colWidthPx / 2, headerHeightPx / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 9px 'Shruti', 'Noto Sans Gujarati', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = text.split("\n");
  const lineHeight = 11;

  lines.forEach((line, idx) => {
    const yOffset = (idx - (lines.length - 1) / 2) * lineHeight;
    ctx.fillText(line.trim(), 0, yOffset);
  });

  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * Renders the entire Excel worksheet directly onto an HTML Canvas element with pixel-perfect precision.
 * Preserves Excel cell grid, rotation (-90 deg bottom-to-top), vertical alignment, merged cells, and Shruti Gujarati typography.
 * Strict column sequence: Sr, Trade, Batch, Approved, Filled, A, B, C, Total, GEN, SC, ST, OBC, EWS, FEMALE, 13 Rotated Headers. (28 Columns Total)
 */
export function renderExcelSheetToCanvas(data: OnRollReportData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = 3; // 3x high-DPI scaling for vector-crisp PDF output

  // Columns widths (Exactly 28 columns matching Government template)
  const colWidths = [
    32, 52, 36, 46, 46,     // 0..4: Sr, Trade, Batch, Approved, Filled
    26, 26, 26, 38,         // 5..8: A, B, C, Total
    32, 30, 30, 32, 32, 36, // 9..14: GEN, SC, ST, OBC, EWS, FEMALE
    46, 46, 46, 36, 36, 46, 40, 40, 36, 54, 42, 42, 48 // 15..27: 13 Rotated Headers
  ];

  const padX = 12;
  const padY = 12;
  const gridWidth = colWidths.reduce((a, b) => a + b, 0);

  const jrRows = data.rows.filter(r => !r.isSenior);
  const srRows = data.rows.filter(r => r.isSenior);

  const row0Height = 28;
  const headerHeight = 132;
  const dataRowHeight = 22;
  const totalRowHeight = 24;

  const totalRowsCount = jrRows.length + srRows.length + 3; // Data rows + JuniorTotal + SeniorTotal + GrandTotal
  const gridHeight = row0Height + headerHeight + totalRowsCount * dataRowHeight;

  const totalWidth = gridWidth + padX * 2;
  const totalHeight = gridHeight + padY * 2;

  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Utility to draw cell box & crisp border
  const drawCell = (
    x: number, y: number, w: number, h: number,
    text: string,
    opts: {
      bold?: boolean;
      fontSize?: number;
      align?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
      rotated?: boolean;
      bgColor?: string;
      paddingLeft?: number;
    } = {}
  ) => {
    const {
      bold = false,
      fontSize = 9.5,
      align = 'center',
      valign = 'middle',
      rotated = false,
      bgColor = '#ffffff',
      paddingLeft = 0
    } = opts;

    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h));

    if (!text && text !== "0") return;

    ctx.fillStyle = "#000000";
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px "Shruti", "Noto Sans Gujarati", sans-serif`;

    if (rotated) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = text.split('\n');
      const lineHeight = fontSize * 1.35;
      lines.forEach((line, idx) => {
        const yOffset = (idx - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line.trim(), 0, yOffset);
      });
      ctx.restore();
    } else {
      ctx.textAlign = align;
      ctx.textBaseline = valign;

      let tx = x + w / 2;
      if (align === 'left') tx = x + (paddingLeft || 4);
      if (align === 'right') tx = x + w - 4;

      let ty = y + h / 2;
      if (valign === 'top') ty = y + 4;
      if (valign === 'bottom') ty = y + h - 4;

      ctx.fillText(text, tx, ty);
    }
  };

  const dateTitle = `${data.generatedDate} ENDED ONROLL`;

  let currY = padY;

  // ROW 0: Top Banner
  const topMerged0To4Width = colWidths.slice(0, 5).reduce((a, b) => a + b, 0);
  const topMerged5To27Width = colWidths.slice(5).reduce((a, b) => a + b, 0);

  drawCell(padX, currY, topMerged0To4Width, row0Height, "ITI PORBANDAR", { bold: true, fontSize: 11.5 });
  drawCell(padX + topMerged0To4Width, currY, topMerged5To27Width, row0Height, dateTitle, { bold: true, fontSize: 11.5 });

  currY += row0Height;

  // HEADER ROWS 1 & 2
  let currX = padX;

  // Static Column headers (0..4)
  const col0Names = ["ક્રમ", "ટ્રેડ", "બેચ", "મંજૂર બેઠકો", "ભરાયેલ બેઠકો"];
  col0Names.forEach((name, i) => {
    drawCell(currX, currY, colWidths[i], headerHeight, name, { bold: true, fontSize: 8.5, rotated: true });
    currX += colWidths[i];
  });

  // Date Header (Cols 5..8: A, B, C, Total)
  const cols5To8Width = colWidths.slice(5, 9).reduce((a, b) => a + b, 0);
  const subHeaderHeight = 24;
  const subContentHeight = headerHeight - subHeaderHeight;

  drawCell(currX, currY, cols5To8Width, subHeaderHeight, dateTitle, { bold: true, fontSize: 9 });

  // Sub headers A, B, C, Total
  const subNames = ["A", "B", "C", "Total"];
  let subX = currX;
  subNames.forEach((sName, i) => {
    drawCell(subX, currY + subHeaderHeight, colWidths[5 + i], subContentHeight, sName, { bold: true, fontSize: 9 });
    subX += colWidths[5 + i];
  });

  currX += cols5To8Width;

  // Category headers (Cols 9..14: GEN, SC, ST, OBC, EWS, FEMALE)
  const catNames = ["GEN", "SC", "ST", "OBC", "EWS", "FEMALE"];
  catNames.forEach((cat, i) => {
    drawCell(currX, currY, colWidths[9 + i], headerHeight, cat, { bold: true, fontSize: 8.5, rotated: true });
    currX += colWidths[9 + i];
  });

  // 13 Rotated Headers (Cols 15..27)
  const rotatedHeaders = [
    "50% થી ઓછી હાજરી વાળા\nતાલીમાર્થીઓની સંખ્યા",
    "50% થી 80% હાજરી વાળા\nતાલીમાર્થીઓની સંખ્યા",
    "ઓછા હાજર બાબતે વાલીને\nજાણ કરેલ તાલીમાર્થીઓની સંખ્યા",
    "ડ્રોપ આઉટ %",
    "બંધ મશીનની સંખ્યા",
    "ફોર્મેટિવ એસેસમેન્ટ કેટલા\nતાલીમાર્થીઓનું કરેલ છે",
    "ઇન્ડસ્ટ્રીયલ વિઝિટની સંખ્યા",
    "તાલીમાર્થીઓની સંખ્યા",
    "કંપનીની સંખ્યા",
    "OJTમાં જોડાયેલ તાલીમાર્થીઓની\nસંખ્યા / MoUની (કંપની ની સંખ્યા)",
    "સંસ્થાકીય સ્ટાઇપેન્ડ મેળવતા\nતાલીમાર્થી ની સંખ્યા",
    "સમાજ-કલ્યાણ શિષ્યવૃત્તિ\nમેળવતા તાલીમાર્થી ની સંખ્યા",
    "વાલી મીટીંગની સંખ્યા /\nહાજર વાલીની સંખ્યા"
  ];

  rotatedHeaders.forEach((text, i) => {
    drawCell(currX, currY, colWidths[15 + i], headerHeight, text, { bold: true, fontSize: 8.5, rotated: true });
    currX += colWidths[15 + i];
  });

  currY += headerHeight;

  // Render Data Rows
  const renderRow = (vals: string[], isBold = false, isTotal = false) => {
    let rX = padX;
    const h = isTotal ? totalRowHeight : dataRowHeight;

    if (isTotal) {
      // Merge cols 0..2 for Total Label
      const mergedLabelWidth = colWidths[0] + colWidths[1] + colWidths[2];
      drawCell(rX, currY, mergedLabelWidth, h, vals[0], { bold: true, fontSize: 10, align: 'left', paddingLeft: 6 });
      rX += mergedLabelWidth;

      for (let i = 3; i < vals.length; i++) {
        drawCell(rX, currY, colWidths[i], h, vals[i], { bold: true, fontSize: 9.5 });
        rX += colWidths[i];
      }
    } else {
      vals.forEach((val, i) => {
        drawCell(rX, currY, colWidths[i], h, val, { bold: isBold || i === 1, fontSize: 9.5 });
        rX += colWidths[i];
      });
    }

    currY += h;
  };

  let jrIdx = 1;
  jrRows.forEach(r => {
    renderRow([
      (jrIdx++).toString(),                      // 0: Sr
      r.tradeCode,                               // 1: Trade
      r.batchNumber,                             // 2: Batch
      formatReportCellVal(r.approvedSeats),      // 3: Approved
      formatReportCellVal(r.filledSeats),        // 4: Filled
      formatReportCellVal(r.batchA),             // 5: A
      formatReportCellVal(r.batchB),             // 6: B
      formatReportCellVal(r.batchC),             // 7: C
      formatReportCellVal(r.onRoll),             // 8: Total
      formatReportCellVal(r.gen),                // 9: GEN
      formatReportCellVal(r.sc),                 // 10: SC
      formatReportCellVal(r.st),                 // 11: ST
      formatReportCellVal(r.sebc),               // 12: OBC
      formatReportCellVal(r.ews),                // 13: EWS
      formatReportCellVal(r.female),             // 14: FEMALE
      formatReportCellVal(r.attLessThan50),      // 15: <50%
      formatReportCellVal(r.att50To80),          // 16: 50-80%
      formatReportCellVal(r.attParentsInformed), // 17: Parents Informed
      r.dropoutCount ? r.dropoutPct : "-",       // 18: Dropout %
      formatReportCellVal(r.brokenMachinesCount),// 19: Broken Machines
      formatReportCellVal(r.assessmentCompleted),// 20: Assessment
      formatReportCellVal(r.industrialVisitCount),// 21: Industrial Visit
      formatReportCellVal(r.visitTraineesCount), // 22: Trainees Visit
      formatReportCellVal(r.companiesVisitedCount),// 23: Companies Visited
      r.ojtTraineesCount ? `${r.ojtTraineesCount}/${r.mouCompaniesCount || 0}` : "-", // 24: OJT/MoU
      formatReportCellVal(r.instStipendCount),   // 25: Inst Stipend
      formatReportCellVal(r.socialWelfareCount), // 26: Social Welfare
      r.guardianMeetingsCount ? `${r.guardianMeetingsCount}/${r.attendedParentsCount || 0}` : "-" // 27: Parent Meetings
    ]);
  });

  // Junior Total Row
  const jt = data.juniorTotal;
  renderRow([
    "જુનીયર બેચ ટોટલ :", "", "",
    formatReportCellVal(jt.approvedSeats),
    formatReportCellVal(jt.filledSeats),
    formatReportCellVal(jt.batchA),
    formatReportCellVal(jt.batchB),
    formatReportCellVal(jt.batchC),
    formatReportCellVal(jt.onRoll),
    formatReportCellVal(jt.gen),
    formatReportCellVal(jt.sc),
    formatReportCellVal(jt.st),
    formatReportCellVal(jt.sebc),
    formatReportCellVal(jt.ews),
    formatReportCellVal(jt.female),
    formatReportCellVal(jt.attLessThan50),
    formatReportCellVal(jt.att50To80),
    formatReportCellVal(jt.attParentsInformed),
    formatReportCellVal(jt.dropoutCount),
    formatReportCellVal(jt.brokenMachinesCount),
    formatReportCellVal(jt.assessmentCompleted),
    formatReportCellVal(jt.industrialVisitCount),
    formatReportCellVal(jt.visitTraineesCount),
    formatReportCellVal(jt.companiesVisitedCount),
    `${jt.ojtTraineesCount || 0}/${jt.mouCompaniesCount || 0}`,
    formatReportCellVal(jt.instStipendCount),
    formatReportCellVal(jt.socialWelfareCount),
    `${jt.guardianMeetingsCount || 0}/${jt.attendedParentsCount || 0}`
  ], true, true);

  let srIdx = 1;
  srRows.forEach(r => {
    renderRow([
      (srIdx++).toString(),                      // 0: Sr
      r.tradeCode,                               // 1: Trade
      r.batchNumber,                             // 2: Batch
      formatReportCellVal(r.approvedSeats),      // 3: Approved
      formatReportCellVal(r.filledSeats),        // 4: Filled
      formatReportCellVal(r.batchA),             // 5: A
      formatReportCellVal(r.batchB),             // 6: B
      formatReportCellVal(r.batchC),             // 7: C
      formatReportCellVal(r.onRoll),             // 8: Total
      formatReportCellVal(r.gen),                // 9: GEN
      formatReportCellVal(r.sc),                 // 10: SC
      formatReportCellVal(r.st),                 // 11: ST
      formatReportCellVal(r.sebc),               // 12: OBC
      formatReportCellVal(r.ews),                // 13: EWS
      formatReportCellVal(r.female),             // 14: FEMALE
      formatReportCellVal(r.attLessThan50),      // 15: <50%
      formatReportCellVal(r.att50To80),          // 16: 50-80%
      formatReportCellVal(r.attParentsInformed), // 17: Parents Informed
      r.dropoutCount ? r.dropoutPct : "-",       // 18: Dropout %
      formatReportCellVal(r.brokenMachinesCount),// 19: Broken Machines
      formatReportCellVal(r.assessmentCompleted),// 20: Assessment
      formatReportCellVal(r.industrialVisitCount),// 21: Industrial Visit
      formatReportCellVal(r.visitTraineesCount), // 22: Trainees Visit
      formatReportCellVal(r.companiesVisitedCount),// 23: Companies Visited
      r.ojtTraineesCount ? `${r.ojtTraineesCount}/${r.mouCompaniesCount || 0}` : "-", // 24: OJT/MoU
      formatReportCellVal(r.instStipendCount),   // 25: Inst Stipend
      formatReportCellVal(r.socialWelfareCount), // 26: Social Welfare
      r.guardianMeetingsCount ? `${r.guardianMeetingsCount}/${r.attendedParentsCount || 0}` : "-" // 27: Parent Meetings
    ]);
  });

  // Senior Total Row
  const st = data.seniorTotal;
  renderRow([
    "સીનીયર બેચ ટોટલ :", "", "",
    formatReportCellVal(st.approvedSeats),
    formatReportCellVal(st.filledSeats),
    formatReportCellVal(st.batchA),
    formatReportCellVal(st.batchB),
    formatReportCellVal(st.batchC),
    formatReportCellVal(st.onRoll),
    formatReportCellVal(st.gen),
    formatReportCellVal(st.sc),
    formatReportCellVal(st.st),
    formatReportCellVal(st.sebc),
    formatReportCellVal(st.ews),
    formatReportCellVal(st.female),
    formatReportCellVal(st.attLessThan50),
    formatReportCellVal(st.att50To80),
    formatReportCellVal(st.attParentsInformed),
    formatReportCellVal(st.dropoutCount),
    formatReportCellVal(st.brokenMachinesCount),
    formatReportCellVal(st.assessmentCompleted),
    formatReportCellVal(st.industrialVisitCount),
    formatReportCellVal(st.visitTraineesCount),
    formatReportCellVal(st.companiesVisitedCount),
    `${st.ojtTraineesCount || 0}/${st.mouCompaniesCount || 0}`,
    formatReportCellVal(st.instStipendCount),
    formatReportCellVal(st.socialWelfareCount),
    `${st.guardianMeetingsCount || 0}/${st.attendedParentsCount || 0}`
  ], true, true);

  // Grand Total Row
  const gt = data.grandTotal;
  renderRow([
    "કુલ તાલીમાર્થીઓ", "", "",
    formatReportCellVal(gt.approvedSeats),
    formatReportCellVal(gt.filledSeats),
    formatReportCellVal(gt.batchA),
    formatReportCellVal(gt.batchB),
    formatReportCellVal(gt.batchC),
    formatReportCellVal(gt.onRoll),
    formatReportCellVal(gt.gen),
    formatReportCellVal(gt.sc),
    formatReportCellVal(gt.st),
    formatReportCellVal(gt.sebc),
    formatReportCellVal(gt.ews),
    formatReportCellVal(gt.female),
    formatReportCellVal(gt.attLessThan50),
    formatReportCellVal(gt.att50To80),
    formatReportCellVal(gt.attParentsInformed),
    formatReportCellVal(gt.dropoutCount),
    formatReportCellVal(gt.brokenMachinesCount),
    formatReportCellVal(gt.assessmentCompleted),
    formatReportCellVal(gt.industrialVisitCount),
    formatReportCellVal(gt.visitTraineesCount),
    formatReportCellVal(gt.companiesVisitedCount),
    `${gt.ojtTraineesCount || 0}/${gt.mouCompaniesCount || 0}`,
    formatReportCellVal(gt.instStipendCount),
    formatReportCellVal(gt.socialWelfareCount),
    `${gt.guardianMeetingsCount || 0}/${gt.attendedParentsCount || 0}`
  ], true, true);

  return canvas;
}

/**
 * Generates exact HTML string matching official Government Master PDF template layout
 */
export function getOfficialOnRollReportHtml(data: OnRollReportData): string {
  const dateTitle = `${data.generatedDate} ENDED ONROLL`;

  let jrIndex = 1;
  let srIndex = 1;

  const jrRows = data.rows.filter(r => !r.isSenior);
  const srRows = data.rows.filter(r => r.isSenior);

  const renderDataRow = (r: OnRollReportRow, idxStr: string) => `
    <tr>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${idxStr}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; font-weight: bold; padding: 2.5px 1px;">${r.tradeCode}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${r.batchNumber}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.approvedSeats)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.filledSeats)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.batchA)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.batchB)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.batchC)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.onRoll)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.gen)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.sc)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.st)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.sebc)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.ews)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.female)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.attLessThan50)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.att50To80)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.attParentsInformed)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${r.dropoutCount ? r.dropoutPct : "-"}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.brokenMachinesCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.assessmentCompleted)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.industrialVisitCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.visitTraineesCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.companiesVisitedCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${r.ojtTraineesCount ? `${r.ojtTraineesCount}/${r.mouCompaniesCount || 0}` : "-"}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.instStipendCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${formatReportCellVal(r.socialWelfareCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px; padding: 2.5px 1px;">${r.guardianMeetingsCount ? `${r.guardianMeetingsCount}/${r.attendedParentsCount || 0}` : "-"}</td>
    </tr>
  `;

  const renderTotalRow = (t: OnRollReportRow, label: string) => `
    <tr style="font-weight: bold; background-color: #ffffff;">
      <td colspan="3" style="border: 1px solid #000; text-align: left; padding-left: 6px; font-size: 10px; font-weight: bold; padding-top: 3.5px; padding-bottom: 3.5px;">${label}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.approvedSeats)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.filledSeats)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.batchA)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.batchB)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.batchC)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.onRoll)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.gen)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.sc)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.st)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.sebc)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.ews)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.female)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.attLessThan50)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.att50To80)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.attParentsInformed)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.dropoutCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.brokenMachinesCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.assessmentCompleted)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.industrialVisitCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.visitTraineesCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.companiesVisitedCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${t.ojtTraineesCount ? `${t.ojtTraineesCount}/${t.mouCompaniesCount || 0}` : "-"}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.instStipendCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${formatReportCellVal(t.socialWelfareCount)}</td>
      <td style="border: 1px solid #000; text-align: center; font-size: 9.5px;">${t.guardianMeetingsCount ? `${t.guardianMeetingsCount}/${t.attendedParentsCount || 0}` : "-"}</td>
    </tr>
  `;

  // Pre-generate crisp high-resolution vertical text header images
  const v_kram = createVerticalHeaderImage("ક્રમ", 28, 130);
  const v_trade = createVerticalHeaderImage("ટ્રેડ", 44, 130);
  const v_batch = createVerticalHeaderImage("બેચ", 30, 130);
  const v_manjur = createVerticalHeaderImage("મંજૂર બેઠકો", 38, 130);
  const v_bharayel = createVerticalHeaderImage("ભરાયેલ બેઠકો", 38, 130);

  const v_gen = createVerticalHeaderImage("GEN", 28, 130);
  const v_sc = createVerticalHeaderImage("SC", 26, 130);
  const v_st = createVerticalHeaderImage("ST", 26, 130);
  const v_obc = createVerticalHeaderImage("OBC", 28, 130);
  const v_ews = createVerticalHeaderImage("EWS", 28, 130);
  const v_female = createVerticalHeaderImage("FEMALE", 32, 130);

  const v1 = createVerticalHeaderImage("50% થી ઓછી હાજરી વાળા\nતાલીમાર્થીઓની સંખ્યા", 42, 130);
  const v2 = createVerticalHeaderImage("50% થી 80% હાજરી વાળા\nતાલીમાર્થીઓની સંખ્યા", 42, 130);
  const v3 = createVerticalHeaderImage("ઓછા હાજર બાબતે વાલીને\nજાણ કરેલ તાલીમાર્થીઓની સંખ્યા", 42, 130);
  const v4 = createVerticalHeaderImage("ડ્રોપ આઉટ %", 32, 130);
  const v5 = createVerticalHeaderImage("બંધ મશીનની સંખ્યા", 32, 130);
  const v6 = createVerticalHeaderImage("ફોર્મેટિવ એસેસમેન્ટ કેટલા\nતાલીમાર્થીઓનું કરેલ છે", 42, 130);
  const v7 = createVerticalHeaderImage("ઇન્ડસ્ટ્રીયલ વિઝિટની સંખ્યા", 36, 130);
  const v8 = createVerticalHeaderImage("તાલીમાર્થીઓની સંખ્યા", 36, 130);
  const v9 = createVerticalHeaderImage("કંપનીની સંખ્યા", 32, 130);
  const v10 = createVerticalHeaderImage("OJTમાં જોડાયેલ તાલીમાર્થીઓની\nસંખ્યા / MoUની (કંપની ની સંખ્યા)", 48, 130);
  const v11 = createVerticalHeaderImage("સંસ્થાકીય સ્ટાઇપેન્ડ મેળવતા\nતાલીમાર્થી ની સંખ્યા", 38, 130);
  const v12 = createVerticalHeaderImage("સમાજ-કલ્યાણ શિષ્યવૃત્તિ\nમેળવતા તાલીમાર્થી ની સંખ્યા", 38, 130);
  const v13 = createVerticalHeaderImage("વાલી મીટીંગની સંખ્યા /\nહાજર વાલીની સંખ્યા", 42, 130);

  const imgStyle = "width: 100%; height: 125px; object-fit: contain; display: block; margin: auto;";

  return `
    <div class="shruti-report-font" style="width: 1110px; background: #ffffff; color: #000000; padding: 8px; box-sizing: border-box; font-family: 'Shruti', 'Noto Sans Gujarati', sans-serif;">
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; table-layout: fixed;">
        <colgroup>
          <col style="width: 28px;" />
          <col style="width: 44px;" />
          <col style="width: 30px;" />
          <col style="width: 38px;" />
          <col style="width: 38px;" />
          <col style="width: 22px;" />
          <col style="width: 22px;" />
          <col style="width: 22px;" />
          <col style="width: 32px;" />
          <col style="width: 28px;" />
          <col style="width: 26px;" />
          <col style="width: 26px;" />
          <col style="width: 28px;" />
          <col style="width: 28px;" />
          <col style="width: 32px;" />
          <col style="width: 42px;" />
          <col style="width: 42px;" />
          <col style="width: 42px;" />
          <col style="width: 32px;" />
          <col style="width: 32px;" />
          <col style="width: 42px;" />
          <col style="width: 36px;" />
          <col style="width: 36px;" />
          <col style="width: 32px;" />
          <col style="width: 48px;" />
          <col style="width: 38px;" />
          <col style="width: 38px;" />
          <col style="width: 42px;" />
        </colgroup>
        <thead>
          <!-- Top Header Row -->
          <tr>
            <th colspan="5" style="border: 1px solid #000; text-align: center; font-size: 12px; font-weight: bold; padding: 5px; background: #ffffff;">
              ITI PORBANDAR
            </th>
            <th colspan="23" style="border: 1px solid #000; text-align: center; font-size: 12px; font-weight: bold; padding: 5px; background: #ffffff;">
              ${dateTitle}
            </th>
          </tr>

          <!-- Main Column Headers -->
          <tr style="background: #ffffff; font-size: 9px; font-weight: bold;">
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_kram}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_trade}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_batch}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_manjur}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_bharayel}" style="${imgStyle}" /></th>
            <th colspan="4" style="border: 1px solid #000; text-align: center; vertical-align: middle;">${dateTitle}</th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_gen}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_sc}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_st}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_obc}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_ews}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v_female}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v1}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v2}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v3}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v4}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v5}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v6}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v7}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v8}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v9}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v10}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v11}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v12}" style="${imgStyle}" /></th>
            <th rowspan="2" style="border: 1px solid #000; vertical-align: middle; padding: 1px;"><img src="${v13}" style="${imgStyle}" /></th>
          </tr>

          <!-- Sub headers for ENDED ONROLL -->
          <tr style="background: #ffffff; font-size: 8.5px; font-weight: bold;">
            <th style="border: 1px solid #000; text-align: center; vertical-align: middle;">A</th>
            <th style="border: 1px solid #000; text-align: center; vertical-align: middle;">B</th>
            <th style="border: 1px solid #000; text-align: center; vertical-align: middle;">C</th>
            <th style="border: 1px solid #000; text-align: center; vertical-align: middle;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${jrRows.map(r => renderDataRow(r, (jrIndex++).toString())).join("")}
          ${renderTotalRow(data.juniorTotal, "જુનીયર બેચ ટોટલ :")}
          ${srRows.map(r => renderDataRow(r, (srIndex++).toString())).join("")}
          ${renderTotalRow(data.seniorTotal, "સીનીયર બેચ ટોટલ :")}
          ${renderTotalRow(data.grandTotal, "કુલ તાલીમાર્થીઓ")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generates the Official Government Master On-Roll PDF Report matching the exact master PDF
 */
export async function exportOfficialOnRollPDF(filename: string = "Official_ITI_Porbandar_OnRoll_Report", year: number = 2026, month: number = 8, customData?: OfficialOnRollReportData) {
  try {
    await loadShrutiFontForCanvas();

    const data = customData || calculateOnRollReportData(year, month);
    const canvas = renderExcelSheetToCanvas(data);

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm
    const margin = 4; // 4mm margin
    const imgWidth = pdfWidth - margin * 2; // 289mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const yPos = Math.max(margin, (pdfHeight - imgHeight) / 2);

    pdf.addImage(imgData, "PNG", margin, yPos, imgWidth, imgHeight, undefined, "FAST");

    const fullFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(fullFilename);
  } catch (err: any) {
    console.error("Failed to generate Official On-Roll PDF:", err);
    alert("Error generating Official On-Roll Report PDF: " + err.message);
  }
}

/**
 * Generates the Official Government Master On-Roll Excel Report in exact layout with Shruti font
 */
export function exportOfficialOnRollExcel(filename: string = "Official_ITI_Porbandar_OnRoll_Report", year: number = 2026, month: number = 8, customData?: OfficialOnRollReportData) {
  try {
    const data = customData || calculateOnRollReportData(year, month);
    const dateTitle = `${data.generatedDate} ENDED ONROLL`;

    // Construct 2D array matching the exact Government layout
    const aoa: any[][] = [];

    // Row 0: Top title banner
    const row0 = Array(28).fill("");
    row0[0] = "ITI PORBANDAR";
    row0[5] = dateTitle;
    aoa.push(row0);

    // Row 1: Header Level 1
    const row1 = [
      "ક્રમ", "ટ્રેડ", "બેચ", "મંજુર બેઠકો", "ભરાયેલ બેઠકો",
      dateTitle, "", "", "",
      "GEN", "SC", "ST", "OBC", "EWS", "FEMALE",
      "50% થી ઓછી હાજરી વાળા તાલીમાર્થીઓની સંખ્યા",
      "50% થી 80% હાજરી વાળા તાલીમાર્થીઓની સંખ્યા",
      "ઓછા હાજર બાબતે વાલીને જાણ કરેલ તાલીમાર્થીઓની સંખ્યા",
      "ડ્રોપ આઉટ %",
      "બંધ મશીનની સંખ્યા",
      "ફોર્મેટિવ એસેસમેન્ટ કેટલા તાલીમાર્થીઓનું કરેલ છે",
      "ઇન્ડસ્ટ્રીયલ વિઝિટની સંખ્યા",
      "તાલીમાર્થીઓની સંખ્યા",
      "કંપનીની સંખ્યા",
      "OJTમાં જોડાયેલ તાલીમાર્થીઓની સંખ્યા / MoUની (કંપની ની સંખ્યા)",
      "સંસ્થાકીય સ્ટાઇપેન્ડ મેળવતા તાલીમાર્થી ની સંખ્યા",
      "સમાજ-કલ્યાણ શિષ્યવૃત્તિ મેળવતા તાલીમાર્થી ની સંખ્યા",
      "વાલી મીટીંગની સંખ્યા / હાજર વાલીની સંખ્યા"
    ];
    aoa.push(row1);

    // Row 2: Sub-headers
    const row2 = Array(28).fill("");
    row2[5] = "A"; row2[6] = "B"; row2[7] = "C"; row2[8] = "Total";
    aoa.push(row2);

    // Data rows
    let jrIndex = 1;
    let srIndex = 1;

    const jrRows = data.rows.filter(r => !r.isSenior);
    jrRows.forEach(r => {
      aoa.push([
        (jrIndex++).toString(), r.tradeCode, r.batchNumber,
        formatReportCellVal(r.approvedSeats),
        formatReportCellVal(r.filledSeats),
        formatReportCellVal(r.batchA),
        formatReportCellVal(r.batchB),
        formatReportCellVal(r.batchC),
        formatReportCellVal(r.onRoll),
        formatReportCellVal(r.gen), formatReportCellVal(r.sc), formatReportCellVal(r.st), formatReportCellVal(r.sebc), formatReportCellVal(r.ews), formatReportCellVal(r.female),
        formatReportCellVal(r.attLessThan50), formatReportCellVal(r.att50To80), formatReportCellVal(r.attParentsInformed),
        r.dropoutCount ? r.dropoutPct : "-",
        formatReportCellVal(r.brokenMachinesCount),
        formatReportCellVal(r.assessmentCompleted), formatReportCellVal(r.industrialVisitCount), formatReportCellVal(r.visitTraineesCount),
        formatReportCellVal(r.companiesVisitedCount), `${r.ojtTraineesCount || 0}/${r.mouCompaniesCount || 0}`, formatReportCellVal(r.instStipendCount),
        formatReportCellVal(r.socialWelfareCount), `${r.guardianMeetingsCount || 0}/${r.attendedParentsCount || 0}`
      ]);
    });

    // Junior Total Row
    const jt = data.juniorTotal;
    aoa.push([
      "જુનીયર બેચ ટોટલ :", "", "",
      formatReportCellVal(jt.approvedSeats),
      formatReportCellVal(jt.filledSeats),
      formatReportCellVal(jt.batchA),
      formatReportCellVal(jt.batchB),
      formatReportCellVal(jt.batchC),
      formatReportCellVal(jt.onRoll),
      formatReportCellVal(jt.gen), formatReportCellVal(jt.sc), formatReportCellVal(jt.st), formatReportCellVal(jt.sebc), formatReportCellVal(jt.ews), formatReportCellVal(jt.female),
      formatReportCellVal(jt.attLessThan50), formatReportCellVal(jt.att50To80), formatReportCellVal(jt.attParentsInformed),
      formatReportCellVal(jt.dropoutCount),
      formatReportCellVal(jt.brokenMachinesCount), formatReportCellVal(jt.assessmentCompleted),
      formatReportCellVal(jt.industrialVisitCount), formatReportCellVal(jt.visitTraineesCount), formatReportCellVal(jt.companiesVisitedCount),
      `${jt.ojtTraineesCount || 0}/${jt.mouCompaniesCount || 0}`, formatReportCellVal(jt.instStipendCount), formatReportCellVal(jt.socialWelfareCount), `${jt.guardianMeetingsCount || 0}/${jt.attendedParentsCount || 0}`
    ]);

    const srRows = data.rows.filter(r => r.isSenior);
    srRows.forEach(r => {
      aoa.push([
        (srIndex++).toString(), r.tradeCode, r.batchNumber,
        formatReportCellVal(r.approvedSeats),
        formatReportCellVal(r.filledSeats),
        formatReportCellVal(r.batchA),
        formatReportCellVal(r.batchB),
        formatReportCellVal(r.batchC),
        formatReportCellVal(r.onRoll),
        formatReportCellVal(r.gen), formatReportCellVal(r.sc), formatReportCellVal(r.st), formatReportCellVal(r.sebc), formatReportCellVal(r.ews), formatReportCellVal(r.female),
        formatReportCellVal(r.attLessThan50), formatReportCellVal(r.att50To80), formatReportCellVal(r.attParentsInformed),
        r.dropoutCount ? r.dropoutPct : "-",
        formatReportCellVal(r.brokenMachinesCount),
        formatReportCellVal(r.assessmentCompleted), formatReportCellVal(r.industrialVisitCount), formatReportCellVal(r.visitTraineesCount),
        formatReportCellVal(r.companiesVisitedCount), `${r.ojtTraineesCount || 0}/${r.mouCompaniesCount || 0}`, formatReportCellVal(r.instStipendCount),
        formatReportCellVal(r.socialWelfareCount), `${r.guardianMeetingsCount || 0}/${r.attendedParentsCount || 0}`
      ]);
    });

    // Senior Total Row
    const st = data.seniorTotal;
    aoa.push([
      "સીનીયર બેચ ટોટલ :", "", "",
      formatReportCellVal(st.approvedSeats),
      formatReportCellVal(st.filledSeats),
      formatReportCellVal(st.batchA),
      formatReportCellVal(st.batchB),
      formatReportCellVal(st.batchC),
      formatReportCellVal(st.onRoll),
      formatReportCellVal(st.gen), formatReportCellVal(st.sc), formatReportCellVal(st.st), formatReportCellVal(st.sebc), formatReportCellVal(st.ews), formatReportCellVal(st.female),
      formatReportCellVal(st.attLessThan50), formatReportCellVal(st.att50To80), formatReportCellVal(st.attParentsInformed),
      formatReportCellVal(st.dropoutCount),
      formatReportCellVal(st.brokenMachinesCount), formatReportCellVal(st.assessmentCompleted),
      formatReportCellVal(st.industrialVisitCount), formatReportCellVal(st.visitTraineesCount), formatReportCellVal(st.companiesVisitedCount),
      `${st.ojtTraineesCount || 0}/${st.mouCompaniesCount || 0}`, formatReportCellVal(st.instStipendCount), formatReportCellVal(st.socialWelfareCount), `${st.guardianMeetingsCount || 0}/${st.attendedParentsCount || 0}`
    ]);

    // Grand Total Row
    const gt = data.grandTotal;
    aoa.push([
      "કુલ તાલીમાર્થીઓ", "", "",
      formatReportCellVal(gt.approvedSeats),
      formatReportCellVal(gt.filledSeats),
      formatReportCellVal(gt.batchA),
      formatReportCellVal(gt.batchB),
      formatReportCellVal(gt.batchC),
      formatReportCellVal(gt.onRoll),
      formatReportCellVal(gt.gen), formatReportCellVal(gt.sc), formatReportCellVal(gt.st), formatReportCellVal(gt.sebc), formatReportCellVal(gt.ews), formatReportCellVal(gt.female),
      formatReportCellVal(gt.attLessThan50), formatReportCellVal(gt.att50To80), formatReportCellVal(gt.attParentsInformed),
      formatReportCellVal(gt.dropoutCount),
      formatReportCellVal(gt.brokenMachinesCount), formatReportCellVal(gt.assessmentCompleted),
      formatReportCellVal(gt.industrialVisitCount), formatReportCellVal(gt.visitTraineesCount), formatReportCellVal(gt.companiesVisitedCount),
      `${gt.ojtTraineesCount || 0}/${gt.mouCompaniesCount || 0}`, formatReportCellVal(gt.instStipendCount), formatReportCellVal(gt.socialWelfareCount), `${gt.guardianMeetingsCount || 0}/${gt.attendedParentsCount || 0}`
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths matching Excel sheet proportions
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 8 },
      { wch: 7 }, { wch: 6 }, { wch: 6 }, { wch: 7 }, { wch: 7 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 14 }, { wch: 11 }, { wch: 11 }, { wch: 12 }
    ];

    // Set merged cells matching Government PDF
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // ITI PORBANDAR
      { s: { r: 0, c: 5 }, e: { r: 0, c: 27 } },  // 31/08/2026 ENDED ONROLL
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },   // Sr No
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },   // Trade
      { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },   // Batch
      { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },   // Approved
      { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },   // Filled
      { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } },   // ENDED ONROLL (A, B, C, Total)
    ];

    // Merge category headers across row 1 and row 2 for cols 9..14
    for (let c = 9; c <= 14; c++) {
      merges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }

    // Merge rotated headers across row 1 and row 2 for cols 15..27
    for (let c = 15; c <= 27; c++) {
      merges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }

    // Merge totals labels across columns 0..2
    const jrTotalRowIdx = 3 + jrRows.length;
    const srTotalRowIdx = jrTotalRowIdx + 1 + srRows.length;
    const grandTotalRowIdx = srTotalRowIdx + 1;

    merges.push({ s: { r: jrTotalRowIdx, c: 0 }, e: { r: jrTotalRowIdx, c: 2 } });
    merges.push({ s: { r: srTotalRowIdx, c: 0 }, e: { r: srTotalRowIdx, c: 2 } });
    merges.push({ s: { r: grandTotalRowIdx, c: 0 }, e: { r: grandTotalRowIdx, c: 2 } });

    worksheet["!merges"] = merges;

    // Apply Shruti font property & cell alignment on cells
    Object.keys(worksheet).forEach(cellKey => {
      if (cellKey.startsWith("!")) return;
      const cell = worksheet[cellKey];
      if (cell && typeof cell === "object") {
        cell.s = cell.s || {};
        cell.s.font = { name: "Shruti", sz: 10 };
        cell.s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "OnRoll_Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);

    alert(`Official On-Roll Excel Report downloaded: ${filename}.xlsx`);
  } catch (err: any) {
    console.error("Failed to generate Official On-Roll Excel:", err);
    alert("Error generating Excel report: " + err.message);
  }
}
