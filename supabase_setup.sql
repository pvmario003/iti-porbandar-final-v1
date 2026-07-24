-- ==========================================================
-- ITI Porbandar Production Database Schema & Migration Setup
-- Run this script in your Supabase SQL Editor
-- ==========================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- Helper trigger function to update updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;


-- 2. USERS TABLE
create table if not exists users (
  id text primary key,
  username text unique not null,
  password text not null,
  name text not null,
  role text not null,
  is_active boolean default true,
  supervisor_name_english text,
  supervisor_name_gujarati text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table users enable row level security;
drop policy if exists "Allow public access on users" on users;
create policy "Allow public access on users" on users for all using (true) with check (true);

drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
before update on users
for each row execute procedure update_updated_at_column();


-- 3. PROFILES TABLE
create table if not exists profiles (
  id text primary key,
  user_id text unique references users(id) on delete cascade,
  display_name text,
  avatar_url text,
  language_preference text default 'en',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;
drop policy if exists "Allow public access on profiles" on profiles;
create policy "Allow public access on profiles" on profiles for all using (true) with check (true);

drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at
before update on profiles
for each row execute procedure update_updated_at_column();

create index if not exists idx_profiles_user_id on profiles(user_id);


-- 4. INSTRUCTORS TABLE
create table if not exists instructors (
  id text primary key,
  user_id text unique references users(id) on delete cascade,
  name_english text,
  name_gujarati text,
  designation_english text,
  designation_gujarati text,
  employee_id text,
  mobile text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table instructors enable row level security;
drop policy if exists "Allow public access on instructors" on instructors;
create policy "Allow public access on instructors" on instructors for all using (true) with check (true);

drop trigger if exists update_instructors_updated_at on instructors;
create trigger update_instructors_updated_at
before update on instructors
for each row execute procedure update_updated_at_column();

create index if not exists idx_instructors_user_id on instructors(user_id);


-- 5. TRADES TABLE
create table if not exists trades (
  id text primary key,
  name text not null,
  is_active boolean default true,
  trade_name_english text,
  trade_name_gujarati text,
  seat_capacity integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table trades enable row level security;
drop policy if exists "Allow public access on trades" on trades;
create policy "Allow public access on trades" on trades for all using (true) with check (true);

drop trigger if exists update_trades_updated_at on trades;
create trigger update_trades_updated_at
before update on trades
for each row execute procedure update_updated_at_column();


-- 6. BATCHES TABLE
create table if not exists batches (
  id text primary key,
  trade_name text,
  batch_number text,
  batch_section text,
  display_name text,
  academic_session text,
  year text,
  shift text,
  created_by text,
  created_by_name text,
  status text,
  assigned_si_id text,
  assigned_si_name text,
  capacity integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table batches enable row level security;
drop policy if exists "Allow public access on batches" on batches;
create policy "Allow public access on batches" on batches for all using (true) with check (true);

drop trigger if exists update_batches_updated_at on batches;
create trigger update_batches_updated_at
before update on batches
for each row execute procedure update_updated_at_column();


-- 7. STUDENTS TABLE
create table if not exists students (
  id text primary key,
  student_name text,
  father_name text,
  surname text,
  enrollment_number text unique,
  date_of_birth text,
  gender text,
  trade text,
  batch_id text references batches(id) on delete set null,
  batch_name text,
  academic_session text,
  year text,
  shift text,
  student_mobile_number text,
  parent_mobile_number text,
  address text,
  admission_date text,
  student_photo text,
  current_status text,
  cmd_deposit_number text,
  aadhaar_number text,
  category text,
  admission_year text,
  full_name_english text,
  full_name_gujarati text,
  address_english text,
  address_gujarati text,
  exit_effective_date text,
  exit_outward_number text,
  exit_outward_date text,
  exit_reason text,
  scholarship_type text,
  scholarship_id text,
  scholarship_academic_year text,
  scholarship_status text,
  bank_account_holder_name text,
  bank_name text,
  bank_branch_name text,
  bank_account_number text,
  bank_ifsc_code text,
  documents jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table students enable row level security;
drop policy if exists "Allow public access on students" on students;
create policy "Allow public access on students" on students for all using (true) with check (true);

drop trigger if exists update_students_updated_at on students;
create trigger update_students_updated_at
before update on students
for each row execute procedure update_updated_at_column();

create index if not exists idx_students_batch_id on students(batch_id);


-- 8. STUDENT_BATCHES TABLE (Junction table)
create table if not exists student_batches (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  batch_id text not null references batches(id) on delete cascade,
  assigned_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (student_id, batch_id)
);

alter table student_batches enable row level security;
drop policy if exists "Allow public access on student_batches" on student_batches;
create policy "Allow public access on student_batches" on student_batches for all using (true) with check (true);

drop trigger if exists update_student_batches_updated_at on student_batches;
create trigger update_student_batches_updated_at
before update on student_batches
for each row execute procedure update_updated_at_column();

create index if not exists idx_student_batches_student_id on student_batches(student_id);
create index if not exists idx_student_batches_batch_id on student_batches(batch_id);


-- 9. ATTENDANCE TABLE
create table if not exists attendance (
  id text primary key,
  student_id text references students(id) on delete cascade,
  enrollment_number text,
  student_name text,
  trade text,
  batch_id text,
  batch_name text,
  academic_year text,
  month text,
  working_days integer,
  present_days integer,
  attendance_percentage numeric,
  status text,
  remark text,
  address text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table attendance enable row level security;
drop policy if exists "Allow public access on attendance" on attendance;
create policy "Allow public access on attendance" on attendance for all using (true) with check (true);

drop trigger if exists update_attendance_updated_at on attendance;
create trigger update_attendance_updated_at
before update on attendance
for each row execute procedure update_updated_at_column();

create index if not exists idx_attendance_student_id on attendance(student_id);


-- 10. MONTHLY_ATTENDANCE TABLE
create table if not exists monthly_attendance (
  id text primary key,
  student_id text references students(id) on delete cascade,
  batch_id text references batches(id) on delete cascade,
  academic_year text,
  month text,
  total_working_days integer,
  total_present_days integer,
  attendance_percentage numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table monthly_attendance enable row level security;
drop policy if exists "Allow public access on monthly_attendance" on monthly_attendance;
create policy "Allow public access on monthly_attendance" on monthly_attendance for all using (true) with check (true);

drop trigger if exists update_monthly_attendance_updated_at on monthly_attendance;
create trigger update_monthly_attendance_updated_at
before update on monthly_attendance
for each row execute procedure update_updated_at_column();

create index if not exists idx_monthly_attendance_student_id on monthly_attendance(student_id);
create index if not exists idx_monthly_attendance_batch_id on monthly_attendance(batch_id);


-- 11. DOCUMENTS TABLE
create table if not exists documents (
  id text primary key,
  student_id text references students(id) on delete cascade,
  document_name text,
  document_type text,
  file_url text,
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table documents enable row level security;
drop policy if exists "Allow public access on documents" on documents;
create policy "Allow public access on documents" on documents for all using (true) with check (true);

drop trigger if exists update_documents_updated_at on documents;
create trigger update_documents_updated_at
before update on documents
for each row execute procedure update_updated_at_column();

create index if not exists idx_documents_student_id on documents(student_id);


-- 12. SETTINGS TABLE
create table if not exists settings (
  key text primary key,
  value text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table settings enable row level security;
drop policy if exists "Allow public access on settings" on settings;
create policy "Allow public access on settings" on settings for all using (true) with check (true);

drop trigger if exists update_settings_updated_at on settings;
create trigger update_settings_updated_at
before update on settings
for each row execute procedure update_updated_at_column();


-- 13. WORKING DAYS TABLE
create table if not exists working_days (
  id text primary key,
  academic_year text,
  month text,
  working_days integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table working_days enable row level security;
drop policy if exists "Allow public access on working_days" on working_days;
create policy "Allow public access on working_days" on working_days for all using (true) with check (true);

drop trigger if exists update_working_days_updated_at on working_days;
create trigger update_working_days_updated_at
before update on working_days
for each row execute procedure update_updated_at_column();


-- 14. AUDIT LOGS TABLE
create table if not exists audit_logs (
  id text primary key,
  user_name text,
  action text,
  date text,
  time text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table audit_logs enable row level security;
drop policy if exists "Allow public access on audit_logs" on audit_logs;
create policy "Allow public access on audit_logs" on audit_logs for all using (true) with check (true);

drop trigger if exists update_audit_logs_updated_at on audit_logs;
create trigger update_audit_logs_updated_at
before update on audit_logs
for each row execute procedure update_updated_at_column();


-- 15. LETTERS TABLE
create table if not exists letters (
  id text primary key,
  template_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table letters enable row level security;
drop policy if exists "Allow public access on letters" on letters;
create policy "Allow public access on letters" on letters for all using (true) with check (true);

drop trigger if exists update_letters_updated_at on letters;
create trigger update_letters_updated_at
before update on letters
for each row execute procedure update_updated_at_column();


-- 16. GENERAL LETTERS TABLE
create table if not exists general_letters (
  id text primary key,
  template_name text,
  institute_name text,
  si_name text,
  designation text,
  date text,
  recipient text,
  subject text,
  body text,
  closing text,
  signature text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table general_letters enable row level security;
drop policy if exists "Allow public access on general_letters" on general_letters;
create policy "Allow public access on general_letters" on general_letters for all using (true) with check (true);

drop trigger if exists update_general_letters_updated_at on general_letters;
create trigger update_general_letters_updated_at
before update on general_letters
for each row execute procedure update_updated_at_column();


-- 17. ASSIGNMENT HISTORY TABLE
create table if not exists assignment_history (
  id text primary key,
  batch_id text,
  batch_name text,
  previous_si_id text,
  previous_si_name text,
  new_si_id text,
  new_si_name text,
  assigned_by text,
  transfer_date text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table assignment_history enable row level security;
drop policy if exists "Allow public access on assignment_history" on assignment_history;
create policy "Allow public access on assignment_history" on assignment_history for all using (true) with check (true);

drop trigger if exists update_assignment_history_updated_at on assignment_history;
create trigger update_assignment_history_updated_at
before update on assignment_history
for each row execute procedure update_updated_at_column();


-- 18. PROMOTIONS TABLE
create table if not exists promotions (
  id text primary key,
  student_id text,
  student_name text,
  enrollment_number text,
  old_trade text,
  old_batch_id text,
  old_batch_name text,
  new_trade text,
  new_batch_id text,
  new_batch_name text,
  old_year text,
  new_year text,
  old_shift text,
  new_shift text,
  promotion_date text,
  promoted_by text,
  is_reversed boolean default false,
  reversed_date text,
  reversed_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table promotions enable row level security;
drop policy if exists "Allow public access on promotions" on promotions;
create policy "Allow public access on promotions" on promotions for all using (true) with check (true);

drop trigger if exists update_promotions_updated_at on promotions;
create trigger update_promotions_updated_at
before update on promotions
for each row execute procedure update_updated_at_column();


-- 19. STUDENT STATUS HISTORY TABLE
create table if not exists student_status_history (
  id text primary key,
  student_id text,
  student_name text,
  enrollment_number text,
  previous_status text,
  new_status text,
  effective_date text,
  outward_number text,
  outward_date text,
  reason text,
  changed_by text,
  changed_date text,
  changed_time text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table student_status_history enable row level security;
drop policy if exists "Allow public access on student_status_history" on student_status_history;
create policy "Allow public access on student_status_history" on student_status_history for all using (true) with check (true);

drop trigger if exists update_student_status_history_updated_at on student_status_history;
create trigger update_student_status_history_updated_at
before update on student_status_history
for each row execute procedure update_updated_at_column();


-- 20. SI PROFILES TABLE
create table if not exists si_profiles (
  id text primary key,
  user_id text unique,
  name_english text,
  name_gujarati text,
  designation_english text,
  designation_gujarati text,
  office_english text,
  office_gujarati text,
  department_english text,
  department_gujarati text,
  employee_id text,
  mobile text,
  address_english text,
  address_gujarati text,
  salary text,
  band_pay text,
  grade_pay text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table si_profiles enable row level security;
drop policy if exists "Allow public access on si_profiles" on si_profiles;
create policy "Allow public access on si_profiles" on si_profiles for all using (true) with check (true);

drop trigger if exists update_si_profiles_updated_at on si_profiles;
create trigger update_si_profiles_updated_at
before update on si_profiles
for each row execute procedure update_updated_at_column();


-- 21. LEAVE APPLICATIONS TABLE
create table if not exists leave_applications (
  id text primary key,
  user_id text,
  profile_id text,
  name_english text,
  name_gujarati text,
  designation_english text,
  designation_gujarati text,
  office_english text,
  office_gujarati text,
  department_english text,
  department_gujarati text,
  employee_id text,
  mobile text,
  address_english text,
  address_gujarati text,
  salary text,
  leave_type text,
  custom_leave_type text,
  from_date text,
  to_date text,
  total_days integer,
  leave_reason text,
  custom_leave_reason text,
  address_during_leave_english text,
  address_during_leave_gujarati text,
  outward_number text,
  outward_date text,
  letter_date text,
  recipient_english text,
  recipient_gujarati text,
  subject_english text,
  subject_gujarati text,
  status text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table leave_applications enable row level security;
drop policy if exists "Allow public access on leave_applications" on leave_applications;
create policy "Allow public access on leave_applications" on leave_applications for all using (true) with check (true);

drop trigger if exists update_leave_applications_updated_at on leave_applications;
create trigger update_leave_applications_updated_at
before update on leave_applications
for each row execute procedure update_updated_at_column();


-- 22. SCHOLARSHIP TABLE
create table if not exists scholarship (
  id text primary key,
  student_id text references students(id) on delete cascade,
  scholarship_type text,
  scholarship_id_number text,
  scholarship_academic_year text,
  scholarship_status text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table scholarship enable row level security;
drop policy if exists "Allow public access on scholarship" on scholarship;
create policy "Allow public access on scholarship" on scholarship for all using (true) with check (true);

drop trigger if exists update_scholarship_updated_at on scholarship;
create trigger update_scholarship_updated_at
before update on scholarship
for each row execute procedure update_updated_at_column();


-- 23. LETTER REPORT DRAFTS TABLE
create table if not exists letter_report_drafts (
  id text primary key,
  template_id text,
  draft_name text,
  last_saved_at text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table letter_report_drafts enable row level security;
drop policy if exists "Allow public access on letter_report_drafts" on letter_report_drafts;
create policy "Allow public access on letter_report_drafts" on letter_report_drafts for all using (true) with check (true);

drop trigger if exists update_letter_report_drafts_updated_at on letter_report_drafts;
create trigger update_letter_report_drafts_updated_at
before update on letter_report_drafts
for each row execute procedure update_updated_at_column();


-- 24. SYSTEM SETTINGS TABLE (Monthly Report Manual Entries, Snapshots, Configuration)
create table if not exists system_settings (
  key text primary key,
  value jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table system_settings enable row level security;
drop policy if exists "Allow public access on system_settings" on system_settings;
create policy "Allow public access on system_settings" on system_settings for all using (true) with check (true);

drop trigger if exists update_system_settings_updated_at on system_settings;
create trigger update_system_settings_updated_at
before update on system_settings
for each row execute procedure update_updated_at_column();


-- 25. STORAGE BUCKETS & POLICIES SETUP
insert into storage.buckets (id, name, public) 
values 
  ('student-photos', 'student-photos', true),
  ('student-documents', 'student-documents', true),
  ('letter-files', 'letter-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access student-photos" on storage.objects;
create policy "Public Access student-photos" on storage.objects for select using (bucket_id = 'student-photos');
drop policy if exists "Public Insert student-photos" on storage.objects;
create policy "Public Insert student-photos" on storage.objects for insert with check (bucket_id = 'student-photos');
drop policy if exists "Public Update student-photos" on storage.objects;
create policy "Public Update student-photos" on storage.objects for update with check (bucket_id = 'student-photos');
drop policy if exists "Public Delete student-photos" on storage.objects;
create policy "Public Delete student-photos" on storage.objects for delete using (bucket_id = 'student-photos');

drop policy if exists "Public Access student-documents" on storage.objects;
create policy "Public Access student-documents" on storage.objects for select using (bucket_id = 'student-documents');
drop policy if exists "Public Insert student-documents" on storage.objects;
create policy "Public Insert student-documents" on storage.objects for insert with check (bucket_id = 'student-documents');
drop policy if exists "Public Update student-documents" on storage.objects;
create policy "Public Update student-documents" on storage.objects for update with check (bucket_id = 'student-documents');
drop policy if exists "Public Delete student-documents" on storage.objects;
create policy "Public Delete student-documents" on storage.objects for delete using (bucket_id = 'student-documents');

drop policy if exists "Public Access letter-files" on storage.objects;
create policy "Public Access letter-files" on storage.objects for select using (bucket_id = 'letter-files');
drop policy if exists "Public Insert letter-files" on storage.objects;
create policy "Public Insert letter-files" on storage.objects for insert with check (bucket_id = 'letter-files');
drop policy if exists "Public Update letter-files" on storage.objects;
create policy "Public Update letter-files" on storage.objects for update with check (bucket_id = 'letter-files');
drop policy if exists "Public Delete letter-files" on storage.objects;
create policy "Public Delete letter-files" on storage.objects for delete using (bucket_id = 'letter-files');


-- 26. GENERATED REPORTS TABLE (Report History Module)
create table if not exists generated_reports (
  id text primary key,
  report_type text not null,
  report_name text not null,
  generated_at text,
  trade text,
  batch text,
  month text,
  academic_session text,
  generated_by text,
  generated_by_role text,
  data_snapshot jsonb default '{}'::jsonb,
  file_type text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table generated_reports enable row level security;
drop policy if exists "Allow public access on generated_reports" on generated_reports;
create policy "Allow public access on generated_reports" on generated_reports for all using (true) with check (true);

drop trigger if exists update_generated_reports_updated_at on generated_reports;
create trigger update_generated_reports_updated_at
before update on generated_reports
for each row execute procedure update_updated_at_column();

