import React, { useState, useEffect } from "react";
import { 
  FileText, UserCheck, Calendar, MapPin, Phone, Building2, 
  Download, Printer, CheckCircle2, AlertCircle, Plus, Eye, Trash2, Edit3, Save, RefreshCw
} from "lucide-react";
import { User, SIProfile, LeaveApplication } from "../types";
import { 
  getSIProfileByUserId, saveSIProfile, getLeaveApplicationsByUserId, 
  saveLeaveApplication, deleteLeaveApplication, generateId, addAuditLog 
} from "../utils/storage";
import { 
  generateLeaveDocumentsPDF, formatGujaratiDate, getLeaveFormHtml, getForwardingLetterHtml, ensureGujaratiFontRegistered 
} from "../utils/leavePdfGenerator";

interface LeaveManagementModuleProps {
  currentUser: User;
}

export default function LeaveManagementModule({ currentUser }: LeaveManagementModuleProps) {
  const [activeTab, setActiveTab] = useState<"new_application" | "profile" | "history">("new_application");

  // Font notification state
  const [fontStatusMessage, setFontStatusMessage] = useState<string>("");

  // SI Profile State
  const [profile, setProfile] = useState<SIProfile>({
    id: generateId(),
    userId: currentUser.id,
    nameGujarati: currentUser.supervisorNameGujarati || currentUser.name || "રમેશભાઈ વી. પટેલ",
    designationGujarati: "સુપરવાઇઝર ઇન્સ્ટ્રક્ટર (વેલ્ડર)",
    salary: "૫૩૬૦૦ /-",
    bandPay: "૯૩૦૦ - ૩૪૮૦૦",
    gradePay: "૪૨૦૦",
    addressGujarati: "૧૫, શ્રીજી કૃપા સોસાયટી, છાંયા રોડ, પોરબંદર - ૩૬૦૫૭૫",
    mobile: "૯૮૭૬૫૪૩૨૧૦",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  // Leave Application Inputs State
  const [leaveType, setLeaveType] = useState<string>("કેઝ્યુઅલ લીવ (CL)");
  const [customLeaveType, setCustomLeaveType] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [leaveReason, setLeaveReason] = useState<string>("અંગત કામ અર્થે");
  const [customLeaveReason, setCustomLeaveReason] = useState<string>("");

  const [addressDuringLeave, setAddressDuringLeave] = useState<string>("");
  const [willLeaveHeadquarters, setWillLeaveHeadquarters] = useState<"હા" | "ના">("હા");
  const [prefixHolidays, setPrefixHolidays] = useState<string>("");
  const [suffixHolidays, setSuffixHolidays] = useState<string>("");
  const [applicationDate, setApplicationDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // History State
  const [historyApps, setHistoryApps] = useState<LeaveApplication[]>([]);

  // Document Modal Preview State
  const [previewApp, setPreviewApp] = useState<LeaveApplication | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Check font & load existing profile/history on mount
  useEffect(() => {
    ensureGujaratiFontRegistered();
    setFontStatusMessage("Shruti / Noto Sans Gujarati ફોન્ટ સક્રિય છે (ગવર્નમેન્ટ માસ્ટર ટેમ્પલેટ મુજબ).");

    const existingProfile = getSIProfileByUserId(currentUser.id);
    if (existingProfile) {
      setProfile(existingProfile);
      if (existingProfile.addressGujarati) {
        setAddressDuringLeave(existingProfile.addressGujarati);
      }
    } else {
      setAddressDuringLeave("૧૫, શ્રીજી કૃપા સોસાયટી, છાંયા રોડ, પોરબંદર - ૩૬૦૫૭૫");
    }

    loadHistory();
  }, [currentUser.id]);

  const loadHistory = () => {
    const apps = getLeaveApplicationsByUserId(currentUser.id);
    setHistoryApps(apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  // Calculate Total Days
  const calculateTotalDays = (): number => {
    if (!fromDate || !toDate) return 1;
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 1;
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  const totalDays = calculateTotalDays();

  // Handle Save SI Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.nameGujarati.trim()) {
      alert("કૃપા કરીને નામ દાખલ કરો.");
      return;
    }
    const updated = { ...profile, updatedAt: new Date().toISOString() };
    saveSIProfile(updated);
    setProfile(updated);
    addAuditLog(currentUser.name, "SI Profile Saved");
    setProfileSavedSuccess(true);
    setTimeout(() => setProfileSavedSuccess(false), 3000);
  };

  // Handle Generate Documents Button ("દસ્તાવેજ બનાવો")
  const handleGenerateDocuments = async () => {
    setErrorMessage("");

    // Validate Profile
    if (!profile.nameGujarati.trim()) {
      setErrorMessage("કૃપા કરીને પહેલા 'SI પ્રોફાઇલ' માં તમારું નામ દાખલ કરીને સેવ કરો.");
      setActiveTab("profile");
      return;
    }

    // Validate Dropdown Rules
    let finalLeaveType = leaveType;
    if (leaveType === "અન્ય") {
      if (!customLeaveType.trim()) {
        setErrorMessage("તમે રજાના પ્રકારમાં 'અન્ય' પસંદ કરેલ છે. કૃપા કરીને રજાનો પ્રકાર ટાઇપ કરો.");
        return;
      }
      finalLeaveType = customLeaveType.trim();
    }

    let finalLeaveReason = leaveReason;
    if (leaveReason === "અન્ય") {
      if (!customLeaveReason.trim()) {
        setErrorMessage("તમે રજાના કારણમાં 'અન્ય' પસંદ કરેલ છે. કૃપા કરીને રજાનું કારણ ટાઇપ કરો.");
        return;
      }
      finalLeaveReason = customLeaveReason.trim();
    }

    if (!addressDuringLeave.trim()) {
      setErrorMessage("કૃપા કરીને રજા દરમિયાનનું સરનામું દાખલ કરો.");
      return;
    }

    setIsGenerating(true);

    try {
      const appRecord: LeaveApplication = {
        id: generateId(),
        userId: currentUser.id,
        profileId: profile.id,
        nameEnglish: profile.nameEnglish || "",
        nameGujarati: profile.nameGujarati,
        designationEnglish: profile.designationEnglish || "",
        designationGujarati: profile.designationGujarati,
        officeEnglish: "ITI Porbandar",
        officeGujarati: "ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર",
        departmentEnglish: "Employment and Training",
        departmentGujarati: "રોજગાર અને તાલીમ",
        employeeId: profile.employeeId || "",
        mobile: profile.mobile,
        addressEnglish: profile.addressEnglish || "",
        addressGujarati: profile.addressGujarati,
        salary: profile.salary,
        leaveType: finalLeaveType,
        customLeaveType: leaveType === "અન્ય" ? customLeaveType : undefined,
        fromDate,
        toDate,
        totalDays,
        leaveReason: finalLeaveReason,
        customLeaveReason: leaveReason === "અન્ય" ? customLeaveReason : undefined,
        addressDuringLeaveGujarati: addressDuringLeave,
        letterDate: applicationDate,
        status: "APPROVED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local storage & Supabase
      saveLeaveApplication(appRecord);
      addAuditLog(currentUser.name, `Created Leave Application for ${finalLeaveType} (${totalDays} days)`);
      loadHistory();

      // Trigger PDF Downloads
      const pdfData = {
        siProfile: profile,
        leaveTypeDisplay: finalLeaveType,
        fromDateDisplay: formatGujaratiDate(fromDate),
        toDateDisplay: formatGujaratiDate(toDate),
        totalDays,
        leaveReasonDisplay: finalLeaveReason,
        addressDuringLeave,
        willLeaveHeadquarters,
        prefixHolidays,
        suffixHolidays,
        applicationDateDisplay: formatGujaratiDate(applicationDate),
      };

      await generateLeaveDocumentsPDF(pdfData);

      setPreviewApp(appRecord);
      setIsGenerating(false);
    } catch (err: any) {
      console.error("Failed to build leave documents:", err);
      setIsGenerating(false);
      setErrorMessage("પીડીએફ દસ્તાવેજ બનાવવામાં ભૂલ આવી: " + (err.message || err));
    }
  };

  // Helper for generating PDF from History Record
  const handleReGenerateFromHistory = async (app: LeaveApplication) => {
    setIsGenerating(true);
    try {
      const pdfData = {
        siProfile: {
          ...profile,
          nameGujarati: app.nameGujarati || profile.nameGujarati,
          designationGujarati: app.designationGujarati || profile.designationGujarati,
          salary: app.salary || profile.salary,
        },
        leaveTypeDisplay: app.leaveType,
        fromDateDisplay: formatGujaratiDate(app.fromDate),
        toDateDisplay: formatGujaratiDate(app.toDate),
        totalDays: app.totalDays,
        leaveReasonDisplay: app.leaveReason,
        addressDuringLeave: app.addressDuringLeaveGujarati || profile.addressGujarati,
        willLeaveHeadquarters: "હા" as "હા" | "ના",
        applicationDateDisplay: formatGujaratiDate(app.letterDate || app.createdAt.split("T")[0]),
      };

      await generateLeaveDocumentsPDF(pdfData);
      setIsGenerating(false);
    } catch (e: any) {
      setIsGenerating(false);
      alert("Error: " + e.message);
    }
  };

  const handleDeleteHistory = (id: string) => {
    if (confirm("શું તમે આ રજીસ્ટર થયેલી રજા અરજી ડિલીટ કરવા માંગો છો?")) {
      deleteLeaveApplication(id);
      loadHistory();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-sans">
                  રજા મંજૂરી મોડ્યુલ (Leave Management Module)
                </h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  ઔદ્યોગિક તાલીમ સંસ્થા, પોરબંદર - ઓફિશિયલ ગવર્નમેન્ટ રજા અરજી પત્રક અને આવક/જાવક ફોરવર્ડિંગ પત્ર
                </p>
              </div>
            </div>
          </div>

          {/* Shruti Font Notification Badge */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{fontStatusMessage}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 gap-2">
          <button
            onClick={() => setActiveTab("new_application")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === "new_application"
                ? "border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Plus className="w-4 h-4" />
            નવી રજા અરજી બનાવો
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            SI પ્રોફાઇલ માહિતી
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            રજા અરજીઓનો ઇતિહાસ ({historyApps.length})
          </button>
        </div>
      </div>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">ધ્યાન આપો!</h4>
            <p className="text-amber-700 text-sm mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* TAB 1: NEW LEAVE APPLICATION */}
      {activeTab === "new_application" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields (Left Column) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>રજા અરજીની વિગતો દાખલ કરો</span>
                <span className="text-xs font-normal text-slate-500">* બધા ફિલ્ડ ગુજરાતીમાં છે</span>
              </h2>

              <div className="space-y-5">
                {/* 1. Leave Type Dropdown */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    ૧. રજાનો પ્રકાર <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="કેઝ્યુઅલ લીવ (CL)">કેઝ્યુઅલ લીવ (CL)</option>
                    <option value="અર્ધપગારી રજા (HPL)">અર્ધપગારી રજા (HPL)</option>
                    <option value="કમાયેલી રજા (EL)">કમાયેલી રજા (EL)</option>
                    <option value="સ્પેશિયલ લીવ">સ્પેશિયલ લીવ</option>
                    <option value="પ્રસૂતિ રજા (Maternity Leave)">પ્રસૂતિ રજા (Maternity Leave)</option>
                    <option value="પિતૃત્વ રજા (Paternity Leave)">પિતૃત્વ રજા (Paternity Leave)</option>
                    <option value="વગર પગારી રજા (LWP)">વગર પગારી રજા (LWP)</option>
                    <option value="અન્ય">અન્ય (Custom Input)</option>
                  </select>

                  {/* Dropdown Rule: Custom Textbox when "અન્ય" selected */}
                  {leaveType === "અન્ય" && (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        કૃપા કરીને અન્ય રજાનો પ્રકાર દાખલ કરો <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={customLeaveType}
                        onChange={(e) => setCustomLeaveType(e.target.value)}
                        placeholder="દા.ત. શૈક્ષણિક રજા / ખાસ ફરજ રજા"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Date Range Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      ૨. થી તારીખ (From Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      ૩. સુધી તારીખ (To Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Auto Calculated Days Display */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-900">કુલ રજા દિવસો (આપોઆપ ગણતરી):</span>
                  <span className="text-lg font-black text-blue-800 bg-white px-3 py-1 rounded-md border border-blue-300 shadow-sm">
                    {totalDays} દિવસ
                  </span>
                </div>

                {/* 3. Reason for Leave Dropdown */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    ૪. રજા માટેનું કારણ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="અંગત કામ અર્થે">અંગત કામ અર્થે</option>
                    <option value="સામાજિક પ્રસંગ અંગે">સામાજિક પ્રસંગ અંગે</option>
                    <option value="માતૃત્વ / પિતૃત્વ સંભાળ અર્થે">માતૃત્વ / પિતૃત્વ સંભાળ અર્થે</option>
                    <option value="માંદગીના કારણે">માંદગીના કારણે</option>
                    <option value="ધાર્મિક કાર્યક્રમ અર્થે">ધાર્મિક કાર્યક્રમ અર્થે</option>
                    <option value="અન્ય">અન્ય (Custom Input)</option>
                  </select>

                  {/* Dropdown Rule: Custom Textbox when "અન્ય" selected */}
                  {leaveReason === "અન્ય" && (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        કૃપા કરીને અન્ય કારણ દાખલ કરો <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={customLeaveReason}
                        onChange={(e) => setCustomLeaveReason(e.target.value)}
                        placeholder="દા.ત. કોર્ટ કેસ સંદર્ભે / તાલીમ અર્થે"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Address during Leave */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    ૫. રજાના સમયગાળા દરમિયાન સરનામું
                  </label>
                  <textarea
                    rows={2}
                    value={addressDuringLeave}
                    onChange={(e) => setAddressDuringLeave(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-500">ડિફોલ્ટ: SI પ્રોફાઇલનું સરનામું (સુધારી શકાય છે)</span>
                </div>

                {/* 5. Will Leave Headquarters? */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      ૬. વડા મથક છોડશે?
                    </label>
                    <select
                      value={willLeaveHeadquarters}
                      onChange={(e) => setWillLeaveHeadquarters(e.target.value as "હા" | "ના")}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="હા">હા</option>
                      <option value="ના">ના</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      ૭. અરજી તારીખ
                    </label>
                    <input
                      type="date"
                      value={applicationDate}
                      onChange={(e) => setApplicationDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Prefix / Suffix Holidays Optional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      આગળની જાહેર રજાઓ (Prefix Holidays - optional)
                    </label>
                    <input
                      type="text"
                      value={prefixHolidays}
                      onChange={(e) => setPrefixHolidays(e.target.value)}
                      placeholder="દા.ત. રવિવાર તા. ૧૦/૦૮/૨૦૨૬"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      પાછળની જાહેર રજાઓ (Suffix Holidays - optional)
                    </label>
                    <input
                      type="text"
                      value={suffixHolidays}
                      onChange={(e) => setSuffixHolidays(e.target.value)}
                      placeholder="દા.ત. સ્વતંત્રતા દિન તા. ૧૫/૦૮/૨૦૨૬"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SINGLE MAIN ACTION BUTTON */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  એક જ ક્લિકથી બંને ગવર્નમેન્ટ PDF (અરજી પત્રક + આવક/જાવક ફોરવર્ડિંગ પત્ર) ડાઉનલોડ થશે.
                </div>

                <button
                  onClick={handleGenerateDocuments}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      ગવર્નમેન્ટ દસ્તાવેજ પીડીએફ બને છે...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      દસ્તાવેજ બનાવો
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Summary & Fixed Data */}
          <div className="space-y-6">
            {/* Auto-filled SI Profile Box */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  SI પ્રોફાઇલ ડેટા (Auto Filled)
                </h3>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  સુધારો
                </button>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">નામ:</span>
                  <span className="font-bold text-slate-900">{profile.nameGujarati || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">હોદ્દો:</span>
                  <span className="font-bold text-slate-900">{profile.designationGujarati || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">પગાર:</span>
                  <span className="font-bold text-slate-900">{profile.salary || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">બેન્ડ પે:</span>
                  <span className="font-bold text-slate-900">{profile.bandPay || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">ગ્રેડ પે:</span>
                  <span className="font-bold text-slate-900">{profile.gradePay || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-500 font-medium">મોબાઇલ:</span>
                  <span className="font-bold text-slate-900">{profile.mobile || "-"}</span>
                </div>
              </div>
            </div>

            {/* Read-Only Fixed Government Data Box */}
            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-600" />
                ફિક્સ કચેરી ડેટા (Read-Only)
              </h3>
              <div className="space-y-2 text-xs font-medium text-slate-700 bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">ખાતું:</span>
                  <span className="font-bold text-slate-900">રોજગાર અને તાલીમ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">કચેરી:</span>
                  <span className="font-bold text-slate-900">ઔદ્યોગિક તાલીમ સંસ્થા</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">સ્થળ:</span>
                  <span className="font-bold text-slate-900">પોરબંદર</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">શાખા:</span>
                  <span className="font-bold text-slate-900">પોરબંદર</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SI PROFILE FORM */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">SI પ્રોફાઇલ માહિતી (માત્ર એક વાર જ દાખલ કરો)</h2>
              <p className="text-xs text-slate-500 mt-1">
                અહીં સંગ્રહિત વિગતો દરેક રજા અરજી પત્રક અને ફોરવર્ડિંગ પત્રમાં સ્વચાલિત રીતે ઉપયોગમાં લેવાશે.
              </p>
            </div>
            {profileSavedSuccess && (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                સેવ થઈ ગયું!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  નામ (ગુજરાતીમાં) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.nameGujarati}
                  onChange={(e) => setProfile({ ...profile, nameGujarati: e.target.value })}
                  placeholder="દા.ત. રમેશભાઈ વી. પટેલ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  હોદ્દો (ગુજરાતીમાં) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.designationGujarati}
                  onChange={(e) => setProfile({ ...profile, designationGujarati: e.target.value })}
                  placeholder="દા.ત. સુપરવાઇઝર ઇન્સ્ટ્રક્ટર"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  પગાર (Basic Salary) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.salary}
                  onChange={(e) => setProfile({ ...profile, salary: e.target.value })}
                  placeholder="દા.ત. ૫૩૬૦૦ /-"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  બેન્ડ પે (Band Pay) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.bandPay}
                  onChange={(e) => setProfile({ ...profile, bandPay: e.target.value })}
                  placeholder="દા.ત. ૯૩૦૦ - ૩૪૮૦૦"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ગ્રેડ પે (Grade Pay) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.gradePay}
                  onChange={(e) => setProfile({ ...profile, gradePay: e.target.value })}
                  placeholder="દા.ત. ૪૨૦૦"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                સરનામું (ગુજરાતીમાં) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={profile.addressGujarati}
                onChange={(e) => setProfile({ ...profile, addressGujarati: e.target.value })}
                placeholder="દા.ત. ૧૫, શ્રીજી કૃપા સોસાયટી, છાંયા રોડ, પોરબંદર"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                મોબાઇલ નંબર <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profile.mobile}
                onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                placeholder="દા.ત. ૯૮૭૬૫૪૩૨૧૦"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                પ્રોફાઇલ સેવ કરો
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>રજા અરજીઓનો ઇતિહાસ</span>
            <span className="text-xs text-slate-500 font-normal">કુલ record: {historyApps.length}</span>
          </h2>

          {historyApps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">કોઈ રજા અરજીઓ રેકોર્ડ થયેલ નથી.</p>
              <p className="text-xs mt-1 text-slate-500">નવી રજા અરજી બનાવવા માટે "નવી રજા અરજી બનાવો" ટેબ પર ક્લિક કરો.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                    <th className="p-3">અરજદાર</th>
                    <th className="p-3">રજાનો પ્રકાર</th>
                    <th className="p-3">સમયગાળો (Dates)</th>
                    <th className="p-3">દિવસો</th>
                    <th className="p-3">કારણ</th>
                    <th className="p-3 text-right">એક્શન (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {historyApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{app.nameGujarati}</td>
                      <td className="p-3 font-semibold text-blue-900">{app.leaveType}</td>
                      <td className="p-3 text-slate-700 font-medium">
                        {formatGujaratiDate(app.fromDate)} થી {formatGujaratiDate(app.toDate)}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{app.totalDays} દિવસ</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{app.leaveReason}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setPreviewApp(app)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          પ્રિવ્યૂ
                        </button>

                        <button
                          onClick={() => handleReGenerateFromHistory(app)}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          પીડીએફ
                        </button>

                        <button
                          onClick={() => handleDeleteHistory(app.id)}
                          className="px-2 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewApp && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  ગવર્નમેન્ટ દસ્તાવેજ પ્રિવ્યૂ (A4 Print Ready)
                </h3>
                <p className="text-xs text-slate-500">
                  રજા અરજી પત્રક અને આવક/જાવક ફોરવર્ડિંગ પત્ર
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReGenerateFromHistory(previewApp)}
                  className="px-4 py-2 bg-blue-800 text-white hover:bg-blue-900 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  પીડીએફ ડાઉનલોડ કરો
                </button>

                <button
                  onClick={() => setPreviewApp(null)}
                  className="px-3 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  બંધ કરો
                </button>
              </div>
            </div>

            {/* Document Side by Side / Stack Preview */}
            <div className="space-y-8 bg-slate-200 p-6 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">૧. રજા અરજી પત્રક (Leave Form)</h4>
                <div 
                  className="bg-white shadow-md mx-auto rounded overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: getLeaveFormHtml({
                      siProfile: profile,
                      leaveTypeDisplay: previewApp.leaveType,
                      fromDateDisplay: formatGujaratiDate(previewApp.fromDate),
                      toDateDisplay: formatGujaratiDate(previewApp.toDate),
                      totalDays: previewApp.totalDays,
                      leaveReasonDisplay: previewApp.leaveReason,
                      addressDuringLeave: previewApp.addressDuringLeaveGujarati || profile.addressGujarati,
                      willLeaveHeadquarters: "હા",
                      applicationDateDisplay: formatGujaratiDate(previewApp.letterDate || previewApp.createdAt.split("T")[0]),
                    })
                  }}
                />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">૨. ફોરવર્ડિંગ લેટર (Forwarding Letter)</h4>
                <div 
                  className="bg-white shadow-md mx-auto rounded overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: getForwardingLetterHtml({
                      siProfile: profile,
                      leaveTypeDisplay: previewApp.leaveType,
                      fromDateDisplay: formatGujaratiDate(previewApp.fromDate),
                      toDateDisplay: formatGujaratiDate(previewApp.toDate),
                      totalDays: previewApp.totalDays,
                      leaveReasonDisplay: previewApp.leaveReason,
                      addressDuringLeave: previewApp.addressDuringLeaveGujarati || profile.addressGujarati,
                      willLeaveHeadquarters: "હા",
                      applicationDateDisplay: formatGujaratiDate(previewApp.letterDate || previewApp.createdAt.split("T")[0]),
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
