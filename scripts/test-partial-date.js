
const dates = [
  '25/12',
  '12/25', // ambiguous if only numbers, but usually DD/MM in this context? Or MM/DD?
  '25-12',
  'Dec 25',
  '25 Dec',
  '25th Dec',
  'Dec 25th',
  '25 December',
  'December 25',
  '25/12/2000' // full date for control
];

const DEFAULT_YEAR = 2000;

dates.forEach(dateStr => {
  // Clean up ordinal suffixes
  const cleanDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  let parsedDate;

  // Check for DD/MM or DD-MM (assuming DD first if > 12, else ambiguous but let's assume DD/MM for Ghana/Intl)
  const dmMatch = cleanDateStr.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  
  if (dmMatch) {
    const p1 = parseInt(dmMatch[1], 10);
    const p2 = parseInt(dmMatch[2], 10);
    
    // Assume DD/MM
    // Valid day p1 (1-31), Valid month p2 (1-12)
    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
       parsedDate = new Date(DEFAULT_YEAR, p2 - 1, p1);
    }
    // If invalid DD/MM (e.g. 12/25), try MM/DD
    else if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
       parsedDate = new Date(DEFAULT_YEAR, p1 - 1, p2);
    }
  } 
  
  // Check for "D MMM" or "MMM D"
  // Needs to handle "25 Dec", "Dec 25"
  if (!parsedDate) {
      // Append year to help Date.parse
      const withYear = `${cleanDateStr} ${DEFAULT_YEAR}`;
      const d = new Date(withYear);
      if (!isNaN(d.getTime())) {
          parsedDate = d;
      }
  }

  console.log(`"${dateStr}" -> "${cleanDateStr}" -> ${parsedDate ? parsedDate.toDateString() : 'Invalid'}`);
});
