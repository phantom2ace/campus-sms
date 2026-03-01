export function normalizeGhanaPhone(input: string): string | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let value = trimmed.replace(/\s+/g, '');
  value = value.replace(/[^+\d]/g, '');

  if (value.startsWith('+233') && value.length === 13) {
    return value;
  }

  // Handle +2330... (length 14) -> strip the 0 after 233
  if (value.startsWith('+2330') && value.length === 14) {
    return `+233${value.slice(5)}`;
  }

  if (value.startsWith('233') && value.length === 12) {
    return `+${value}`;
  }

  // Handle 2330... (length 13) -> strip the 0 after 233
  if (value.startsWith('2330') && value.length === 13) {
    return `+233${value.slice(4)}`;
  }

  // Handle 00233... (length 14) -> treat 00 as +
  if (value.startsWith('00233') && value.length === 14) {
    return `+${value.slice(2)}`;
  }

  if (value.startsWith('0') && value.length === 10) {
    return `+233${value.slice(1)}`;
  }

  if (
    !value.startsWith('+233') &&
    !value.startsWith('233') &&
    !value.startsWith('0') &&
    value.length === 9
  ) {
    return `+233${value}`;
  }

  return null;
}

