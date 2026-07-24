import React, { useState } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Check, AlertTriangle, ArrowRight, ArrowLeft, Loader, FileSpreadsheet, Download } from "lucide-react";
import { Student, StudentStatus, Batch } from "../types";
import { getStudents, saveStudentsBatch, addAuditLog, transliterateEnglishToGujarati } from "../utils/storage";
import { downloadSampleStudentExcel, downloadSampleStudentCsv } from "../utils/exportUtils";

interface ImportStudentsModalProps {
  batches: Batch[];
  preselectedBatchId?: string;
  onClose: () => void;
  onImportComplete: () => void;
  currentUser: { id?: string; name: string; role?: string };
}

interface ColumnMap {
  appField: keyof Omit<Student, "id" | "trade" | "batchId" | "batchName" | "currentStatus" | "createdAt" | "updatedAt">;
  label: string;
  required: boolean;
  mappedHeader: string; // The uploaded spreadsheet header mapped to this field
}

export default function ImportStudentsModal({
  batches,
  preselectedBatchId = "",
  onClose,
  onImportComplete,
  currentUser
}: ImportStudentsModalProps) {
  const [step, setStep] = useState<"batch" | "upload" | "map" | "preview">("batch");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preselectedBatchId);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Raw file data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);

  // Mapping configuration
  const [columnMappings, setColumnMappings] = useState<ColumnMap[]>([
    { appField: "studentName", label: "Student Name / First Name", required: true, mappedHeader: "" },
    { appField: "fatherName", label: "Father's Name", required: true, mappedHeader: "" },
    { appField: "surname", label: "Surname", required: true, mappedHeader: "" },
    { appField: "enrollmentNumber", label: "Enrollment Number", required: true, mappedHeader: "" },
    { appField: "category", label: "Category (GEN, SEBC, SC, ST, EWS)", required: true, mappedHeader: "" },
    { appField: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", required: false, mappedHeader: "" },
    { appField: "gender", label: "Gender (Male/Female)", required: false, mappedHeader: "" },
    { appField: "studentMobileNumber", label: "Student Mobile", required: false, mappedHeader: "" },
    { appField: "parentMobileNumber", label: "Parent Mobile", required: false, mappedHeader: "" },
    { appField: "address", label: "Address", required: false, mappedHeader: "" },
    { appField: "admissionDate", label: "Admission Date (YYYY-MM-DD)", required: false, mappedHeader: "" }
  ]);

  // Validation results
  const [validRecords, setValidRecords] = useState<Student[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const activeBatches = batches.filter(b => {
    const isApproved = b.status === "APPROVED";
    if (currentUser.role === "SI" || currentUser.role === "SUPERVISOR") {
      return isApproved && b.assignedSIId === currentUser.id;
    }
    return isApproved;
  });
  const targetBatch = activeBatches.find(b => b.id === selectedBatchId);

  // Move to upload step
  const handleBatchSelected = () => {
    if (!selectedBatchId) return;
    setStep("upload");
  };

  // Helper for automated heuristic mapping
  const autoMapHeaders = (uploadedHeaders: string[]) => {
    const updated = columnMappings.map(mapping => {
      let matched = "";
      const field = mapping.appField.toLowerCase();
      const label = mapping.label.toLowerCase();

      for (const header of uploadedHeaders) {
        const h = header.toLowerCase().trim();
        // Exact or strong matches
        if (
          h === field ||
          h === label ||
          (field === "enrollmentnumber" && (h.includes("enroll") || h.includes("enr") || h.includes("roll"))) ||
          (field === "studentname" && (h === "name" || h === "student name" || h === "first name" || h === "firstname" || h === "student_name")) ||
          (field === "fathername" && (h.includes("father") || h.includes("parent name") || h === "father_name")) ||
          (field === "surname" && (h === "surname" || h === "last name" || h === "lastname" || h === "surname_name")) ||
          (field === "category" && (h.includes("category") || h.includes("cat") || h === "caste")) ||
          (field === "dateofbirth" && (h.includes("dob") || h.includes("birth") || h.includes("bday") || h.includes("born"))) ||
          (field === "gender" && (h === "gender" || h === "sex")) ||
          (field === "studentmobilenumber" && (h.includes("student mobile") || h === "mobile" || h === "phone" || h === "student phone" || h === "student_mobile")) ||
          (field === "parentmobilenumber" && (h.includes("parent mobile") || h.includes("father mobile") || h === "parent phone" || h === "parent_mobile")) ||
          (field === "address" && (h === "address" || h === "residence" || h.includes("addr"))) ||
          (field === "admissiondate" && (h.includes("admission") || h.includes("admit")))
        ) {
          matched = header;
          break;
        }
      }
      return { ...mapping, mappedHeader: matched };
    });
    setColumnMappings(updated);
  };

  // Parse Excel/CSV using xlsx
  const processFile = (file: File) => {
    setFileName(file.name);
    setParsing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Read headers and rows separately to be completely flexible with column count
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (json.length === 0) {
          alert("The uploaded file appears to be empty.");
          setParsing(false);
          return;
        }

        const uploadedHeaders = (json[0] || []).map(h => String(h || "").trim());
        const dataRows = json.slice(1);

        setHeaders(uploadedHeaders);
        setRawRows(dataRows);
        autoMapHeaders(uploadedHeaders);
        setParsing(false);
        setStep("map");
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Please ensure it is a valid CSV or Excel spreadsheet.");
        setParsing(false);
      }
    };

    reader.onerror = () => {
      alert("Error reading file.");
      setParsing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".xlsx")
      ) {
        processFile(file);
      } else {
        alert("Please upload a spreadsheet file (.csv, .xls, .xlsx) only.");
      }
    }
  };

  const handleMappingChange = (appField: string, value: string) => {
    setColumnMappings(prev =>
      prev.map(mapping =>
        mapping.appField === appField ? { ...mapping, mappedHeader: value } : mapping
      )
    );
  };

  // Perform client-side verification and check constraints
  const validateAndCompileData = () => {
    const errors: string[] = [];
    const valid: Student[] = [];
    const existingStudents = getStudents();
    const existingEnrollments = new Set(existingStudents.map(s => s.enrollmentNumber.toUpperCase().trim()));

    if (!targetBatch) {
      errors.push("Destination batch not found.");
      setValidationErrors(errors);
      setStep("preview");
      return;
    }

    // Map each mapping to get fast column indices
    const headerIndices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      headerIndices[h] = idx;
    });

    const activeMappings = columnMappings.filter(m => m.mappedHeader !== "");

    // Check if required mappings are satisfied
    const missingRequired = columnMappings.filter(m => m.required && m.mappedHeader === "");
    if (missingRequired.length > 0) {
      alert(`Please map all required fields: ${missingRequired.map(m => m.label).join(", ")}`);
      return;
    }

    const localEnrollments = new Set<string>();

    rawRows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 2; // spreadsheet 1-indexed plus header row
      
      // Skip empty rows
      if (row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === "")) {
        return;
      }

      // Extract values
      const extracted: Partial<Student> = {};
      activeMappings.forEach(mapping => {
        const colIdx = headerIndices[mapping.mappedHeader];
        let val = row[colIdx];
        
        // Sanitize value
        if (val === undefined || val === null) {
          extracted[mapping.appField] = "";
        } else if (val instanceof Date) {
          extracted[mapping.appField] = val.toISOString().split("T")[0];
        } else {
          extracted[mapping.appField] = String(val).trim();
        }
      });

      // Validations
      const sName = extracted.studentName || "";
      const fName = extracted.fatherName || "";
      const surname = extracted.surname || "";
      const enr = (extracted.enrollmentNumber || "").trim();

      if (!sName) {
        errors.push(`Row ${rowNum}: Missing Student Name.`);
        return;
      }
      if (!fName) {
        errors.push(`Row ${rowNum}: Missing Father's Name.`);
        return;
      }
      if (!surname) {
        errors.push(`Row ${rowNum}: Missing Surname.`);
        return;
      }
      if (!enr) {
        errors.push(`Row ${rowNum}: Missing Enrollment Number.`);
        return;
      }

      const cleanEnr = enr.toUpperCase();

      // Check for global duplicates
      if (existingEnrollments.has(cleanEnr)) {
        errors.push(`Row ${rowNum}: Duplicate Enrollment Number '${enr}' is already registered in another batch.`);
        return;
      }

      // Check for row duplicates in the current import file
      if (localEnrollments.has(cleanEnr)) {
        errors.push(`Row ${rowNum}: Duplicate Enrollment Number '${enr}' found multiple times in this upload.`);
        return;
      }

      localEnrollments.add(cleanEnr);

      // Create valid student record
      const studentId = "imported-" + Math.random().toString(36).substring(2, 11);
      const newStudent: Student = {
        id: studentId,
        studentName: sName,
        fatherName: fName,
        surname: surname,
        enrollmentNumber: enr,
        dateOfBirth: extracted.dateOfBirth || "2006-01-01",
        gender: extracted.gender || "Male",
        trade: targetBatch.tradeName,
        batchId: targetBatch.id,
        batchName: targetBatch.displayName,
        academicSession: targetBatch.academicSession,
        year: targetBatch.year,
        shift: targetBatch.shift,
        studentMobileNumber: extracted.studentMobileNumber || "",
        parentMobileNumber: extracted.parentMobileNumber || "",
        address: extracted.address || "Gujarat, India",
        admissionDate: extracted.admissionDate || new Date().toISOString().split("T")[0],
        currentStatus: StudentStatus.ACTIVE,
        category: (extracted.category || "GEN").trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fullNameEnglish: `${sName} ${fName} ${surname}`.trim(),
        fullNameGujarati: transliterateEnglishToGujarati(`${sName} ${fName} ${surname}`.trim()),
        addressEnglish: extracted.address || "Gujarat, India",
        addressGujarati: transliterateEnglishToGujarati(extracted.address || "Gujarat, India")
      };

      valid.push(newStudent);
    });

    setValidRecords(valid);
    setValidationErrors(errors);
    setStep("preview");
  };

  const handleFinalImport = () => {
    if (validRecords.length === 0) {
      alert("No valid student records to import.");
      return;
    }

    setImporting(true);
    setTimeout(() => {
      saveStudentsBatch(validRecords);
      addAuditLog(
        currentUser.name,
        `Imported ${validRecords.length} students into batch '${targetBatch?.displayName}' via Excel/CSV mapping`
      );
      setImporting(false);
      onImportComplete();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600/20 p-2 rounded-lg text-emerald-400">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-md font-bold tracking-tight">Import Student Data</h2>
              <p className="text-xs text-slate-400 font-medium">Batch CSV, XLS, or XLSX ingest tool</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Steps Indicators */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 shrink-0">
          <span className={`${step === "batch" ? "text-slate-900 font-bold" : ""}`}>1. Select Batch</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className={`${step === "upload" ? "text-slate-900 font-bold" : ""}`}>2. Upload Spreadsheet</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className={`${step === "map" ? "text-slate-900 font-bold" : ""}`}>3. Map Columns</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className={`${step === "preview" ? "text-slate-900 font-bold" : ""}`}>4. Verify & Commit</span>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* STEP 1: SELECT BATCH */}
          {step === "batch" && (
            <div className="space-y-4 py-4 max-w-md mx-auto text-center">
              <h3 className="text-lg font-bold text-slate-800">Choose Destination Batch</h3>
              <p className="text-xs text-slate-500">
                All student records parsed from the spreadsheet will be assigned to this specific batch and its associated Trade, Section, and Shift settings.
              </p>
              
              {activeBatches.length === 0 ? (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl text-center text-xs font-semibold text-amber-800">
                  You do not have any APPROVED active batches. Please wait for the Institute Admin to approve your newly created batches before importing students.
                </div>
              ) : (
                <div className="space-y-4 pt-2 text-left">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Target Batch
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-sm font-semibold"
                  >
                    <option value="">-- Choose Approved Batch --</option>
                    {activeBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.displayName} ({b.tradeName} • Shift {b.shift})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleBatchSelected}
                    disabled={!selectedBatchId}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: UPLOAD FILE */}
          {step === "upload" && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Destination Batch: <strong className="text-slate-900">{targetBatch?.displayName}</strong></span>
                <button 
                  onClick={() => setStep("batch")}
                  className="text-slate-500 hover:text-slate-900 font-bold"
                >
                  Change
                </button>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDragOver 
                    ? "border-slate-800 bg-slate-50" 
                    : "border-slate-300 hover:border-slate-400 bg-white"
                }`}
              >
                {parsing ? (
                  <div className="space-y-2 py-6">
                    <Loader className="animate-spin text-slate-600 mx-auto" size={32} />
                    <p className="text-xs font-semibold text-slate-600">Reading Excel spreadsheet contents, please wait...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drag and drop your spreadsheet file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) formats
                      </p>
                    </div>
                    <div className="mt-2">
                      <label className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-slate-800 cursor-pointer transition-colors">
                        Browse Files
                        <input
                          type="file"
                          accept=".csv, .xls, .xlsx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Sample Template Downloads */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Need a template? Download sample files:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadSampleStudentExcel}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    <Download size={12} /> Excel Template (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleStudentCsv}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    <Download size={12} /> CSV Template (.csv)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING */}
          {step === "map" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 font-medium">
                <span>Destination Batch: <strong className="text-slate-900">{targetBatch?.displayName}</strong></span>
                <span>File: <strong className="text-slate-900">{fileName}</strong></span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Map Columns to Student Fields</h3>
                <p className="text-xs text-slate-500">
                  Coordinate your spreadsheet's column headers with the mandatory student properties required for enrollment. Our engine auto-matched some headers based on names.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="grid grid-cols-2 bg-slate-50 p-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <div>Student Database Field</div>
                  <div>Spreadsheet Column Header</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {columnMappings.map((mapping) => (
                    <div key={mapping.appField} className="grid grid-cols-2 p-3 items-center gap-4 hover:bg-slate-50/55">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {mapping.label}
                        </span>
                        {mapping.required && (
                          <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                            Required
                          </span>
                        )}
                      </div>
                      <div>
                        <select
                          value={mapping.mappedHeader}
                          onChange={(e) => handleMappingChange(mapping.appField, e.target.value)}
                          className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white ${
                            mapping.mappedHeader 
                              ? "border-emerald-300 text-emerald-800 bg-emerald-50/20" 
                              : mapping.required 
                                ? "border-amber-300 text-amber-700 bg-amber-50/20" 
                                : "border-slate-200 text-slate-500"
                          }`}
                        >
                          <option value="">-- Ignore Field / Unmapped --</option>
                          {headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={validateAndCompileData}
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  Validate Data <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFY AND COMMIT */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Metrics Summary */}
                <div className="flex-1 p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                    <Check size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Valid Records</h4>
                    <p className="text-xl font-extrabold text-emerald-700 leading-none mt-1">
                      {validRecords.length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Students ready for enrollment</p>
                  </div>
                </div>

                <div className="flex-1 p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700 shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Errors Found</h4>
                    <p className="text-xl font-extrabold text-amber-700 leading-none mt-1">
                      {validationErrors.length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Faulty or duplicate rows skipped</p>
                  </div>
                </div>
              </div>

              {/* Validation Error Reports */}
              {validationErrors.length > 0 && (
                <div className="border border-amber-200 rounded-xl bg-amber-50/20 p-4 space-y-2 max-h-[160px] overflow-y-auto">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Validation Errors Detail
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 font-medium">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table Preview */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Preview: Ready to Import Students ({validRecords.length})
                </h4>

                {validRecords.length === 0 ? (
                  <div className="p-8 text-center border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400 font-semibold">
                    No valid student records found in this file with your current mapping settings. Please click back to adjust column mappings.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto shadow-xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Enrollment No</th>
                          <th className="p-2.5">Gender</th>
                          <th className="p-2.5">Student Mobile</th>
                          <th className="p-2.5">Parent Mobile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {validRecords.map((stu, i) => (
                          <tr key={i} className="hover:bg-slate-50/40">
                            <td className="p-2.5">{stu.studentName} {stu.fatherName} {stu.surname}</td>
                            <td className="p-2.5 font-mono text-slate-600">{stu.enrollmentNumber}</td>
                            <td className="p-2.5">{stu.gender}</td>
                            <td className="p-2.5 font-mono text-slate-500">{stu.studentMobileNumber || "-"}</td>
                            <td className="p-2.5 font-mono text-slate-500">{stu.parentMobileNumber || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Correct Mappings
                </button>
                <button
                  type="button"
                  disabled={validRecords.length === 0 || importing}
                  onClick={handleFinalImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {importing ? (
                    <>
                      <Loader className="animate-spin" size={14} /> Importing...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Import {validRecords.length} Students
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
