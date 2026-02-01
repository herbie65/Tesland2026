-- Add missing labor lines for WO26-00004 from planning assignment_text
-- Workorder: 69ccc8bd-e7cb-404d-a7a0-be3c51618fc4
-- Planning: PLN-20260127-115900-772
-- Assignment text: [{"id":"086fe19f-c410-430d-a0e4-3f2551869d46","text":"banden wissel","checked":false},{"id":"e607c81a-3c59-4581-ba57-463cc1d2f10b","text":"test","checked":false}]

INSERT INTO labor_lines (id, work_order_id, description, duration_minutes, user_id, user_name, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '69ccc8bd-e7cb-404d-a7a0-be3c51618fc4', 'banden wissel', 60, 'c87cfdee-d061-40cd-a7ed-7fdcc9daacfe', 'Jurgen', NOW(), NOW()),
  (gen_random_uuid(), '69ccc8bd-e7cb-404d-a7a0-be3c51618fc4', 'test', 60, 'c87cfdee-d061-40cd-a7ed-7fdcc9daacfe', 'Jurgen', NOW(), NOW());
