import * as XLSX from 'xlsx';

export type ExcelContactRow = {
  phone: string;
  segmentName: string;
  name?: string;
  fullName?: string;
  level?: string;
  ministryName?: string;
  dateOfBirth?: Date;
};

export async function parseExcelContacts(
  file: Blob
): Promise<ExcelContactRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    raw: true,
  });

  if (!rows.length) {
    return [];
  }

  const headerRow = rows[0] as (string | number)[];
  const dataRows = rows.slice(1);
  const results: ExcelContactRow[] = [];

  // Check for "Name" + "Phone" pattern to detect Row-Based format
  const lowerHeaders = headerRow.map(h => String(h).toLowerCase());
  
  const nameIndex = lowerHeaders.findIndex(h => 
    h.includes('name') && !h.includes('segment') && !h.includes('level') && !h.includes('full')
  );

  const fullNameIndex = lowerHeaders.findIndex(h => 
    h.includes('full name') || h.includes('fullname')
  );
  
  // Look for phone column (phone, contact, mobile, or just 'number')
  // Avoid 'index number' or 'level' if possible, though 'number' is tricky.
  // Best to look for 'phone', 'contact', 'mobile'.
  const phoneIndex = lowerHeaders.findIndex(h => 
    h.includes('phone') || h.includes('contact') || h.includes('mobile')
  );

  const dobIndex = lowerHeaders.findIndex(h => 
    h.includes('date of birth') || h.includes('dob') || h.includes('birth date') || h.includes('birthday') || h.includes('birthdate') || h.includes('bday')
  );

  const levelIndex = lowerHeaders.findIndex(h => h.includes('level') || h.includes('year') || h.includes('grade'));
  const segmentIndex = lowerHeaders.findIndex(h => h.includes('segment') || h.includes('group'));
  const ministryIndex = lowerHeaders.findIndex(h => h.includes('ministry') || h.includes('department'));

  // If we found Name OR Full Name, and Phone column, assume Row-Based Mode
  // AND if the phone column is NOT the same as the name column
  if ((nameIndex !== -1 || fullNameIndex !== -1) && phoneIndex !== -1 && nameIndex !== phoneIndex) {
    for (const row of dataRows) {
      const cells = row as (string | number | null | Date)[];
      
      const rawName = nameIndex !== -1 ? cells[nameIndex] : undefined;
      const rawFullName = fullNameIndex !== -1 ? cells[fullNameIndex] : undefined;
      const rawPhone = cells[phoneIndex];

      if (!rawPhone) continue;

      const name = rawName ? String(rawName).trim() : undefined;
      const fullName = rawFullName ? String(rawFullName).trim() : undefined;
      const phone = String(rawPhone);

      let dateOfBirth: Date | undefined;
      if (dobIndex !== -1) {
        const rawDob = cells[dobIndex];
        if (rawDob instanceof Date) {
          dateOfBirth = rawDob;
        } else if (typeof rawDob === 'number') {
           // Excel serial date to JS Date
           // (value - 25569) * 86400 * 1000
           // Excel dates are days since 1900-01-01 (approx 25569 days before 1970-01-01)
           // Check reasonable range: 10000 (1927) to 60000 (2064)
           if (rawDob > 10000 && rawDob < 60000) {
             const jsDate = new Date((rawDob - 25569) * 86400 * 1000);
             if (!isNaN(jsDate.getTime())) {
               dateOfBirth = jsDate;
             }
           }
        } 
        
        if (!dateOfBirth && rawDob) {
          // Try parsing string/number dates
          const dateStr = String(rawDob);
          
          // Clean up date string (remove ordinal suffixes like 1st, 2nd, 3rd, 4th)
          // Also handle dots/slashes if mixed? No, regex handles that.
          const cleanDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

          // First, try direct JS date parsing (works for ISO, MM/DD/YYYY in US locale, etc.)
          let parsedDate = new Date(cleanDateStr);
          
          // If the string doesn't look like it has a 4-digit year, and the parsed date is valid,
          // override the year to a leap year (2000) to handle Feb 29 safely and avoid defaulting to current year.
          if (!isNaN(parsedDate.getTime()) && !/\d{4}/.test(cleanDateStr)) {
             parsedDate.setFullYear(2000);
          }
          
          // If invalid or if we suspect DD/MM/YYYY format which JS might fail on or parse incorrectly as MM/DD/YYYY
          // Check for common DD/MM/YYYY or DD-MM-YYYY patterns
          // Regex for D/M/YYYY or DD/MM/YYYY (or with dashes/dots)
          const dmyMatch = cleanDateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
          
          if (dmyMatch) {
            const part1 = parseInt(dmyMatch[1], 10);
            const part2 = parseInt(dmyMatch[2], 10);
            const part3 = parseInt(dmyMatch[3], 10);
            
            // Assume DD/MM/YYYY first (International/Ghana format)
            // Check if 2nd part is a valid month (1-12) and 1st part is a valid day (1-31)
            if (part2 >= 1 && part2 <= 12 && part1 >= 1 && part1 <= 31) {
               parsedDate = new Date(part3, part2 - 1, part1);
            } 
            // If not, maybe MM/DD/YYYY? (e.g. 12/25/2000 where 25 is definitely day)
            else if (part1 >= 1 && part1 <= 12 && part2 >= 1 && part2 <= 31) {
               parsedDate = new Date(part3, part1 - 1, part2);
            }
          } else {
            // Check for DD/MM or DD-MM (no year)
            // Default to year 2000 (Leap year) to safely handle Feb 29
            const dmMatch = cleanDateStr.match(/^(\d{1,2})[-/.](\d{1,2})$/);
            const DEFAULT_YEAR = 2000;

            if (dmMatch) {
              const p1 = parseInt(dmMatch[1], 10);
              const p2 = parseInt(dmMatch[2], 10);
              
              // Assume DD/MM
              if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
                 parsedDate = new Date(DEFAULT_YEAR, p2 - 1, p1);
              }
              // If invalid DD/MM, try MM/DD
              else if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
                 parsedDate = new Date(DEFAULT_YEAR, p1 - 1, p2);
              }
            } else {
              // Check for "D MMM" or "MMM D" without year
              // Try appending year to string to help Date.parse
              const withYear = `${cleanDateStr} ${DEFAULT_YEAR}`;
              const d = new Date(withYear);
              if (!isNaN(d.getTime())) {
                  parsedDate = d;
              }
            }
          }
          
          if (!isNaN(parsedDate.getTime())) {
            dateOfBirth = parsedDate;
          }
        }
      }

      let level: string | undefined;
      if (levelIndex !== -1) {
        const rawLevel = cells[levelIndex];
        if (rawLevel) level = String(rawLevel).trim();
      }

      let ministryName: string | undefined;
      if (ministryIndex !== -1) {
        const rawMin = cells[ministryIndex];
        if (rawMin) ministryName = String(rawMin).trim();
      }

      // Default segment to "Members" or try to find a "Segment" column
      let segmentName = 'Members';
      
      if (segmentIndex !== -1) {
         const rawSeg = cells[segmentIndex];
         if (rawSeg) segmentName = String(rawSeg).trim();
      } else if (level) {
        // Fallback: use Level as segment name if no explicit segment column
        // This keeps backward compatibility where Level was treated as Segment
        // But also saves specific Level field
        // segmentName = `Level ${level}`; // Optional: customize segment name
      }

      results.push({
        phone,
        name,
        fullName,
        segmentName,
        level,
        ministryName,
        dateOfBirth
      });
    }
    return results;
  }

  // Fallback to existing Column-Based Mode
  for (const row of dataRows) {
    const cells = row as (string | number | null)[];
    for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
      const segmentNameRaw = headerRow[colIndex];
      const segmentName =
        typeof segmentNameRaw === 'number'
          ? String(segmentNameRaw)
          : segmentNameRaw;
      
      if (!segmentName) {
        continue;
      }

      // Skip columns that are explicitly for emergency contacts
      // or other non-segment data if needed.
      const lowerName = String(segmentName).toLowerCase();
      if (lowerName.includes('emergency')) {
        continue;
      }

      const cell = cells[colIndex];
      if (cell === null || cell === undefined || cell === '') {
        continue;
      }
      const phone =
        typeof cell === 'number'
          ? String(cell)
          : Array.isArray(cell)
          ? String(cell[0])
          : String(cell);
      results.push({
        phone,
        segmentName: String(segmentName),
      });
    }
  }

  return results;
}

