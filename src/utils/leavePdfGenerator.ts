import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { SIProfile, LeaveApplication } from "../types";
import { NOTO_SANS_GUJARATI_BASE64 } from "./notoSansGujaratiBase64";

/**
 * Ensures Noto Sans Gujarati / Shruti font family is registered in the DOM head
 */
export function ensureGujaratiFontRegistered() {
  if (typeof document !== "undefined") {
    const styleId = "shruti-noto-sans-gujarati-font-head";
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
          font-family: 'Noto Sans Gujarati';
          src: url('data:font/ttf;base64,${NOTO_SANS_GUJARATI_BASE64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .shruti-font {
          font-family: 'Shruti', 'Noto Sans Gujarati', sans-serif !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * Formats YYYY-MM-DD to Indian Gujarati Date DD/MM/YYYY
 */
export function formatGujaratiDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {
    console.error("Date formatting error:", e);
  }
  return dateStr;
}

export interface LeaveFormPdfData {
  siProfile: SIProfile;
  leaveTypeDisplay: string;
  fromDateDisplay: string;
  toDateDisplay: string;
  totalDays: number;
  leaveReasonDisplay: string;
  addressDuringLeave: string;
  willLeaveHeadquarters: "હા" | "ના";
  prefixHolidays?: string;
  suffixHolidays?: string;
  applicationDateDisplay: string;
  priorLeaveDateDisplay?: string;
  priorLeaveTypeDisplay?: string;
  priorLeaveDaysDisplay?: string | number;
}

/**
 * Generates the Leave Application Form HTML structure (Document 1)
 */
export function getLeaveFormHtml(data: LeaveFormPdfData): string {
  const {
    siProfile,
    leaveTypeDisplay,
    fromDateDisplay,
    toDateDisplay,
    totalDays,
    leaveReasonDisplay,
    addressDuringLeave,
    willLeaveHeadquarters,
    prefixHolidays,
    suffixHolidays,
    applicationDateDisplay,
    priorLeaveDateDisplay,
    priorLeaveTypeDisplay,
    priorLeaveDaysDisplay,
  } = data;

  return `
    <div class="shruti-font" style="width: 794px; background: #ffffff; color: #000000; padding: 40px 45px; box-sizing: border-box; font-size: 13px; line-height: 1.4; border: 1px solid #e2e8f0; margin: 0 auto;">
      <!-- Title Header -->
      <div style="text-align: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #000000; font-family: 'Shruti', 'Noto Sans Gujarati', sans-serif;">
          રજા મેળવવા અથવા લંબાવવા માટેની અરજી
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: normal; color: #000000;">
          (ગુજરાત મુલ્કી સેવા (રજા) નિયમો - ૨૦૦૨નાં નિયમ - ૨૪)
        </p>
      </div>

      <!-- Government Table Form -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-top: 8px;">
        <tbody>
          <!-- Row 1 -->
          <tr>
            <td style="width: 32px; border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૧</td>
            <td style="width: 250px; border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">અરજદારનું નામ</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; color: #000000; vertical-align: top;">
              ${siProfile.nameGujarati || siProfile.nameEnglish || "-"}
            </td>
          </tr>

          <!-- Row 2 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૨</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">ધારણ કરેલ હોદ્દો</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              ${siProfile.designationGujarati || siProfile.designationEnglish || "-"}
            </td>
          </tr>

          <!-- Row 3 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૩</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">ખાતું, કચેરી અને શાખા</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; line-height: 1.5;">
              <div>રોજગાર અને તાલીમ,</div>
              <div>ઔદ્યોગિક તાલીમ સંસ્થા,</div>
              <div>પોરબંદર</div>
              <div>પોરબંદર</div>
            </td>
          </tr>

          <!-- Row 4 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૪</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">પગાર</td>
            <td style="border: 1px solid #000000; padding: 0; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <tr>
                  <td style="padding: 6px; width: 33%; border-right: 1px solid #000000;">${siProfile.salary || "-"}</td>
                  <td style="padding: 6px; font-weight: bold; width: 18%; border-right: 1px solid #000000; background: #fafafa;">બેન્ડ પે</td>
                  <td style="padding: 6px; width: 22%; border-right: 1px solid #000000;">${siProfile.bandPay || "-"}</td>
                  <td style="padding: 6px; font-weight: bold; width: 12%; border-right: 1px solid #000000; background: #fafafa;">ગ્રેડ પે</td>
                  <td style="padding: 6px; width: 15%;">${siProfile.gradePay || "-"}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 5 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૫</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">હાલની જગ્યા પર મળતું ઘરભાડું અને અન્ય વળતર ભથ્થા</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              સરકારીશ્રીના પ્રવર્તમાન નિયમાનુસાર મળવાપાત્ર
            </td>
          </tr>

          <!-- Row 6 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૬</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">રજાનો પ્રકાર અને સમયગાળો</td>
            <td style="border: 1px solid #000000; padding: 0; vertical-align: top;">
              <div style="padding: 6px; font-weight: bold; border-bottom: 1px solid #000000;">${leaveTypeDisplay}</div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px;">
                <span>તા. <strong>${fromDateDisplay}</strong></span>
                <span>થી તા. <strong>${toDateDisplay}</strong></span>
                <span style="font-weight: bold; border: 1px solid #000000; padding: 2px 8px;">${totalDays} દિવસ</span>
              </div>
            </td>
          </tr>

          <!-- Row 7 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૭</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">રવિવાર અને જાહેર રજાઓ, રજાની આગળ / પાછળ જોડાવાનો પ્રસ્તાવ હોય તો તે</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; line-height: 1.6;">
              <div>આગળ તા. ${prefixHolidays || "-"}</div>
              <div>પાછળ તા. ${suffixHolidays || "-"}</div>
            </td>
          </tr>

          <!-- Row 8 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૮</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">રજા માટેની અરજી કરવાનું કારણ</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; font-weight: bold;">
              ${leaveReasonDisplay}
            </td>
          </tr>

          <!-- Row 9 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૯</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">છેલ્લી રજા ઉપરથી હાજર થયા તે તારીખ અને તે રજાનો પ્રકાર અને સમયગાળો</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="display: flex; justify-content: space-between;">
                <span>તા. _________</span>
                <span>સ્પેશિયલ લીવ</span>
                <span>____ દિવસ</span>
              </div>
            </td>
          </tr>

          <!-- Row 10 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૧૦</td>
            <td style="border: 1px solid #000000; padding: 6px; font-weight: bold; vertical-align: top;">રજાના સમયગાળા દરમિયાન સરનામું</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; white-space: pre-line;">
              ${addressDuringLeave || "-"}
            </td>
          </tr>

          <!-- Row 11 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૧૧</td>
            <td colspan="2" style="border: 1px solid #000000; padding: 6px; vertical-align: top; font-size: 12px; line-height: 1.5;">
              <div style="font-weight: bold; margin-bottom: 4px;">નોકરીમાંથી મારું રાજીનામું અથવા મારી મરજિયાત નિવૃત્તિના પ્રસંગે, હું નીચેની રકમ પરત કરવા બંધાઉં છું.</div>
              <div>(૧) જો નિયમ - ૫૭ નાં પેટા નિયમ (૧) લાગુ પડ્યો ન હોત, તો મને રૂપાંતરિત રજા મળવાપાત્ર ન હોત તે અંગે મળેલ રજા પગાર અને મળવાપાત્ર અર્ધપગારી રજા અંગેના રજા-પગાર એ બંને વચ્ચેના તફાવતની રકમ</div>
              <div style="margin-top: 3px;">(૨) જો નિયમ - ૫૯ નાં પેટા નિયમ (૧) લાગુ પડ્યો ન હોત તો જે રકમ મળવાપાત્ર ન હોત તે રજા દરમિયાન મેળવેલ રજા - પગાર .</div>
            </td>
          </tr>

          <!-- Row 12 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૧૨</td>
            <td colspan="2" style="border: 1px solid #000000; padding: 6px; vertical-align: top; font-size: 12px;">
              <div>* હું પ્રમાણિત કરું છું કે આ અરજીની તારીખે મને બે અથવા તેથી વધુ જીવિત બાળકો નથી.</div>
              <div style="font-size: 11px; margin-top: 2px; color: #333333;">( * જે લાગુ ન પડતું હોય તે છેકી નાખવું )</div>
            </td>
          </tr>

          <!-- Row 13 & 14 -->
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; vertical-align: top;">૧૩</td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; height: 110px;">
              <div style="font-weight: bold; margin-bottom: 40px;">નિયામક અધિકારીનું ટિપ્પણ અને અથવા ભલામણ</div>
              <div style="text-align: center; border-top: 1px dashed #666; pt-1; font-size: 11px;">
                સહી (તારીખ સાથે)<br/>હોદ્દો
              </div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top; height: 110px;">
              <div style="font-weight: bold; margin-bottom: 40px;">૧૪. *રજા મંજૂર કરવા સક્ષમ સત્તાધીકારીના હુકમો</div>
              <div style="text-align: center; border-top: 1px dashed #666; pt-1; font-size: 11px;">
                સહી (તારીખ સાથે)<br/>હોદ્દો
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Footnote -->
      <div style="font-size: 11px; margin-top: 8px; line-height: 1.4; border: 1px solid #000000; padding: 6px;">
        * રજા મંજૂર કરવા સક્ષમ સત્તાધીકારીએ જો અરજદાર કોઈપણ વળતર ભથ્થું મેળવતો હોય, તો રજા પુરી થયે, સરકારી કર્મચારી તે જ જગ્યાએ અથવા તે જ પ્રકારની તેવા સમાન ભથ્થા મેળવતી જગ્યાએ હાજર થવાનો સંભવ છે કે કેમ તે ઉલ્લેખ પણ આ હુકમમાં કરવો..
      </div>

      <!-- Applicant Signature & Date Footer -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; padding: 0 10px;">
        <div style="font-weight: bold; font-size: 14px;">
          અરજદારની સહી: ___________________
        </div>
        <div style="font-weight: bold; font-size: 14px;">
          તા. <strong>${applicationDateDisplay}</strong>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the Forwarding Letter HTML structure (Document 2)
 */
export function getForwardingLetterHtml(data: LeaveFormPdfData): string {
  const {
    siProfile,
    leaveTypeDisplay,
    fromDateDisplay,
    toDateDisplay,
    totalDays,
    willLeaveHeadquarters,
    applicationDateDisplay,
  } = data;

  const employeeName = siProfile.nameGujarati || siProfile.nameEnglish || "ગૌરવ કિશોરભાઈ ડોડિયા";
  const employeeDesignation = siProfile.designationGujarati || siProfile.designationEnglish || "સુ.ઇ વેલ્ડર";

  // Clean leave type string for body sentence (remove abbreviation in parentheses if present)
  let cleanLeaveType = leaveTypeDisplay;
  if (cleanLeaveType.includes("(")) {
    cleanLeaveType = cleanLeaveType.split("(")[0].trim();
  }

  // Headquarters option with precise middle strike-through on non-applicable option
  const hqText = willLeaveHeadquarters === "હા"
    ? `** ઉપરોક્ત રજા દરમિયાન હું વડું મથક છોડવા માંગું છું / <s style="text-decoration: line-through;">વડા મથકમાં જ હાજર છું</s>.`
    : `** ઉપરોક્ત રજા દરમિયાન હું <s style="text-decoration: line-through;">વડું મથક છોડવા માંગું છું</s> / વડા મથકમાં જ હાજર છું.`;

  return `
    <div class="shruti-font" style="width: 794px; background: #ffffff; color: #000000; padding: 40px 50px; box-sizing: border-box; font-size: 13.5px; line-height: 1.45; border: 1px solid #e2e8f0; margin: 0 auto; font-family: 'Shruti', 'Noto Sans Gujarati', sans-serif;">
      <!-- Top Right Header Address (5 lines: Employee Name, Designation, ITI, Porbandar, Date) -->
      <div style="margin-left: 420px; width: 280px; text-align: left; margin-bottom: 18px; line-height: 1.25; font-size: 13.5px; color: #000000; font-weight: normal;">
        <div>${employeeName}</div>
        <div>${employeeDesignation}</div>
        <div>ઔદ્યોગિક તાલીમ સંસ્થા,</div>
        <div>પોરબંદર</div>
        <div>તા. ${applicationDateDisplay}</div>
      </div>

      <!-- Top Left Recipient Address -->
      <div style="text-align: left; margin-bottom: 18px; line-height: 1.25; font-size: 13.5px; color: #000000; font-weight: normal;">
        <div style="font-weight: bold;">પ્રતિ,</div>
        <div style="font-weight: bold;">આચાર્ય શ્રી</div>
        <div>ઔદ્યોગિક તાલીમ સંસ્થા,</div>
        <div>પોરબંદર</div>
      </div>

      <!-- Subject & Date Range Block -->
      <div style="margin-left: 0px; margin-bottom: 16px;">
        <div style="font-size: 13.5px; font-weight: bold;">
          વિષય :&nbsp;${leaveTypeDisplay} મંજૂર કરવા બાબત
        </div>
        <div style="font-size: 13.5px; font-weight: bold; margin-left: 52px; margin-top: 3px;">
          તા. ${fromDateDisplay} થી તા. ${toDateDisplay} સુધી ${totalDays} દિવસ
        </div>
      </div>

      <!-- Salutation -->
      <div style="font-size: 13.5px; font-weight: bold; margin-bottom: 10px;">
        માનનીય સાહેબ,
      </div>

      <!-- Body Content (Normal weight, justified, one tab space after 'સવિનય જણાવવાનું કે') -->
      <div style="text-align: justify; line-height: 1.5; margin-bottom: 16px; font-weight: normal; color: #000000;">
        <p style="margin: 0 0 8px 0; text-align: justify; font-weight: normal;">
          સવિનય જણાવવાનું કે&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${cleanLeaveType} પ્રસંગે તા. ${fromDateDisplay} થી તા. ${toDateDisplay} સુધી ${totalDays} દિવસ * હું મારી ફરજ પર હાજર રહી શકું તેમ નથી / <s style="text-decoration: line-through;">હાજર રહી શક્યો નથી</s>. તો મારી ઉપરોક્ત રજા આગળ પાછળના રજા ના લાભ સાથે મંજૂર કરવા વિનંતી છે.
        </p>
        <p style="margin: 0 0 8px 0; text-align: justify; font-weight: normal;">
          ${hqText}
        </p>
      </div>

      <!-- Closing -->
      <div style="margin-bottom: 25px; text-align: left; font-size: 13.5px; font-weight: normal;">
        આભાર સહ
      </div>

      <!-- Signature Block (Centered within right block, employee name only) -->
      <div style="margin-left: auto; width: 250px; text-align: center; margin-top: 25px;">
        <div style="font-size: 13.5px; font-weight: normal; text-align: center; margin-bottom: 45px;">
          આપનો વિશ્વાસુ,
        </div>
        <div style="font-size: 13.5px; font-weight: normal; text-align: center;">
          ( ${employeeName} )
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders an offscreen DOM element to crisp A4 canvas and saves as PDF
 */
async function renderHtmlToPdf(htmlString: string, filename: string): Promise<string> {
  ensureGujaratiFontRegistered();

  // Create temporary offscreen element
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0px";
  container.style.width = "794px"; // Exact A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  container.innerHTML = htmlString;

  document.body.appendChild(container);

  // Wait for font and images to render
  if (typeof document !== "undefined" && (document as any).fonts) {
    await (document as any).fonts.ready;
  }
  await new Promise(resolve => setTimeout(resolve, 300));

  const canvas = await html2canvas(container, {
    scale: 3, // High DPI resolution for print
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: 794,
    height: container.offsetHeight || 1123,
  });

  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, Math.min(imgHeight, pdfHeight), undefined, "FAST");

  const pdfFileName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(pdfFileName);

  return pdfFileName;
}

/**
 * Main function triggered by "દસ્તાવેજ બનાવો" button:
 * Generates Leave Form PDF & Forwarding Letter PDF
 */
export async function generateLeaveDocumentsPDF(data: LeaveFormPdfData) {
  try {
    ensureGujaratiFontRegistered();

    const leaveFormHtml = getLeaveFormHtml(data);
    const forwardingLetterHtml = getForwardingLetterHtml(data);

    // Generate Leave Form PDF
    const leaveFormFilename = `Leave_Application_${data.siProfile.nameGujarati || 'SI'}_${data.fromDateDisplay.replace(/\//g, '-')}`;
    await renderHtmlToPdf(leaveFormHtml, leaveFormFilename);

    // Wait short gap to ensure separate download triggers cleanly
    await new Promise(r => setTimeout(r, 400));

    // Generate Forwarding Letter PDF
    const forwardingFilename = `Forwarding_Letter_${data.siProfile.nameGujarati || 'SI'}_${data.fromDateDisplay.replace(/\//g, '-')}`;
    await renderHtmlToPdf(forwardingLetterHtml, forwardingFilename);

    return {
      leaveFormFilename: `${leaveFormFilename}.pdf`,
      forwardingFilename: `${forwardingFilename}.pdf`,
      leaveFormHtml,
      forwardingLetterHtml,
    };
  } catch (err: any) {
    console.error("PDF generation failed:", err);
    throw err;
  }
}
