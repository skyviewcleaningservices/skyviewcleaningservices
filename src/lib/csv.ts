// Minimal RFC4126-ish CSV parser: handles quoted fields, escaped quotes ("")
// inside them, and commas/newlines embedded within quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      // skip — paired \n (if any) handles the row break
    } else {
      field += char;
    }
  }

  // Trailing field/row (file may or may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

// Normalizes a header cell for flexible matching: "Mobile Number" -> "mobile number"
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
