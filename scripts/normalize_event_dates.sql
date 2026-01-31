-- Add a new ISO-safe date column if missing
ALTER TABLE staging_events ADD COLUMN date_iso TEXT;

-- Normalize existing dates into ISO format
UPDATE staging_events
SET date_iso = CASE
  -- Already ISO (YYYY-MM-DD)
  WHEN date GLOB '____-__-__' THEN date

  -- Format like 'Sep 13, 2025' or 'September 13, 2025'
  WHEN date LIKE '% %,%' THEN
    substr('0000' || (
      CASE
        WHEN instr(date, 'Jan')>0 THEN 1
        WHEN instr(date, 'Feb')>0 THEN 2
        WHEN instr(date, 'Mar')>0 THEN 3
        WHEN instr(date, 'Apr')>0 THEN 4
        WHEN instr(date, 'May')>0 THEN 5
        WHEN instr(date, 'Jun')>0 THEN 6
        WHEN instr(date, 'Jul')>0 THEN 7
        WHEN instr(date, 'Aug')>0 THEN 8
        WHEN instr(date, 'Sep')>0 THEN 9
        WHEN instr(date, 'Oct')>0 THEN 10
        WHEN instr(date, 'Nov')>0 THEN 11
        WHEN instr(date, 'Dec')>0 THEN 12
        ELSE 0 END
    ), -2, 2) || '-' ||
    substr('0' || TRIM(substr(date, instr(date, ' '), instr(date, ',')-instr(date,' '))), -2, 2) || '-' ||
    substr(date, -4)

  -- Format like '27/09/25'
  WHEN date GLOB '__/__/*' THEN
    '20' || substr(date, 7, 2) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)

  -- Fallback: copy as-is
  ELSE date
END;
