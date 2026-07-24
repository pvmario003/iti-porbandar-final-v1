import React, { useState, useEffect } from "react";
import { Search, Filter, RefreshCw, FileText, Calendar } from "lucide-react";
import { Student, StudentStatus, STUDENT_STATUS_LABELS, Batch } from "../types";
import { getStudents, getBatches } from "../utils/storage";

interface ExitedStudentsListProps {
  onOpenProfile: (student: Student) => void;
  allowedBatchIds?: string[]; // S.I. can only see their own batches
}

export default function ExitedStudentsList({
  onOpenProfile,
  allowedBatchIds
}: ExitedStudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedTrade, setSelectedTrade] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    loadData();
  }, [allowedBatchIds]);

  const loadData = () => {
    let allStudents = getStudents().filter(s => s.currentStatus !== StudentStatus.ACTIVE);
    
    // Role based security checks
    if (allowedBatchIds) {
      allStudents = allStudents.filter(s => allowedBatchIds.includes(s.batchId));
    }

    setStudents(allStudents);

    let allBatches = getBatches();
    if (allowedBatchIds) {
      allBatches = allBatches.filter(b => allowedBatchIds.includes(b.id));
    }
    setBatches(allBatches);
  };

  // Extract unique trades
  const trades = Array.from(new Set(students.map(s => s.trade)));

  // Months list for filtering
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  // Years list for filtering (extracted from effectiveDates)
  const years = Array.from(
    new Set(
      students
        .map(s => s.exitEffectiveDate ? s.exitEffectiveDate.split("-")[0] : "")
        .filter(y => y !== "")
    )
  ).sort().reverse();

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("");
    setSelectedTrade("");
    setSelectedBatchId("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  // Perform search and filtering logic
  const filteredStudents = students.filter(student => {
    // 1. Search Query Match
    const matchesSearch = 
      searchTerm === "" ||
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.exitOutwardNumber && student.exitOutwardNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Status Match
    const matchesStatus = selectedStatus === "" || student.currentStatus === selectedStatus;

    // 3. Trade Match
    const matchesTrade = selectedTrade === "" || student.trade === selectedTrade;

    // 4. Batch Match
    const matchesBatch = selectedBatchId === "" || student.batchId === selectedBatchId;

    // 5. Month & Year matches based on exitEffectiveDate (YYYY-MM-DD)
    let matchesMonth = true;
    let matchesYear = true;

    if (student.exitEffectiveDate) {
      const [year, month] = student.exitEffectiveDate.split("-");
      if (selectedMonth !== "") {
        matchesMonth = month === selectedMonth;
      }
      if (selectedYear !== "") {
        matchesYear = year === selectedYear;
      }
    } else {
      if (selectedMonth !== "" || selectedYear !== "") {
        return false; // Skip if no effective date exists but date filters are applied
      }
    }

    return matchesSearch && matchesStatus && matchesTrade && matchesBatch && matchesMonth && matchesYear;
  });

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={16} className="text-amber-600" /> Exited Student Registry (કમી કરેલ તાલીમાર્થી પત્રક)
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-50 border border-slate-200 px-2.5 py-1 transition-all cursor-pointer"
          >
            <RefreshCw size={12} /> Reset Filters
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, ENR, outward no..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white shadow-3xs"
            />
          </div>

          {/* Exit Type Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="">-- All Exit Types --</option>
              {Object.entries(STUDENT_STATUS_LABELS)
                .filter(([key]) => key !== StudentStatus.ACTIVE)
                .map(([key, value]) => (
                  <option key={key} value={key}>{value.gu} ({value.en})</option>
                ))}
            </select>
          </div>

          {/* Trade Filter */}
          <div>
            <select
              value={selectedTrade}
              onChange={e => setSelectedTrade(e.target.value)}
              className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="">-- All Trades --</option>
              {trades.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="">-- All Months --</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="">-- All Years --</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span>Showing {filteredStudents.length} of {students.length} historical exit records</span>
      </div>

      {/* Exited Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Calendar className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-sm font-bold text-slate-700">No matching exit records found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filters or modifying your search query.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">S.N.</th>
                  <th className="p-3">Student Details</th>
                  <th className="p-3">Trade / Batch</th>
                  <th className="p-3">Exit Type</th>
                  <th className="p-3">Effective Date</th>
                  <th className="p-3">Outward No / Date</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredStudents.map((student, idx) => {
                  const label = STUDENT_STATUS_LABELS[student.currentStatus];
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {student.studentName} {student.surname}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {student.enrollmentNumber}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{student.trade}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{student.batchName}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          {label.gu} ({label.en})
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {student.exitEffectiveDate ? new Date(student.exitEffectiveDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 font-mono">{student.exitOutwardNumber || "-"}</div>
                        {student.exitOutwardDate && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(student.exitOutwardDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={student.exitReason}>
                        {student.exitReason || <span className="text-slate-400 italic">No remarks</span>}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onOpenProfile(student)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-md transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
