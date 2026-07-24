import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { NOTO_SANS_GUJARATI_BASE64 } from '../src/utils/notoSansGujaratiBase64.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const templatesDir = path.join(__dirname, '..', 'public', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Noto Sans Gujarati Font from Base64
  const fontBytes = Uint8Array.from(Buffer.from(NOTO_SANS_GUJARATI_BASE64, 'base64'));
  const gujFont = await pdfDoc.embedFont(fontBytes);

  // --- PAGE 1: FORWARDING LETTER ---
  const page1 = pdfDoc.addPage([595.27, 841.89]); // A4
  const { width: p1W, height: p1H } = page1.getSize();

  // Draw Header Labels (Right aligned text for Sender, but we draw it blank with lines)
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font: gujFont, color: rgb(0, 0, 0) });
  };

  // Top right lines and placeholders
  drawText("ગૌરવ કે. ડોડીયા", 440, 790);
  drawText("સુ.ઇ વેલ્ડર", 440, 772);
  drawText("ઔદ્યોગિક તાલીમ સંસ્થા,", 440, 754);
  drawText("પોરબંદર", 440, 736);
  drawText("તા. ____________________", 440, 718);

  // Recipient Block (Left)
  drawText("પ્રતિ,", 45, 660);
  drawText("આચાર્ય શ્રી,", 45, 642);
  drawText("ઔદ્યોગિક તાલીમ સંસ્થા,", 45, 624);
  drawText("પોરબંદર", 45, 606);

  // Subject
  drawText("વિષય : ______________________________ મંજૂર કરવા બાબત", 45, 550, 12);

  // Dates
  drawText("તા. ____________________ થી", 45, 514);
  drawText("તા. ____________________", 210, 514);
  drawText("દવસ ____________________", 45, 478);

  // Salutation
  drawText("માનનીય સાહેબ,", 45, 430, 12);

  // Paragraph with blank space
  drawText("સવિનય જણાવવાનું કે ____________________________________________________ સબબ", 45, 394);
  drawText("તા. ____________________ થી", 45, 358);
  drawText("તા. ____________________                       દવસ ________", 210, 358);

  // Bullet points
  drawText("* હું મારી ફરજ પર હાજર રહી શકું તેમ નથી / હાજર રહી શક્યો નથી. તો", 45, 310);
  drawText("મારી ઉપરોક્ત રજા આગળ પાછળના રજાના લાભ સાથે મંજૂર કરવા વિનંતી છે.", 45, 292);
  drawText("** ઉપરોક્ત રજા દરમિયાન હું વડું મથક છોડવા માંગું છું / વડા મથકમાં જ હાજર રહીશ.", 45, 260);

  // Closing
  drawText("આભાર સહ", 45, 210);
  drawText("______________________________ આપની વિશ્વાસુ,", 380, 190);
  drawText("(                                              )", 440, 140);


  // --- PAGE 2: APPLICATION FORM ---
  const page2 = pdfDoc.addPage([595.27, 841.89]); // A4
  const drawTextP2 = (text, x, y, size = 10, bold = false) => {
    page2.drawText(text, { x, y, size, font: gujFont, color: rgb(0, 0, 0) });
  };

  // Main Header
  drawTextP2("રજા મેળવવા અથવા લંબાવવા માટેની અરજી", 200, 805, 12);
  drawTextP2("(ગુજરાત મુલ્કી સેવા (રજા) નિયમો - ૨૦૦૨માં નિયમ - ૨૪)", 175, 788, 10);

  // Draw Grid Table
  const tableTop = 770;
  const tableLeft = 45;
  const tableWidth = 505;
  const tableHeight = 550;

  // Let's draw table outer border
  page2.drawRectangle({
    x: tableLeft,
    y: tableTop - tableHeight,
    width: tableWidth,
    height: tableHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Rows and Cells
  const rowHeights = [25, 25, 50, 25, 25, 25, 25, 40, 25, 30, 40, 95, 25, 95];
  let currentY = tableTop;

  // Vertical column separator at 45 + 30 (col for index) and 45 + 220 (col for labels)
  const idxColW = 25;
  const labelColW = 195;
  
  page2.drawLine({
    start: { x: tableLeft + idxColW, y: tableTop },
    end: { x: tableLeft + idxColW, y: tableTop - tableHeight },
    color: rgb(0, 0, 0),
    thickness: 1,
  });

  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW, y: tableTop },
    end: { x: tableLeft + idxColW + labelColW, y: tableTop - tableHeight },
    color: rgb(0, 0, 0),
    thickness: 1,
  });

  // Draw Row Lines and Row labels
  const rowLabels = [
    { idx: "૧", text: "અરજદારનું નામ" },
    { idx: "૨", text: "ધારણ કરેલ હોદ્દો" },
    { idx: "૩", text: "ખાતું, કચેરી અને શાખા" },
    { idx: "૪", text: "પગાર" },
    { idx: "૫", text: "હાલની જગ્યા પર મળતું ઘરભાડું અને અન્ય ભથ્થા" },
    { idx: "૬", text: "રજાનો પ્રકાર અને સમયગાળો" },
    { idx: "૭", text: "" },
    { idx: "૮", text: "રવિવાર અને જાહેર રજાઓ, રજાની આગળ / પાછળ" },
    { idx: "૯", text: "રજા માટેની અરજી કરવાનું કારણ" },
    { idx: "૧૦", text: "છેલ્લી રજા ઉપરથી હાજર થયા તે તારીખ અને તે રજાનો પ્રકાર" },
    { idx: "૧૧", text: "રજાના સમયગાળા દરમિયાન સરનામું" },
    { idx: "૧૨", text: "નોકરીમાંથી મોડું રાજીનામું અથવા મારી મરજીયાત નિવૃત્તિ પ્રસંગે..." },
    { idx: "૧૩", text: "* હું પ્રમાણિત કરું છું કે આ અરજીની તારીખે મને બે અથવા..." },
    { idx: "૧૩", text: "નિયંત્રક અધિકારીનું ટિપ્પણી અને અથવા ભલામણ" }
  ];

  for (let i = 0; i < rowHeights.length; i++) {
    const h = rowHeights[i];
    currentY -= h;
    // Draw horizontal line
    if (i < rowHeights.length - 1) {
      page2.drawLine({
        start: { x: tableLeft, y: currentY },
        end: { x: tableLeft + tableWidth, y: currentY },
        color: rgb(0, 0, 0),
        thickness: 1,
      });
    }

    // Draw indices and labels
    if (rowLabels[i]) {
      drawTextP2(rowLabels[i].idx, tableLeft + 8, currentY + h - 16, 10);
      
      // Wrap or position label text
      const lblY = currentY + h - 16;
      if (rowLabels[i].text) {
        drawTextP2(rowLabels[i].text, tableLeft + idxColW + 8, lblY, 9);
      }
    }
  }

  // Draw some interior lines for specific fields like "બેડ પે" "ગ્રેડ પે" in row 4
  // Row 4 is at index 3 (height index 3, from Y=670 to Y=645)
  // Let's draw horizontal and vertical splits for Bed Pay / Grade Pay
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW + 100, y: 770 - 25 - 25 - 50 },
    end: { x: tableLeft + idxColW + labelColW + 100, y: 770 - 25 - 25 - 50 - 25 },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW + 200, y: 770 - 25 - 25 - 50 },
    end: { x: tableLeft + idxColW + labelColW + 200, y: 770 - 25 - 25 - 50 - 25 },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  drawTextP2("બેન્ચ પે", tableLeft + idxColW + labelColW + 10, 770 - 25 - 25 - 50 - 16, 9);
  drawTextP2("ગ્રેડ પે", tableLeft + idxColW + labelColW + 110, 770 - 25 - 25 - 50 - 16, 9);

  // Row 5 HRA
  drawTextP2("સરકારશ્રીના પ્રવર્તમાન નિયમાનુસાર મળવાપાત્ર", tableLeft + idxColW + labelColW + 10, 770 - 25 - 25 - 50 - 25 - 16, 9);

  // Row 7 (from/to sub-table)
  // Split the value cell for from and to date
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW + 150, y: 770 - 25*6 },
    end: { x: tableLeft + idxColW + labelColW + 150, y: 770 - 25*7 },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  drawTextP2("તા.", tableLeft + idxColW + labelColW + 10, 770 - 25*6 - 16, 9);
  drawTextP2("થી તા.", tableLeft + idxColW + labelColW + 160, 770 - 25*6 - 16, 9);

  // Row 8 (prefix / suffix sub-table)
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW, y: 770 - 25*7 - 20 },
    end: { x: tableLeft + tableWidth, y: 770 - 25*7 - 20 },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  drawTextP2("આગળ તા.", tableLeft + idxColW + 8, 770 - 25*7 - 16, 9);
  drawTextP2("પાછળ તા.", tableLeft + idxColW + 8, 770 - 25*7 - 34, 9);

  // Row 10 (last leave details sub-table)
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW + 150, y: 770 - 25*7 - 40 - 25 },
    end: { x: tableLeft + idxColW + labelColW + 150, y: 770 - 25*7 - 40 - 25 - 30 },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  drawTextP2("તા.", tableLeft + idxColW + labelColW + 10, 770 - 25*7 - 40 - 25 - 18, 9);
  drawTextP2("દિવસ", tableLeft + idxColW + labelColW + 160, 770 - 25*7 - 40 - 25 - 18, 9);

  // Row 14 (split comments sections: Row 13 comments is on the left, Row 14 comments on the right)
  const finalRowTop = 220; // 770 - 550
  page2.drawLine({
    start: { x: tableLeft + idxColW + labelColW, y: finalRowTop + 95 },
    end: { x: tableLeft + idxColW + labelColW, y: finalRowTop },
    color: rgb(0, 0, 0),
    thickness: 1,
  });
  drawTextP2("૧૪ રજા મંજૂર કરવા સક્ષમ સત્તાધિકારીના હુકમો", tableLeft + idxColW + labelColW + 8, finalRowTop + 80, 9);
  drawTextP2("સહી (તારીખ સાથે)", tableLeft + idxColW + labelColW + 8, finalRowTop + 20, 9);
  drawTextP2("હોદો", tableLeft + idxColW + labelColW + 8, finalRowTop + 8, 9);

  // Bottom footer text
  const footerY = 160;
  drawTextP2("* રજા મંજૂર કરવા સક્ષમ સત્તાધીકારિએ જો અરજદાર કોઈપણ વળતર ભથ્થું મેળવતો હોય, તો રજા પુરી થયે,", 45, footerY, 8);
  drawTextP2("સરકારી કર્મચારી તે જ જગ્યાએ અથવા તે જ પ્રકારની તેવા સમાન ભથ્થા મેળવતી જગ્યાએ હાજર થવાનો સંભવ છે કે કેમ તેનો ઉલ્લેખ પણ આ હુકમમાં કરવો.", 45, footerY - 10, 8);

  drawTextP2("અરજદારની સહી", 45, footerY - 40, 10);
  drawTextP2("તા.", 350, footerY - 40, 10);

  // Save the generated PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(templatesDir, 'leave-template.pdf'), pdfBytes);
  console.log("Successfully generated public/templates/leave-template.pdf!");

  // Copy font to public/templates/Shruti.ttf using base64 bytes
  const shrutiPath = path.join(templatesDir, 'Shruti.ttf');
  fs.writeFileSync(shrutiPath, fontBytes);
  console.log("Successfully copied font to public/templates/Shruti.ttf!");
}

run().catch(console.error);
