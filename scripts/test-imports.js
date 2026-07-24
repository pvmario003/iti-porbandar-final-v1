import 'regenerator-runtime/runtime.js';
import React from 'react';
import path from 'path';

async function testImports() {
  const files = [
    'src/types.ts',
    'src/utils/storage.ts',
    'src/utils/exportUtils.ts',
    'src/utils/supabaseClient.ts',
    'src/components/ItiLogo.tsx',
    'src/components/DashboardStatsCard.tsx',
    'src/components/ImportStudentsModal.tsx',
    'src/components/StudentProfileModal.tsx',
    'src/components/ExitedStudentsList.tsx',
    'src/components/AnalyticsDashboard.tsx',
    'src/components/Login.tsx',
    'src/components/GeneralLetterModule.tsx',
    'src/components/LeaveManagement.tsx',
    'src/components/SupervisorDashboard.tsx',
    'src/components/AdminDashboard.tsx',
    'src/App.tsx',
  ];

  for (const file of files) {
    const absolutePath = path.join(process.cwd(), file);
    try {
      await import(absolutePath);
      console.log(`SUCCESS importing ${file}`);
    } catch (e) {
      console.log(`FAILED importing ${file}:`, e.stack || e.message);
    }
  }
}

testImports();
