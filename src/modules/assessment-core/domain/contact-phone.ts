export const PHONE_DIGITS_BY_DIAL_CODE: Readonly<Record<string, number>> = {
  '1': 10,
  '51': 9,
  '52': 10,
  '53': 8,
  '54': 10,
  '55': 11,
  '56': 9,
  '57': 10,
  '58': 10,
  '591': 8,
  '593': 9,
  '595': 9,
  '598': 8,
  '502': 8,
  '503': 8,
  '504': 8,
  '505': 8,
  '506': 8,
  '507': 8,
  '509': 8,
};

const OTHER_MIN_DIGITS = 8;
const OTHER_MAX_DIGITS = 11;

const CONTACT_PHONE = /^\+(\d{1,4}) (\d+)$/;

export function isValidContactPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = CONTACT_PHONE.exec(value);
  if (!match) return false;
  const [, dialCode, nationalNumber] = match;
  const expected = PHONE_DIGITS_BY_DIAL_CODE[dialCode];
  return expected !== undefined
    ? nationalNumber.length === expected
    : nationalNumber.length >= OTHER_MIN_DIGITS &&
        nationalNumber.length <= OTHER_MAX_DIGITS;
}
