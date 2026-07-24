import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } from "docx";
import { Student, Batch, Trade, StudentStatus, PromotionRecord } from "../types";
import { NOTO_SANS_GUJARATI_BASE64 } from "./notoSansGujaratiBase64";
import { getStudents, getBatches, getTrades, getUsers, getAttendance } from "./storage";

// 1. BASE EXPORT HELPERS

/**
 * Exports JSON data to Excel (.xlsx)
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
}

/**
 * Exports HTML content to Microsoft Word document (.doc / .docx compatible)
 */
export function exportToWord(filename: string, htmlContent: string) {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>Export Document</title>" +
    "<style>" +
    "body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #333; }" +
    "table { border-collapse: collapse; width: 100%; margin-top: 20px; }" +
    "th, td { border: 1px solid #aaa; padding: 8px; text-align: left; }" +
    "th { background-color: #f3f4f6; font-weight: bold; color: #111; }" +
    "h2 { color: #1e3a8a; margin-bottom: 5px; font-family: 'Georgia', serif; }" +
    "p { margin: 5px 0; color: #555; }" +
    "</style>" +
    "</head><body>";
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;
  
  const blob = new Blob(['\ufeff' + sourceHTML], {
    type: 'application/vnd.ms-word;charset=utf-8'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : filename + ".doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function getGujaratiFont(): Promise<string | null> {
  return NOTO_SANS_GUJARATI_BASE64;
}

export function hasGujarati(text: string): boolean {
  return /[\u0a80-\u0aff]/.test(text);
}

export function getMixedTextWidth(doc: jsPDF, text: string, fontSize: number = 11): number {
  doc.setFontSize(fontSize);
  const parts = text.split(/([^\u0a80-\u0aff\s]+|\s+)/g);
  let totalWidth = 0;
  for (const part of parts) {
    if (!part) continue;
    const font = hasGujarati(part) ? "NotoSansGujarati" : "helvetica";
    doc.setFont(font, "normal");
    totalWidth += doc.getTextWidth(part);
  }
  return totalWidth;
}

export function drawMixedText(doc: jsPDF, text: string, x: number, y: number, fontSize: number = 11) {
  doc.setFontSize(fontSize);
  const parts = text.split(/([^\u0a80-\u0aff\s]+|\s+)/g);
  let currentX = x;
  for (const part of parts) {
    if (!part) continue;
    const font = hasGujarati(part) ? "NotoSansGujarati" : "helvetica";
    doc.setFont(font, "normal");
    doc.text(part, currentX, y);
    currentX += doc.getTextWidth(part);
  }
}

export function drawMixedTextParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number = 11,
  lineHeight: number = 6
): number {
  doc.setFontSize(fontSize);
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine + word;
    const testLineWidth = getMixedTextWidth(doc, testLine, fontSize);
    if (testLineWidth > maxWidth && currentLine !== "") {
      lines.push(currentLine);
      currentLine = word.trim() === "" ? "" : word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  let currentY = y;
  for (const line of lines) {
    drawMixedText(doc, line, x, currentY, fontSize);
    currentY += lineHeight;
  }
  return currentY;
}

/**
 * Exports data to PDF using jsPDF and jsPDF-autotable
 */
export async function exportToPDF(title: string, headers: string[][], rows: any[][], filename: string) {
  try {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    // Attempt to load the Gujarati font to support Unicode correctly
    const fontBase64 = await getGujaratiFont();
    if (fontBase64) {
      doc.addFileToVFS("NotoSansGujarati.ttf", fontBase64);
      doc.addFont("NotoSansGujarati.ttf", "NotoSansGujarati", "normal");
      doc.setFont("NotoSansGujarati");
    } else {
      console.warn("Could not load Gujarati font. Using standard Helvetica fallback.");
    }
    
    // Draw autoTable with grid theme for borders and selected font
    autoTable(doc, {
      startY: 32,
      head: headers,
      body: rows,
      theme: "grid",
      styles: {
        font: fontBase64 ? "NotoSansGujarati" : "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [30, 58, 138], // Navy blue
        textColor: 255,
        fontSize: 8.5,
        fontStyle: fontBase64 ? "normal" : "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85], // Slate 700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Slate 50
      },
      margin: { top: 32, bottom: 15, left: 14, right: 14 },
      didParseCell: function(data) {
        const text = data.cell.text.join(" ");
        if (hasGujarati(text)) {
          data.cell.styles.font = "NotoSansGujarati";
        } else {
          data.cell.styles.font = "helvetica";
        }
      },
    });
    
    // After the table is drawn, loop through pages and draw beautiful, consistent header, report title, date, borders, and page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Top header line
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.5);
      doc.line(14, 8, doc.internal.pageSize.width - 14, 8);
      
      doc.setFont(fontBase64 ? "NotoSansGujarati" : "helvetica", "normal");
      
      // ITI Porbandar Title
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text("ITI PORBANDAR - TRAINEE MANAGEMENT SYSTEM (ઔદ્યોગિક તાલીમ સંસ્થા પોરબંદર)", 14, 15);
      
      // Report Title
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(title, 14, 21);
      
      // Date and Metadata
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const dateStr = `Report Date: ${new Date().toLocaleDateString('gu-IN')} / ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
      doc.text(dateStr, 14, 26);
      
      // Bottom line above footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, doc.internal.pageSize.height - 12, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 12);
      
      // Footer text and page numbers
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.height - 7);
      doc.text("© 2026 ITI PORBANDAR", doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 7);
    }
    
    // Save the document
    doc.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
    
    // Success callback / alert
    alert(`Successfully generated and downloaded PDF: ${filename}.pdf`);
  } catch (error: any) {
    console.error("PDF generation failed:", error);
    alert("Error creating PDF: " + error.message);
    throw error;
  }
}

/**
 * Maps English trade name to its Gujarati equivalent
 */
export function getGujaratiTradeName(englishName: string): string {
  if (!englishName) return "";
  const normalized = englishName.trim().toLowerCase();
  
  try {
    const registeredTrades = getTrades();
    const matchedTrade = registeredTrades.find(
      t => t.name.toLowerCase() === normalized || (t.tradeNameEnglish && t.tradeNameEnglish.toLowerCase() === normalized)
    );
    if (matchedTrade && matchedTrade.tradeNameGujarati) {
      return matchedTrade.tradeNameGujarati;
    }
  } catch (err) {
    console.error("Failed to load trades from storage inside getGujaratiTradeName:", err);
  }

  if (normalized.includes("welder")) return "વેલ્ડર";
  if (normalized.includes("electrician")) return "ઇલેક્ટ્રિશિયન";
  if (normalized.includes("copa") || normalized.includes("computer operator")) return "કોપા";
  if (normalized.includes("wireman")) return "વાયરમેન";
  if (normalized.includes("fitter")) return "ફિટર";
  if (normalized.includes("mechanic diesel") || normalized.includes("diesel mechanic") || normalized.includes("diesel")) return "મિકેનિક ડીઝલ";
  if (normalized.includes("draughtsman civil") || normalized.includes("draftsman")) return "ડ્રાફ્ટસમેન સિવિલ";
  if (normalized.includes("turner")) return "ટર્નર";
  if (normalized.includes("machinist")) return "મશીનિસ્ટ";
  if (normalized.includes("plumber")) return "પ્લમ્બર";
  if (normalized.includes("carpenter")) return "કાર્પેન્ટર";
  if (normalized.includes("sewing") || normalized.includes("s&t") || normalized.includes("sewing technology")) return "સીવણ ટેકનોલોજી";
  if (normalized.includes("architectural") || normalized.includes("amr") || normalized.includes("metal fabricator")) return "આર્કિટેક્ચરલ મેટલ ફેબ્રિકેટર";
  if (normalized.includes("health") || normalized.includes("h&si") || normalized.includes("sanitary")) return "હેલ્થ સેનિટરી ઇન્સ્પેક્ટર";
  
  return englishName;
}

/**
 * Gets the student's actual remark from the attendance irregularity record.
 * Default Remarks field must always be blank for every student unless manually typed and saved.
 */
export function getStudentIrregularityRemark(cand: any): string {
  if (cand?.remark && typeof cand.remark === "string" && cand.remark.trim() !== "") {
    return cand.remark.trim();
  }
  if (cand?.remarks && typeof cand.remarks === "string" && cand.remarks.trim() !== "") {
    return cand.remarks.trim();
  }
  return "";
}

export interface SharedLetterLayoutOptions {
  resolvedSiName: string;
  designation: string;
  instituteName: string;
  dateFormatted: string;
  recipient: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  tableHtml?: string;
  isForWord?: boolean;
}

/**
 * Renders a standardized government letter layout. Used by both General and Forwarding letters to guarantee identical styling.
 */
export function renderSharedLetterLayout(options: SharedLetterLayoutOptions): string {
  const fontStyle = options.isForWord 
    ? "font-family: 'Arial', sans-serif;" 
    : "font-family: 'Noto Sans Gujarati', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;";

  // Recipient lines with zero left-indentation
  const formattedRecipient = options.recipient
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin: 0 0 6px 0 !important; padding: 0 !important; line-height: 1.6; font-size: 14px; font-weight: bold; color: #000000; text-align: left !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${line}</p>`)
    .join("\n");

  // Subject line with left-margin indent and no dashed border or horizontal line
  let cleanSubject = options.subject.trim();
  let remainingSubject = cleanSubject;
  if (remainingSubject.startsWith("વિષય")) {
    remainingSubject = remainingSubject.substring(4).trim();
    if (remainingSubject.startsWith(":") || remainingSubject.startsWith("-")) {
      remainingSubject = remainingSubject.substring(1).trim();
    }
  }
  const finalSubject = `વિષય :&nbsp;&nbsp;&nbsp;&nbsp;${remainingSubject}`;
  const formattedSubject = `<p style="margin: 20px 0 20px 48px !important; padding: 0 !important; line-height: 1.6; font-size: 14px; font-weight: bold; color: #000000; text-align: left !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${finalSubject}</p>`;

  // Render Body: Replace {STUDENT_TABLE} placeholder and apply first-line indent only to standard body paragraphs
  const rawBodyContent = options.body.replace(/{STUDENT_TABLE}/gi, options.tableHtml || "");
  const formattedBody = rawBodyContent
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<p style="margin: 0 0 10px 0; height: 10px;"></p>';
      }

      // If it's a table/alert container from the forwarding letter, output unchanged
      if (
        trimmed.startsWith("<") || 
        trimmed.endsWith(">") ||
        trimmed.includes("<table") || 
        trimmed.includes("<thead") || 
        trimmed.includes("<tbody") || 
        trimmed.includes("<tr") || 
        trimmed.includes("<td") || 
        trimmed.includes("<th") || 
        trimmed.includes("<div") || 
        trimmed.includes("</table>") || 
        trimmed.includes("</thead>") || 
        trimmed.includes("</tbody>") || 
        trimmed.includes("</tr>") || 
        trimmed.includes("</td>") || 
        trimmed.includes("</th>") || 
        trimmed.includes("</div>") || 
        trimmed.includes("ઔદ્યોગિક તાલીમ સંસ્થા") || 
        trimmed.includes("આ માસમાં કોઈ પણ")
      ) {
        return trimmed;
      }

      const isSalutation = trimmed.startsWith("માનનીય") || trimmed.includes("સાહેબશ્રી");
      if (isSalutation) {
        return `<p style="margin: 0 0 10px 0 !important; padding: 0 !important; line-height: 1.7; font-size: 14px; font-weight: bold; color: #000000; text-align: left !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${trimmed}</p>`;
      }

      // Standard paragraph: indent only the first line (tab), remaining lines left-aligned
      return `<p style="margin: 0 0 12px 0 !important; padding: 0 !important; line-height: 1.7; font-size: 14px; color: #000000; text-indent: 48px !important; text-align: justify !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${trimmed}</p>`;
    })
    .join("\n");

  // Header Block: Top right of page, text LEFT-ALIGNED inside block
  const headerHtml = `
    <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-bottom: 30px; background-color: transparent !important;">
      <tr style="border: 0 !important; border-bottom: none !important; background-color: transparent !important;">
        <td style="width: 55%; border: 0 !important; border-bottom: none !important; padding: 0 !important; background-color: transparent !important;"></td>
        <td style="width: 45%; text-align: left !important; vertical-align: top !important; border: 0 !important; border-bottom: none !important; padding: 0 !important; line-height: 1.5; color: #000000; font-size: 14px; background-color: transparent !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">
          <p style="margin: 0 !important; padding: 0 !important; font-size: 14px; font-weight: bold; text-align: left !important; color: #000000; white-space: nowrap !important;">${options.resolvedSiName}</p>
          <p style="margin: 3px 0 0 0 !important; padding: 0 !important; font-weight: normal; font-size: 14px; text-align: left !important; color: #000000; white-space: nowrap !important;">${options.designation}</p>
          <p style="margin: 3px 0 0 0 !important; padding: 0 !important; font-weight: normal; font-size: 14px; text-align: left !important; color: #000000; white-space: nowrap !important;">${options.instituteName}</p>
          <p style="margin: 3px 0 0 0 !important; padding: 0 !important; font-weight: normal; font-size: 14px; text-align: left !important; color: #000000; white-space: nowrap !important;">તારીખ : ${options.dateFormatted}</p>
        </td>
      </tr>
    </table>
  `;

  // Signature Block: Bottom right of page, text LEFT-ALIGNED inside block
  const signatureHtml = `
    <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-top: 40px; font-family: 'Noto Sans Gujarati', Arial, sans-serif; page-break-inside: avoid; background-color: transparent !important;">
      <tr style="border: 0 !important; border-bottom: none !important; background-color: transparent !important;">
        <td style="width: 55%; border: 0 !important; border-bottom: none !important; padding: 0 !important; background-color: transparent !important;"></td>
        <td style="width: 45%; text-align: center !important; vertical-align: top !important; border: 0 !important; border-bottom: none !important; padding: 0 !important; font-weight: bold; line-height: 1.6; color: #000000; font-size: 14px; background-color: transparent !important;">
          <p style="margin: 0 0 45px 0 !important; font-weight: normal; border: 0 !important; border-bottom: none !important; text-align: center !important;">${options.closing}</p>
          <p style="margin: 0 0 5px 0 !important; font-size: 15px; font-weight: bold; border: 0 !important; border-bottom: none !important; text-align: center !important;">( ${options.signature} )</p>
          <p style="margin: 0 0 5px 0 !important; font-weight: normal; border: 0 !important; border-bottom: none !important; text-align: center !important;">${options.designation}</p>
          <p style="margin: 0 !important; font-weight: normal; font-size: 14px; border: 0 !important; border-bottom: none !important; text-align: center !important;">${options.instituteName}</p>
        </td>
      </tr>
    </table>
  `;

  return `
    <div style="${fontStyle} line-height: 1.8; color: #000000; font-size: 14px; width: 100%; box-sizing: border-box; text-align: left !important;">
      ${headerHtml}
      <div style="text-align: left !important; margin-bottom: 25px;">
        ${formattedRecipient}
      </div>
      ${formattedSubject}
      <div style="text-align: left !important; margin-bottom: 30px;">
        ${formattedBody}
      </div>
      ${signatureHtml}
    </div>
  `;
}

export interface HajarReportLayoutOptions {
  location?: string;
  dateFormatted: string;
  recipient: string;
  subject: string;
  referenceNo?: string;
  siName: string;
  designation: string;
  instituteName: string;
  employeeId?: string;
  mobile?: string;
  leaveType?: string;
  leaveFromDateFormatted?: string;
  leaveToDateFormatted?: string;
  totalLeaveDays?: string | number;
  joiningDateFormatted?: string;
  joiningTime?: string;
  body: string;
  closing?: string;
  signature?: string;
  isForWord?: boolean;
}

/**
 * Renders the official Government Master Template for Hajar Report (હાજર રિપોર્ટ).
 * Preserves exact Gujarat ITI Government format, margins, font styles, alignments, and spacing.
 */
export function renderHajarReportLayout(options: HajarReportLayoutOptions): string {
  const fontStyle = options.isForWord 
    ? "font-family: 'Arial', sans-serif;" 
    : "font-family: 'Noto Sans Gujarati', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;";

  const formattedRecipient = options.recipient
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin: 0 0 3px 0 !important; padding: 0 !important; line-height: 1.5; font-size: 15px; font-weight: normal; color: #000000; text-align: left !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${line}</p>`)
    .join("\n");

  let cleanSubject = (options.subject || "").trim();
  if (cleanSubject.startsWith("વિષય-") || cleanSubject.startsWith("વિષય :") || cleanSubject.startsWith("વિષય:")) {
    cleanSubject = cleanSubject.replace(/^વિષય[\s\:\-]+/, "").trim();
  }
  const displaySubject = `વિષય- ${cleanSubject}`;

  const formattedBody = options.body
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<p style="margin: 0 0 10px 0; height: 10px;"></p>';
      }
      return `<p style="margin: 0 0 12px 0 !important; padding: 0 !important; line-height: 1.85; font-size: 15px; color: #000000; text-indent: 60px !important; text-align: justify !important; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${trimmed}</p>`;
    })
    .join("\n");

  const formattedDate = options.dateFormatted.startsWith("તા.") 
    ? options.dateFormatted 
    : `તા. ${options.dateFormatted}`;

  const sigName = options.signature || options.siName;
  const formattedSigName = sigName.startsWith("(") && sigName.endsWith(")") ? sigName : `(${sigName})`;

  return `
    <div style="${fontStyle} color: #000000; font-size: 15px; width: 100%; box-sizing: border-box; text-align: left !important; background-color: #ffffff; padding: 10px 5px;">
      
      <!-- Top Right Header Block: Sender Details & Date -->
      <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-bottom: 30px; background-color: transparent !important;">
        <tr style="border: 0 !important; background-color: transparent !important;">
          <td style="width: 45%; border: 0 !important; padding: 0 !important;"></td>
          <td style="width: 55%; text-align: left !important; vertical-align: top !important; border: 0 !important; padding: 0 !important; line-height: 1.5; color: #000000; font-size: 15px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">
            <p style="margin: 0 0 2px 0 !important; font-weight: normal; font-size: 15.5px;">${options.siName}</p>
            <p style="margin: 0 0 2px 0 !important; font-weight: normal; font-size: 15px;">${options.designation}</p>
            <p style="margin: 0 0 2px 0 !important; font-weight: normal; font-size: 15px;">${options.instituteName}</p>
            <p style="margin: 0 !important; font-weight: normal; font-size: 15px;">${formattedDate}</p>
          </td>
        </tr>
      </table>

      <!-- Recipient Block (Top Left) -->
      <div style="text-align: left !important; margin-bottom: 30px; line-height: 1.5;">
        ${formattedRecipient}
      </div>

      <!-- Subject Line (Centered & Bold) -->
      <div style="text-align: center !important; margin: 25px 0 25px 0 !important; font-weight: bold; font-size: 16px; font-family: 'Noto Sans Gujarati', Arial, sans-serif; letter-spacing: 0.2px;">
        ${displaySubject}
      </div>

      <!-- Salutation -->
      <div style="margin-bottom: 16px; font-weight: normal; font-size: 15px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">
        માનનીય સાહેબશ્રી,
      </div>

      <!-- Body Paragraphs -->
      <div style="text-align: justify !important; margin-bottom: 40px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">
        ${formattedBody}
      </div>

      <!-- Bottom Right Closing & Signature Block -->
      <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-top: 50px; font-family: 'Noto Sans Gujarati', Arial, sans-serif; page-break-inside: avoid; background-color: transparent !important;">
        <tr style="border: 0 !important; background-color: transparent !important;">
          <td style="width: 55%; border: 0 !important; padding: 0 !important;"></td>
          <td style="width: 45%; text-align: center !important; vertical-align: top !important; border: 0 !important; padding: 0 !important; color: #000000; font-size: 15px;">
            <p style="margin: 0 0 50px 0 !important; font-weight: normal; text-align: center !important;">${options.closing || "આપનો વિશ્વાસુ"}</p>
            <p style="margin: 0 !important; font-size: 15.5px; font-weight: normal; text-align: center !important;">${formattedSigName}</p>
          </td>
        </tr>
      </table>

    </div>
  `;
}

/**
 * Resolves letter template content with dynamic replacements and applies a standard signature layout.
 */
export function resolveLetterHtml(templateText: string, options: {
  resolvedSiName: string;
  gujTradeName: string;
  dateFormatted: string;
  batchListString: string;
  irregularCandidatesCount: number;
  irregularCandidates?: any[];
  tableHtml?: string;
  isForWord?: boolean;
}) {
  const localStudents = getStudents();
  const localBatches = getBatches();
  const latestAttendanceList = getAttendance();

  // Generate table HTML if irregularCandidates is provided, otherwise fallback to options.tableHtml
  let tableHtmlToUse = options.tableHtml || "";
  const irregularCandidates = options.irregularCandidates || [];

  if (irregularCandidates.length > 0 || !tableHtmlToUse) {
    if (irregularCandidates.length === 0) {
      tableHtmlToUse = `
        <div style="padding: 16px; border: 1px solid #10b981; background-color: #f0fdf4; color: #15803d; border-radius: 8px; text-align: center; font-weight: bold; margin-top: 15px; margin-bottom: 15px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">
          આ માસમાં કોઈ પણ તાલીમાર્થીની હાજરી ૮૦% થી ઓછી નથી.
        </div>
      `;
    } else {
      const rowsHtml = irregularCandidates.map((cand, idx) => {
        let studentObj = localStudents.find((s: any) => s.id === cand.studentId);
        if (!studentObj && cand.studentName) {
          studentObj = localStudents.find((s: any) => {
            const fullName = `${s.studentName || ''} ${s.fatherName || ''} ${s.surname || ''}`.trim().toLowerCase();
            const candName = cand.studentName.trim().toLowerCase();
            return fullName === candName || (s.studentName && s.studentName.toLowerCase() === candName);
          });
        }

        const studentName = studentObj 
          ? (studentObj.fullNameGujarati || studentObj.fullNameEnglish || `${studentObj.studentName || ''} ${studentObj.fatherName || ''} ${studentObj.surname || ''}`.trim()) 
          : (cand.studentName || "-");

        const address = studentObj 
          ? (studentObj.addressGujarati || studentObj.addressEnglish || studentObj.address || "પોરબંદર")
          : (cand.address || "પોરબંદર");

        let batchObj = localBatches.find((b: any) => b.id === (cand.batchId || studentObj?.batchId));
        const batchCode = batchObj 
          ? `${batchObj.batchNumber}-${batchObj.batchSection}` 
          : (cand.batchCode || cand.batchName || "-");

        const present = Number(cand.presentDays ?? 0);
        const working = Number(cand.workingDays ?? 0);
        const calculatedPct = working > 0 ? parseFloat(((present / working) * 100).toFixed(2)) : 0;
        const pctVal = typeof cand.attendancePercentage === "number" ? cand.attendancePercentage : calculatedPct;
        const attendancePercentage = `${pctVal.toFixed(2)}%`;

        const latestAtt = latestAttendanceList.find(a => 
          (a.id === cand.id) || 
          (a.studentId === cand.studentId && a.month === cand.month)
        ) || cand;
        const remark = latestAtt.remark || getStudentIrregularityRemark(latestAtt);

        return `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 10px; border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000000;">${idx + 1}</td>
            <td style="padding: 10px; border: 1px solid #000000; font-weight: bold; color: #000000; font-size: 13px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${studentName}</td>
            <td style="padding: 10px; border: 1px solid #000000; color: #000000; font-size: 13px; font-family: 'Noto Sans Gujarati', Arial, sans-serif;">${address}</td>
            <td style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 13px;">${attendancePercentage}</td>
            <td style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 13px;">${batchCode}</td>
            <td style="padding: 10px; border: 1px solid #000000; text-align: left; font-weight: bold; color: #000000; font-size: 13px; font-family: 'Noto Sans Gujarati', Arial, sans-serif; white-space: nowrap;">${remark}</td>
          </tr>
        `;
      }).join('');

      tableHtmlToUse = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #000000; font-family: 'Noto Sans Gujarati', Arial, sans-serif; margin-top: 15px; margin-bottom: 15px;">
          <thead>
            <tr style="background-color: #ffffff; border-bottom: 2px solid #000000;">
              <th style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; width: 45px; color: #000000;">ક્રમ</th>
              <th style="padding: 10px; border: 1px solid #000000; font-weight: bold; color: #000000;">તાલીમાર્થીનું નામ</th>
              <th style="padding: 10px; border: 1px solid #000000; font-weight: bold; color: #000000;">સરનામું</th>
              <th style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; width: 110px; color: #000000;">હાજરી ટકાવારી</th>
              <th style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; width: 80px; color: #000000;">બેચ</th>
              <th style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; width: 150px; color: #000000;">રિમાર્ક્સ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    }
  }

  const text = templateText || "";
  let resolvedText = text
    .replace(/ઔદ્યોગિક પ્રશિક્ષણ સંસ્થાન/g, "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર")
    .replace(/औद्योगिक प्रशिक्षण संस्थान/g, "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર")
    .replace(/{TRADE}/g, options.gujTradeName)
    .replace(/{BATCH}/g, options.batchListString)
    .replace(/{STUDENT_COUNT}/g, String(options.irregularCandidatesCount))
    .replace(/{CURRENT_DATE}/g, options.dateFormatted)
    .replace(/{SIGNATURE_NAME}/g, options.resolvedSiName)
    .replace(/{DESIGNATION}/g, `સુ. ઇ. ${options.gujTradeName}`);

  let cleanedText = resolvedText
    .split("\n")
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith("જાવક નંબર") && !trimmed.startsWith("તારીખ");
    })
    .join("\n")
    .trim();

  // Strip signature from template text body to avoid duplicates
  const sigIdx = cleanedText.indexOf("આપનો વિશ્વાસુ");
  if (sigIdx !== -1) {
    cleanedText = cleanedText.substring(0, sigIdx).trim();
  }

  // Parse sections
  const lines = cleanedText.split("\n").map(l => l.trim());
  let recipientLines: string[] = [];
  let subjectLine = "";
  let bodyLines: string[] = [];
  let stage: 'recipient' | 'subject' | 'body' | 'done' = 'recipient';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith("વિષય") || line.includes("વિષય :") || line.includes("વિષય:")) {
      subjectLine = line;
      stage = 'body';
      continue;
    }

    if (line.startsWith("આપનો વિશ્વાસુ") || line.includes("આપનો વિશ્વાસુ")) {
      stage = 'done';
      continue;
    }

    if (stage === 'recipient') {
      recipientLines.push(line);
    } else if (stage === 'body') {
      bodyLines.push(line);
    }
  }

  const recipient = recipientLines.join("\n");
  const subject = subjectLine || "વિષય : તાલીમાર્થીઓની અનિયમિતતા બાબતે.";
  const body = bodyLines.join("\n");

  return renderSharedLetterLayout({
    resolvedSiName: options.resolvedSiName,
    designation: `સુ. ઇ. ${options.gujTradeName}`,
    instituteName: "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર",
    dateFormatted: options.dateFormatted,
    recipient,
    subject,
    body,
    closing: "આપનો વિશ્વાસુ,",
    signature: options.resolvedSiName,
    tableHtml: tableHtmlToUse,
    isForWord: !!options.isForWord
  });
}

/**
 * Exports the Gujarati Forwarding Letter to a clean A4 PDF
 */
export async function exportForwardingLetterPDF(
  tradeName: string,
  batchListString: string,
  date: string,
  siName: string,
  irregularCandidates: any[],
  filename: string = "Forwarding_Letter",
  letterTemplate?: string
) {
  try {
    const gujTradeName = getGujaratiTradeName(tradeName);
    const dateFormatted = new Date(date).toLocaleDateString('gu-IN');

    // Resolve Gujarati Supervisor Name
    const localUsers = getUsers();
    const matchedUser = localUsers.find(
      u => u.name.trim().toLowerCase() === siName.trim().toLowerCase() ||
           (u.supervisorNameEnglish && u.supervisorNameEnglish.trim().toLowerCase() === siName.trim().toLowerCase()) ||
           (u.supervisorNameGujarati && u.supervisorNameGujarati.trim().toLowerCase() === siName.trim().toLowerCase())
    );
    const resolvedSiName = matchedUser?.supervisorNameGujarati || matchedUser?.supervisorNameEnglish || matchedUser?.name || siName;

    // Ensure Noto Sans Gujarati is registered in the browser for off-screen canvas rendering
    if (typeof document !== "undefined") {
      const styleId = "noto-sans-gujarati-style-head";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          @font-face {
            font-family: 'Noto Sans Gujarati';
            src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
        `;
        document.head.appendChild(style);
      }
    }

    const defaultTemplate = `તારીખ: {CURRENT_DATE}

પ્રતિ,
આચાર્યશ્રી,
ઔદ્યોગિક તાલીમ સંस्था, પોરબંદર.

વિષય : તાલીમાર્થીઓની અનિયમિતતા બાબતે.

માનનીય સાહેબશ્રી,

ઉપરોક્ત વિષય અન્વયે સવિનય સાથ જણાવવાનું કે ટ્રેડ {TRADE} ના બેચ નં. {BATCH} ના નીચે જણાવેલ {STUDENT_COUNT} તાલીમાર્થીઓ અનિયમિત છે, તો આ અંગે યોગ્ય કાર્યવાહી કરવા વિનંતી.

{STUDENT_TABLE}

આપનો વિશ્વાસુ,

{SIGNATURE_NAME}
{DESIGNATION}
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર`;

    const templateToUse = letterTemplate || defaultTemplate;

    const resolvedLetterHtml = resolveLetterHtml(templateToUse, {
      resolvedSiName,
      gujTradeName,
      dateFormatted,
      batchListString,
      irregularCandidatesCount: irregularCandidates.length,
      irregularCandidates
    });

    // Create a temporary container styled as a beautiful crisp letter
    const tempContainer = document.createElement("div");
    tempContainer.id = "temp-forwarding-letter-container";
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "0px";
    tempContainer.style.top = "0px";
    tempContainer.style.zIndex = "-9999";
    tempContainer.style.opacity = "1";
    tempContainer.style.pointerEvents = "none";
    tempContainer.style.width = "794px"; // Exact A4 width at 96 DPI
    tempContainer.style.backgroundColor = "#ffffff";
    tempContainer.style.color = "#000000";
    tempContainer.style.padding = "60px";
    tempContainer.style.boxSizing = "border-box";

    tempContainer.innerHTML = `
      <style>
        @font-face {
          font-family: 'Noto Sans Gujarati';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .guj-text-letter {
          font-family: 'Noto Sans Gujarati', 'Inter', sans-serif !important;
        }
      </style>
      <div class="guj-text-letter" style="line-height: 1.7; color: #000000; font-size: 14px; width: 100%;">
        ${resolvedLetterHtml}
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
      scale: 3, // High-quality print output
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
      format: "a4"
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    // Remaining pages if letter is tall
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");

    alert(`Successfully generated and downloaded PDF: ${filename}.pdf`);
  } catch (error: any) {
    console.error("Failed to export forwarding letter PDF via html2canvas:", error);
    alert("Error creating forwarding letter PDF: " + error.message);
  }
}

/**
 * Exports the Gujarati Forwarding Letter as a real, uncorrupted .docx file using the shared HTML template
 */
export async function exportForwardingLetterWord(
  tradeName: string,
  batchListString: string,
  date: string,
  siName: string,
  irregularCandidates: any[],
  filename: string = "Forwarding_Letter",
  letterTemplate?: string
) {
  try {
    const gujTradeName = getGujaratiTradeName(tradeName);
    const dateFormatted = new Date(date).toLocaleDateString('gu-IN');

    // Resolve Gujarati Supervisor Name
    const localUsers = getUsers();
    const matchedUser = localUsers.find(
      u => u.name.trim().toLowerCase() === siName.trim().toLowerCase() ||
           (u.supervisorNameEnglish && u.supervisorNameEnglish.trim().toLowerCase() === siName.trim().toLowerCase()) ||
           (u.supervisorNameGujarati && u.supervisorNameGujarati.trim().toLowerCase() === siName.trim().toLowerCase())
    );
    const resolvedSiName = matchedUser?.supervisorNameGujarati || matchedUser?.supervisorNameEnglish || matchedUser?.name || siName;

    const defaultTemplate = `તારીખ: {CURRENT_DATE}

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
ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર`;

    const templateToUse = letterTemplate || defaultTemplate;

    const resolvedLetterHtml = resolveLetterHtml(templateToUse, {
      resolvedSiName,
      gujTradeName,
      dateFormatted,
      batchListString,
      irregularCandidatesCount: irregularCandidates.length,
      irregularCandidates
    });

    const styledHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Forwarding Letter</title>
        <style>
          @page {
            size: A4;
            margin: 1.2in 1in 1in 1in;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            color: #000000;
            line-height: 1.6;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: left;
            font-size: 10pt;
            color: #000000;
          }
          th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #000000;
          }
          p {
            margin: 0 0 8px 0;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%;">
          ${resolvedLetterHtml}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + styledHtml], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".docx") ? filename : filename + ".docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Successfully generated and downloaded Word document: ${filename}.docx`);
  } catch (err: any) {
    console.error("Word export failed:", err);
    alert("Error creating Word document: " + err.message);
  }
}

// 2. DOMAIN-SPECIFIC EXPORTS

// --- STUDENT LISTS ---
export function exportCMDRegisterExcel(students: Student[], filename: string = "CMD_Register_Maintenance") {
  const data = students.map(s => ({
    "CMD Number": s.cmdDepositNumber || "-",
    "Trade": s.trade,
    "Student Full Name": `${s.studentName} ${s.fatherName} ${s.surname}`.trim()
  }));
  exportToExcel(data, filename, "CMD Register");
}

export function exportStudentsExcel(students: Student[], filename: string = "Students_List") {
  const data = students.map(s => ({
    "Enrollment No": s.enrollmentNumber,
    "Full Name": `${s.studentName} ${s.fatherName} ${s.surname}`.trim(),
    "Gender": s.gender,
    "Trade": s.trade,
    "Batch": s.batchName,
    "Admission Date": s.admissionDate || "-",
    "Year": s.year,
    "Shift": s.shift,
    "Status": s.currentStatus,
    "Mobile": s.studentMobileNumber || "-"
  }));
  exportToExcel(data, filename, "Students");
}

export async function exportStudentsPDF(students: Student[], filename: string = "Students_List") {
  const headers = [["Enrollment No", "Student Name", "Gender", "Trade", "Batch", "Admission Date", "Year", "Shift", "Status"]];
  const rows = students.map(s => [
    s.enrollmentNumber,
    `${s.studentName} ${s.surname}`.trim(),
    s.gender,
    s.trade,
    s.batchName,
    s.admissionDate || "-",
    s.year,
    s.shift,
    s.currentStatus
  ]);
  await exportToPDF("STUDENTS REGISTER REPORT", headers, rows, filename);
}

export function exportStudentsWord(students: Student[], filename: string = "Students_List") {
  let tableRowsHtml = "";
  students.forEach(s => {
    tableRowsHtml += `
      <tr>
        <td>${s.enrollmentNumber}</td>
        <td>${s.studentName} ${s.fatherName} ${s.surname}</td>
        <td>${s.gender}</td>
        <td>${s.trade}</td>
        <td>${s.batchName}</td>
        <td>${s.admissionDate || "-"}</td>
        <td>${s.year}</td>
        <td>${s.shift}</td>
        <td><b>${s.currentStatus}</b></td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Students Registry Report</h2>
    <p>Total Records: ${students.length}</p>
    <p>Export Date: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Enrollment No</th>
          <th>Full Name</th>
          <th>Gender</th>
          <th>Trade</th>
          <th>Batch</th>
          <th>Admission Date</th>
          <th>Year</th>
          <th>Shift</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- SCHOLARSHIP REPORTS ---
export function exportScholarshipExcel(students: Student[], filename: string = "Scholarships_Report") {
  const data = students.map(s => ({
    "Enrollment No": s.enrollmentNumber,
    "Student Name": `${s.studentName} ${s.surname}`.trim(),
    "Trade": s.trade,
    "Batch": s.batchName,
    "Scholarship Type": s.scholarshipType || "None",
    "Scholarship ID": s.scholarshipId || "-",
    "Academic Year": s.scholarshipAcademicYear || "-",
    "Status": s.scholarshipStatus || "Pending"
  }));
  exportToExcel(data, filename, "Scholarships");
}

export async function exportScholarshipPDF(students: Student[], filename: string = "Scholarships_Report") {
  const headers = [["Enrollment No", "Student Name", "Trade", "Batch", "Scholarship Type", "Scholarship ID", "Academic Year", "Status"]];
  const rows = students.map(s => [
    s.enrollmentNumber,
    `${s.studentName} ${s.surname}`.trim(),
    s.trade,
    s.batchName,
    s.scholarshipType || "None",
    s.scholarshipId || "-",
    s.scholarshipAcademicYear || "-",
    s.scholarshipStatus || "Pending"
  ]);
  await exportToPDF("STUDENT SCHOLARSHIP ALLOTMENT REPORT", headers, rows, filename);
}

export function exportScholarshipWord(students: Student[], filename: string = "Scholarships_Report") {
  let tableRowsHtml = "";
  students.forEach(s => {
    tableRowsHtml += `
      <tr>
        <td>${s.enrollmentNumber}</td>
        <td>${s.studentName} ${s.surname}</td>
        <td>${s.trade}</td>
        <td>${s.batchName}</td>
        <td>${s.scholarshipType || "None"}</td>
        <td>${s.scholarshipId || "-"}</td>
        <td>${s.scholarshipAcademicYear || "-"}</td>
        <td>${s.scholarshipStatus || "Pending"}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Trainee Scholarship Distribution Report</h2>
    <p>Total Trainees: ${students.length}</p>
    <p>Scholarship Holders: ${students.filter(s => s.scholarshipType && s.scholarshipType !== "None").length}</p>
    <table>
      <thead>
        <tr>
          <th>Enrollment No</th>
          <th>Student Name</th>
          <th>Trade</th>
          <th>Batch</th>
          <th>Scholarship Type</th>
          <th>Scholarship ID</th>
          <th>Academic Year</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- BANK DETAILS ---
export function exportBankExcel(students: Student[], filename: string = "Bank_Details_Report") {
  const data = students.map(s => ({
    "Enrollment No": s.enrollmentNumber,
    "Student Name": `${s.studentName} ${s.surname}`.trim(),
    "Trade": s.trade,
    "Batch": s.batchName,
    "Account Holder Name": s.bankAccountHolderName || "-",
    "Bank Name": s.bankName || "-",
    "Branch Name": s.bankBranchName || "-",
    "Account Number": s.bankAccountNumber || "-",
    "IFSC Code": s.bankIfscCode || "-"
  }));
  exportToExcel(data, filename, "Bank_Details");
}

export async function exportBankPDF(students: Student[], filename: string = "Bank_Details_Report") {
  const headers = [["Enrollment No", "Student Name", "Trade", "Batch", "Account Holder", "Bank Name", "Account Number", "IFSC Code"]];
  const rows = students.map(s => [
    s.enrollmentNumber,
    `${s.studentName} ${s.surname}`.trim(),
    s.trade,
    s.batchName,
    s.bankAccountHolderName || "-",
    s.bankName || "-",
    s.bankAccountNumber ? `•••• •••• ${s.bankAccountNumber.trim().slice(-4)}` : "-",
    s.bankIfscCode || "-"
  ]);
  await exportToPDF("STUDENTS BANK ACCOUNT DETAIL REPORT", headers, rows, filename);
}

export function exportBankWord(students: Student[], filename: string = "Bank_Details_Report") {
  let tableRowsHtml = "";
  students.forEach(s => {
    tableRowsHtml += `
      <tr>
        <td>${s.enrollmentNumber}</td>
        <td>${s.studentName} ${s.surname}</td>
        <td>${s.trade}</td>
        <td>${s.batchName}</td>
        <td>${s.bankAccountHolderName || "-"}</td>
        <td>${s.bankName || "-"} / ${s.bankBranchName || "-"}</td>
        <td>${s.bankAccountNumber || "-"}</td>
        <td>${s.bankIfscCode || "-"}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Students Bank Account Directory</h2>
    <p>Total Count: ${students.length}</p>
    <table>
      <thead>
        <tr>
          <th>Enrollment No</th>
          <th>Student Name</th>
          <th>Trade</th>
          <th>Batch</th>
          <th>Account Holder</th>
          <th>Bank Details</th>
          <th>Account Number</th>
          <th>IFSC Code</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- TRADE WISE DATA ---
export function exportTradeSummaryExcel(trades: Trade[], students: Student[], filename: string = "Trade_Summary") {
  const data = trades.map(t => {
    const tradeStudents = students.filter(s => s.trade.toLowerCase() === t.name.toLowerCase());
    const scholarshipCount = tradeStudents.filter(s => s.scholarshipType && s.scholarshipType !== "None").length;
    const onRollCount = tradeStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    return {
      "Trade Name": t.name,
      "Status": t.isActive ? "Active" : "Inactive",
      "Total Enrolled Trainees": tradeStudents.length,
      "Current On-Roll": onRollCount,
      "Scholarship Recipients": scholarshipCount
    };
  });
  exportToExcel(data, filename, "Trade_Summary");
}

export async function exportTradeSummaryPDF(trades: Trade[], students: Student[], filename: string = "Trade_Summary") {
  const headers = [["Trade Name", "Status", "Total Enrolled Trainees", "Current On-Roll", "Scholarship Recipients"]];
  const rows = trades.map(t => {
    const tradeStudents = students.filter(s => s.trade.toLowerCase() === t.name.toLowerCase());
    const scholarshipCount = tradeStudents.filter(s => s.scholarshipType && s.scholarshipType !== "None").length;
    const onRollCount = tradeStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    return [
      t.name,
      t.isActive ? "Active" : "Inactive",
      tradeStudents.length.toString(),
      onRollCount.toString(),
      scholarshipCount.toString()
    ];
  });
  await exportToPDF("INSTITUTE TRADE SUMMARY REPORT", headers, rows, filename);
}

export function exportTradeSummaryWord(trades: Trade[], students: Student[], filename: string = "Trade_Summary") {
  let tableRowsHtml = "";
  trades.forEach(t => {
    const tradeStudents = students.filter(s => s.trade.toLowerCase() === t.name.toLowerCase());
    const scholarshipCount = tradeStudents.filter(s => s.scholarshipType && s.scholarshipType !== "None").length;
    const onRollCount = tradeStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    tableRowsHtml += `
      <tr>
        <td><b>${t.name}</b></td>
        <td>${t.isActive ? "Active" : "Inactive"}</td>
        <td>${tradeStudents.length}</td>
        <td>${onRollCount}</td>
        <td>${scholarshipCount}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Institute Trade Capacity & Enrolment Report</h2>
    <p>Exported on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Trade Name</th>
          <th>Status</th>
          <th>Total Enrolled Trainees</th>
          <th>Current On-Roll</th>
          <th>Scholarship Recipients</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- BATCH SUMMARY ---
export function exportBatchSummaryExcel(batches: Batch[], students: Student[], filename: string = "Batch_Summary") {
  const data = batches.map(b => {
    const batchStudents = students.filter(s => s.batchId === b.id);
    const onRollCount = batchStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    const exitedCount = batchStudents.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;
    return {
      "Batch Name": `${b.tradeName} - ${b.batchNumber}${b.batchSection}`,
      "Trade": b.tradeName,
      "Session": b.academicSession,
      "Year / Shift": `${b.year} / ${b.shift}`,
      "Total Trainees": batchStudents.length,
      "On-Roll Trainees": onRollCount,
      "Exited Trainees": exitedCount
    };
  });
  exportToExcel(data, filename, "Batch_Summary");
}

export async function exportBatchSummaryPDF(batches: Batch[], students: Student[], filename: string = "Batch_Summary") {
  const headers = [["Batch Name", "Trade", "Session", "Year / Shift", "Total Trainees", "On-Roll Trainees", "Exited Trainees"]];
  const rows = batches.map(b => {
    const batchStudents = students.filter(s => s.batchId === b.id);
    const onRollCount = batchStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    const exitedCount = batchStudents.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;
    return [
      `${b.tradeName} - ${b.batchNumber}${b.batchSection}`,
      b.tradeName,
      b.academicSession,
      `${b.year} / ${b.shift}`,
      batchStudents.length.toString(),
      onRollCount.toString(),
      exitedCount.toString()
    ];
  });
  await exportToPDF("INSTITUTE BATCH ALLOTMENT SUMMARY REPORT", headers, rows, filename);
}

export function exportBatchSummaryWord(batches: Batch[], students: Student[], filename: string = "Batch_Summary") {
  let tableRowsHtml = "";
  batches.forEach(b => {
    const batchStudents = students.filter(s => s.batchId === b.id);
    const onRollCount = batchStudents.filter(s => s.currentStatus === StudentStatus.ACTIVE).length;
    const exitedCount = batchStudents.filter(s => s.currentStatus !== StudentStatus.ACTIVE).length;
    tableRowsHtml += `
      <tr>
        <td><b>${b.tradeName} - ${b.batchNumber}${b.batchSection}</b></td>
        <td>${b.tradeName}</td>
        <td>${b.academicSession}</td>
        <td>${b.year} / ${b.shift}</td>
        <td>${batchStudents.length}</td>
        <td>${onRollCount}</td>
        <td>${exitedCount}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Institute Batch Intake & Distribution Report</h2>
    <table>
      <thead>
        <tr>
          <th>Batch Name</th>
          <th>Trade</th>
          <th>Session</th>
          <th>Year / Shift</th>
          <th>Total Trainees</th>
          <th>On-Roll Trainees</th>
          <th>Exited Trainees</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- ON ROLL SUMMARY (Official Master Report Engine Integration) ---
import { exportOfficialOnRollPDF, exportOfficialOnRollExcel } from "./officialReportEngine";

export { exportOfficialOnRollPDF, exportOfficialOnRollExcel };

export function exportOnRollSummaryExcel(students: Student[], filename: string = "Official_ITI_Porbandar_OnRoll_Report") {
  exportOfficialOnRollExcel(filename);
}

export async function exportOnRollSummaryPDF(students: Student[], filename: string = "Official_ITI_Porbandar_OnRoll_Report") {
  await exportOfficialOnRollPDF(filename);
}

export function exportOnRollSummaryWord(students: Student[], filename: string = "OnRoll_Summary") {
  const onRoll = students.filter(s => s.currentStatus === StudentStatus.ACTIVE);
  let tableRowsHtml = "";
  onRoll.forEach(s => {
    tableRowsHtml += `
      <tr>
        <td>${s.enrollmentNumber}</td>
        <td>${s.studentName} ${s.surname}</td>
        <td>${s.gender}</td>
        <td>${s.trade}</td>
        <td>${s.batchName}</td>
        <td>${s.admissionDate || "-"}</td>
        <td>${s.year}</td>
        <td>${s.shift}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Current On-Roll Student List (સક્રિય ઓન-રોલ તાલીમાર્થીઓ)</h2>
    <p>Total Active Trainees: ${onRoll.length}</p>
    <table>
      <thead>
        <tr>
          <th>Enrollment No</th>
          <th>Trainee Name</th>
          <th>Gender</th>
          <th>Trade</th>
          <th>Batch</th>
          <th>Admission Date</th>
          <th>Year</th>
          <th>Shift</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- PROMOTION HISTORY EXPORT ---
export function exportPromotionHistoryExcel(promotions: PromotionRecord[], filename: string = "Promotion_History") {
  const data = promotions.map(p => ({
    "Trainee Name": p.studentName,
    "Enrollment No": p.enrollmentNumber,
    "Old Trade": p.oldTrade,
    "Old Batch": p.oldBatchName,
    "New Trade": p.newTrade,
    "New Batch": p.newBatchName,
    "Promotion Date": p.promotionDate,
    "Promoted By": p.promotedBy,
    "Status": p.isReversed ? `Reversed by ${p.reversedBy} on ${p.reversedDate}` : "Active"
  }));
  exportToExcel(data, filename, "Promotion History");
}

export async function exportPromotionHistoryPDF(promotions: PromotionRecord[], filename: string = "Promotion_History") {
  const headers = [["Trainee Name", "Enrollment No", "Old Trade/Batch", "New Trade/Batch", "Promotion Date", "Promoted By", "Status"]];
  const rows = promotions.map(p => [
    p.studentName,
    p.enrollmentNumber,
    `${p.oldTrade} (${p.oldBatchName})`,
    `${p.newTrade} (${p.newBatchName})`,
    p.promotionDate,
    p.promotedBy,
    p.isReversed ? `Reversed (Undo)` : "Active"
  ]);
  await exportToPDF("Student Promotion & Batch Forwarding History", headers, rows, filename);
}

export function exportPromotionHistoryWord(promotions: PromotionRecord[], filename: string = "Promotion_History") {
  let tableRowsHtml = "";
  promotions.forEach(p => {
    tableRowsHtml += `
      <tr>
        <td><b>${p.studentName}</b></td>
        <td>${p.enrollmentNumber}</td>
        <td>${p.oldTrade} (${p.oldBatchName})</td>
        <td>${p.newTrade} (${p.newBatchName})</td>
        <td>${p.promotionDate}</td>
        <td>${p.promotedBy}</td>
        <td>${p.isReversed ? `<span style="color:red">Reversed</span>` : `<span style="color:green">Active</span>`}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Student Promotion & Batch Forwarding History (પ્રમોશન હિસ્ટ્રી)</h2>
    <p>Total Promotion Events: ${promotions.length}</p>
    <table>
      <thead>
        <tr>
          <th>Trainee Name</th>
          <th>Enrollment No</th>
          <th>Old Trade & Batch</th>
          <th>New Trade & Batch</th>
          <th>Promotion Date</th>
          <th>Promoted By</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- ANALYTICS EXPORTS ---

export function exportAnalyticsStatsExcel(stats: any, filename: string = "Analytics_Stats_Summary") {
  const data = [
    { "Metric": "Total Trades", "Value": stats.totalTrades, "Description": "Registered academic curricular trades" },
    { "Metric": "Total Batches", "Value": stats.totalBatches, "Description": "Total active and approved batches" },
    { "Metric": "Total S.I. Instructors", "Value": stats.totalSis, "Description": "Active faculty supervisors" },
    { "Metric": "Total Students (All-time)", "Value": stats.totalStudents, "Description": "Cumulative registered students" },
    { "Metric": "Total On-roll Students (Active)", "Value": stats.totalOnRoll, "Description": "Trainees currently attending (ચાલુ)" },
    { "Metric": "Total Name Cut Students (Namkami)", "Value": stats.totalNamkami, "Description": "Trainees exited via name cut (નામકમી)" },
    { "Metric": "Total Resigned Students (Rajinamu)", "Value": stats.totalRajinamu, "Description": "Trainees exited via resignation (રાજીનામું)" },
    { "Metric": "Total Completed Students (Passout)", "Value": stats.totalPassout, "Description": "Trainees graduated successfully (પાસ આઉટ)" }
  ];
  exportToExcel(data, filename, "RealTime_Stats");
}

export async function exportAnalyticsStatsPDF(stats: any, filename: string = "Analytics_Stats_Summary") {
  const headers = [["Metric Name", "Value", "Description"]];
  const rows = [
    ["Total Trades", stats.totalTrades.toString(), "Registered academic curricular trades"],
    ["Total Batches", stats.totalBatches.toString(), "Total active and approved batches"],
    ["Total S.I. Instructors", stats.totalSis.toString(), "Active faculty supervisors"],
    ["Total Students (All-time)", stats.totalStudents.toString(), "Cumulative registered students"],
    ["Total On-roll Students (Active)", stats.totalOnRoll.toString(), "Trainees currently attending (ચાલુ)"],
    ["Total Name Cut Students (Namkami)", stats.totalNamkami.toString(), "Trainees exited via name cut (નામકમી)"],
    ["Total Resigned Students (Rajinamu)", stats.totalRajinamu.toString(), "Trainees exited via resignation (રાજીનામું)"],
    ["Total Completed Students (Passout)", stats.totalPassout.toString(), "Trainees graduated successfully (પાસ આઉટ)"]
  ];
  await exportToPDF("INSTITUTE REAL-TIME OVERVIEW STATISTICS", headers, rows, filename);
}

export function exportAnalyticsStatsWord(stats: any, filename: string = "Analytics_Stats_Summary") {
  const htmlContent = `
    <h2>Institute Real-Time Overview Statistics</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Metric Name</th>
          <th>Value</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><b>Total Trades</b></td><td>${stats.totalTrades}</td><td>Registered academic curricular trades</td></tr>
        <tr><td><b>Total Batches</b></td><td>${stats.totalBatches}</td><td>Total active and approved batches</td></tr>
        <tr><td><b>Total S.I. Instructors</b></td><td>${stats.totalSis}</td><td>Active faculty supervisors</td></tr>
        <tr><td><b>Total Students (All-time)</b></td><td>${stats.totalStudents}</td><td>Cumulative registered students</td></tr>
        <tr><td><b>Total On-roll Students (Active)</b></td><td><span style="color:#16a34a"><b>${stats.totalOnRoll}</b></span></td><td>Trainees currently attending (ચાલુ)</td></tr>
        <tr><td><b>Total Name Cut Students (Namkami)</b></td><td>${stats.totalNamkami}</td><td>Trainees exited via name cut (નામકમી)</td></tr>
        <tr><td><b>Total Resigned Students (Rajinamu)</b></td><td>${stats.totalRajinamu}</td><td>Trainees exited via resignation (રાજીનામું)</td></tr>
        <tr><td><b>Total Completed Students (Passout)</b></td><td>${stats.totalPassout}</td><td>Trainees graduated successfully (પાસ આઉટ)</td></tr>
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// Scholarship Summary Export
export function exportScholarshipSummaryExcel(data: any[], filename: string = "Scholarship_Summary") {
  const formatted = data.map(d => ({
    "Scholarship Type": d.type,
    "Student Count": d.count,
    "Percentage (%)": d.percentage.toFixed(1) + "%",
    "On-Roll Active Count": d.activeCount
  }));
  exportToExcel(formatted, filename, "Scholarship_Summary");
}

export async function exportScholarshipSummaryPDF(data: any[], filename: string = "Scholarship_Summary") {
  const headers = [["Scholarship Type", "Student Count", "Percentage (%)", "On-Roll Active Count"]];
  const rows = data.map(d => [
    d.type,
    d.count.toString(),
    d.percentage.toFixed(1) + "%",
    d.activeCount.toString()
  ]);
  await exportToPDF("INSTITUTE SCHOLARSHIP ALLOTMENT SUMMARY", headers, rows, filename);
}

export function exportScholarshipSummaryWord(data: any[], filename: string = "Scholarship_Summary") {
  let rowsHtml = "";
  data.forEach(d => {
    rowsHtml += `
      <tr>
        <td><b>${d.type}</b></td>
        <td>${d.count}</td>
        <td>${d.percentage.toFixed(1)}%</td>
        <td>${d.activeCount}</td>
      </tr>
    `;
  });
  const htmlContent = `
    <h2>Institute Scholarship Allotment Summary</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Scholarship Type</th>
          <th>Student Count</th>
          <th>Percentage (%)</th>
          <th>On-Roll Active Count</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// Trade-wise Summary Export
export function exportTradeAnalyticsExcel(data: any[], filename: string = "Trade_Analytics_Summary") {
  const formatted = data.map(d => ({
    "Trade Name": d.name,
    "Total Intake Seats": d.totalSeats,
    "Filled Seats": d.filledSeats,
    "Vacant Seats": d.vacantSeats,
    "Current On-Roll Students": d.onRollStudents,
    "Enrolment Rate (%)": d.fillRate.toFixed(1) + "%"
  }));
  exportToExcel(formatted, filename, "Trade_Analytics");
}

export async function exportTradeAnalyticsPDF(data: any[], filename: string = "Trade_Analytics_Summary") {
  const headers = [["Trade Name", "Total Intake Seats", "Filled Seats", "Vacant Seats", "Current On-Roll", "Enrolment Rate"]];
  const rows = data.map(d => [
    d.name,
    d.totalSeats.toString(),
    d.filledSeats.toString(),
    d.vacantSeats.toString(),
    d.onRollStudents.toString(),
    d.fillRate.toFixed(1) + "%"
  ]);
  await exportToPDF("INSTITUTE TRADE ENROLMENT & CAPACITY ANALYSIS", headers, rows, filename);
}

export function exportTradeAnalyticsWord(data: any[], filename: string = "Trade_Analytics_Summary") {
  let rowsHtml = "";
  data.forEach(d => {
    rowsHtml += `
      <tr>
        <td><b>${d.name}</b></td>
        <td>${d.totalSeats}</td>
        <td>${d.filledSeats}</td>
        <td>${d.vacantSeats}</td>
        <td>${d.onRollStudents}</td>
        <td>${d.fillRate.toFixed(1)}%</td>
      </tr>
    `;
  });
  const htmlContent = `
    <h2>Institute Trade Enrolment & Capacity Analysis</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Trade Name</th>
          <th>Total Intake Seats</th>
          <th>Filled Seats</th>
          <th>Vacant Seats</th>
          <th>Current On-Roll</th>
          <th>Enrolment Rate</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// Batch-wise Summary Export
export function exportBatchAnalyticsExcel(data: any[], filename: string = "Batch_Analytics_Summary") {
  const formatted = data.map(d => ({
    "Batch Name": d.name,
    "Assigned S.I. Instructor": d.assignedSI,
    "Total Trainees": d.totalStudents,
    "Current On-Roll Trainees": d.onRollStudents,
    "Academic Session": d.session,
    "Year / Shift": `${d.year} - ${d.shift}`
  }));
  exportToExcel(formatted, filename, "Batch_Analytics");
}

export async function exportBatchAnalyticsPDF(data: any[], filename: string = "Batch_Analytics_Summary") {
  const headers = [["Batch Name", "Assigned S.I.", "Total Trainees", "On-Roll Trainees", "Session", "Year/Shift"]];
  const rows = data.map(d => [
    d.name,
    d.assignedSI,
    d.totalStudents.toString(),
    d.onRollStudents.toString(),
    d.session,
    `${d.year} / ${d.shift}`
  ]);
  await exportToPDF("INSTITUTE BATCH ALLOTMENT & ATTENDANCE RATIO ANALYSIS", headers, rows, filename);
}

export function exportBatchAnalyticsWord(data: any[], filename: string = "Batch_Analytics_Summary") {
  let rowsHtml = "";
  data.forEach(d => {
    rowsHtml += `
      <tr>
        <td><b>${d.name}</b></td>
        <td>${d.assignedSI}</td>
        <td>${d.totalStudents}</td>
        <td>${d.onRollStudents}</td>
        <td>${d.session}</td>
        <td>${d.year} - ${d.shift}</td>
      </tr>
    `;
  });
  const htmlContent = `
    <h2>Institute Batch Allotment & Attendance Ratio Analysis</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Batch Name</th>
          <th>Assigned S.I.</th>
          <th>Total Trainees</th>
          <th>On-Roll Trainees</th>
          <th>Academic Session</th>
          <th>Year / Shift</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// Monthly Statistics Export
export function exportMonthlyAnalyticsExcel(data: any[], filename: string = "Monthly_Admission_Exit_Analysis") {
  const formatted = data.map(d => ({
    "Month-Year": d.month,
    "Admissions": d.admissions,
    "Exits (All Reasons)": d.exits,
    "Current Active On-Roll": d.onRoll
  }));
  exportToExcel(formatted, filename, "Monthly_Analytics");
}

export async function exportMonthlyAnalyticsPDF(data: any[], filename: string = "Monthly_Admission_Exit_Analysis") {
  const headers = [["Month-Year", "Admissions", "Exits (All Reasons)", "Current Active On-Roll"]];
  const rows = data.map(d => [
    d.month,
    d.admissions.toString(),
    d.exits.toString(),
    d.onRoll.toString()
  ]);
  await exportToPDF("MONTHLY STUDENT ADMISSION & EXIT STATISTICS", headers, rows, filename);
}

export function exportMonthlyAnalyticsWord(data: any[], filename: string = "Monthly_Admission_Exit_Analysis") {
  let rowsHtml = "";
  data.forEach(d => {
    rowsHtml += `
      <tr>
        <td><b>${d.month}</b></td>
        <td>${d.admissions}</td>
        <td>${d.exits}</td>
        <td>${d.onRoll}</td>
      </tr>
    `;
  });
  const htmlContent = `
    <h2>Monthly Student Admission & Exit Statistics</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>Month-Year</th>
          <th>Admissions</th>
          <th>Exits (All Reasons)</th>
          <th>Current Active On-Roll</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// Help resolve missing documents list
function getMissingDocsList(student: Student): string[] {
  const required = [
    { key: "aadhaar", label: "Aadhaar Card" },
    { key: "photo", label: "Photo" },
    { key: "bank_passbook", label: "Bank Passbook" },
    { key: "leaving_certificate", label: "Leaving Certificate" },
    { key: "ssc_marksheet", label: "SSC Marksheet" },
    { key: "passport_size_photo", label: "Passport Size Photo" }
  ];
  if (!student.documents) {
    return required.map(r => r.label);
  }
  const missing: string[] = [];
  required.forEach(r => {
    if (!student.documents?.[r.key]) {
      missing.push(r.label);
    }
  });
  return missing;
}

// Missing Documents Report Exports
export function exportMissingDocsExcel(students: Student[], filename: string = "Missing_Documents_Report") {
  const missingStudents = students.filter(student => {
    const requiredKeys = ["aadhaar", "photo", "bank_passbook", "leaving_certificate", "ssc_marksheet", "passport_size_photo"];
    return !student.documents || requiredKeys.some(key => !student.documents?.[key]);
  });

  const formatted = missingStudents.map((s, idx) => {
    const missingList = getMissingDocsList(s);
    return {
      "S.N.": idx + 1,
      "Trainee Name": `${s.studentName} ${s.fatherName} ${s.surname}`,
      "Enrollment Number": s.enrollmentNumber,
      "Trade": s.trade,
      "Batch": s.batchName,
      "Mobile Number": s.studentMobileNumber || "-",
      "Missing Documents": missingList.join(", ")
    };
  });

  exportToExcel(formatted, filename, "Missing_Documents");
}

export async function exportMissingDocsPDF(students: Student[], filename: string = "Missing_Documents_Report") {
  const missingStudents = students.filter(student => {
    const requiredKeys = ["aadhaar", "photo", "bank_passbook", "leaving_certificate", "ssc_marksheet", "passport_size_photo"];
    return !student.documents || requiredKeys.some(key => !student.documents?.[key]);
  });

  const headers = [["S.N.", "Trainee Name", "Enrollment Number", "Trade & Batch", "Mobile Number", "Missing Documents"]];
  const rows = missingStudents.map((s, idx) => {
    const missingList = getMissingDocsList(s);
    return [
      (idx + 1).toString(),
      `${s.studentName} ${s.surname}`,
      s.enrollmentNumber,
      `${s.trade} (${s.batchName})`,
      s.studentMobileNumber || "-",
      missingList.join(", ")
    ];
  });

  await exportToPDF("MISSING REQUIRED DOCUMENTS REPORT", headers, rows, filename);
}

export function exportMissingDocsWord(students: Student[], filename: string = "Missing_Documents_Report") {
  const missingStudents = students.filter(student => {
    const requiredKeys = ["aadhaar", "photo", "bank_passbook", "leaving_certificate", "ssc_marksheet", "passport_size_photo"];
    return !student.documents || requiredKeys.some(key => !student.documents?.[key]);
  });

  let rowsHtml = "";
  missingStudents.forEach((s, idx) => {
    const missingList = getMissingDocsList(s);
    rowsHtml += `
      <tr>
        <td>${idx + 1}</td>
        <td><b>${s.studentName} ${s.fatherName} ${s.surname}</b></td>
        <td><font face="Courier New">${s.enrollmentNumber}</font></td>
        <td>${s.trade} - ${s.batchName}</td>
        <td>${s.studentMobileNumber || "-"}</td>
        <td style="color: #dc2626; font-weight: bold;">${missingList.join(", ")}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <h2>Missing Required Documents Report (અપૂર્ણ દસ્તાવેજોનો અહેવાલ)</h2>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <p>Total Trainees with Missing Documents: <b>${missingStudents.length}</b></p>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Trainee Name</th>
          <th>Enrollment Number</th>
          <th>Trade & Batch</th>
          <th>Mobile Number</th>
          <th>Missing Required Documents</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  exportToWord(filename, htmlContent);
}

// --- SAMPLE STUDENT IMPORT TEMPLATES (EXCEL & CSV) ---
export function downloadSampleStudentExcel() {
  const headers = [
    "Student Name",
    "Father Name",
    "Surname",
    "Enrollment Number",
    "Category",
    "Date of Birth",
    "Gender",
    "Student Mobile",
    "Parent Mobile",
    "Address",
    "Admission Date"
  ];
  const sampleRows = [
    ["Jayesh", "Kantilal", "Rathod", "ENR202684001", "GEN", "2006-04-12", "Male", "9876543210", "9876543211", "Porbandar, Gujarat", "2026-08-01"],
    ["Sonal", "Bharatbhai", "Patel", "ENR202684002", "SEBC", "2005-09-20", "Female", "9876543212", "9876543213", "Veraval, Gujarat", "2026-08-01"],
    ["Ramesh", "Mansukhbhai", "Solanki", "ENR202684003", "SC", "2006-01-15", "Male", "9876543214", "9876543215", "Junagadh, Gujarat", "2026-08-01"]
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sample Students");
  XLSX.writeFile(wb, "Sample_Student_Import_Template.xlsx");
}

export function downloadSampleStudentCsv() {
  const headers = [
    "Student Name",
    "Father Name",
    "Surname",
    "Enrollment Number",
    "Category",
    "Date of Birth",
    "Gender",
    "Student Mobile",
    "Parent Mobile",
    "Address",
    "Admission Date"
  ];
  const sampleRows = [
    ["Jayesh", "Kantilal", "Rathod", "ENR202684001", "GEN", "2006-04-12", "Male", "9876543210", "9876543211", "Porbandar, Gujarat", "2026-08-01"],
    ["Sonal", "Bharatbhai", "Patel", "ENR202684002", "SEBC", "2005-09-20", "Female", "9876543212", "9876543213", "Veraval, Gujarat", "2026-08-01"],
    ["Ramesh", "Mansukhbhai", "Solanki", "ENR202684003", "SC", "2006-01-15", "Male", "9876543214", "9876543215", "Junagadh, Gujarat", "2026-08-01"]
  ];
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...sampleRows].map(e => e.map(x => `"${x}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "Sample_Student_Import_Template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
