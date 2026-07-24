import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

async function test() {
  try {
    console.log("PDFDocument:", PDFDocument);
    console.log("fontkit:", fontkit);
    
    const doc = await PDFDocument.create();
    console.log("registering fontkit...");
    doc.registerFontkit(fontkit);
    console.log("Successfully registered fontkit!");
  } catch (err) {
    console.error("PDF-LIB TEST FAILED:", err);
  }
}

test();
