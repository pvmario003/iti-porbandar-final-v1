-- Migration Script: Restore Student Category Support
-- Description: Ensures the 'category', 'aadhaar_number', and 'admission_year' columns exist on the 'students' table.
-- Instructions: Run this SQL query in your Supabase SQL Editor if columns do not exist.

ALTER TABLE students ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_year TEXT;

-- Verify migration success
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND column_name IN ('category', 'aadhaar_number', 'admission_year');
