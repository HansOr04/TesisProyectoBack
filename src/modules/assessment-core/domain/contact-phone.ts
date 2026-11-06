// Teléfono de contacto de una organización evaluada: "+<prefijo> <número
// nacional>", como lo arma el asistente del frontend. La cantidad de dígitos
// del número nacional (celular, sin el 0 de marcación nacional) depende del
// país: con 9 fijos para todos, un celular de Colombia (10) no se podía
// registrar. Misma tabla que LATAM_COUNTRIES en el asistente.
export const PHONE_DIGITS_BY_DIAL_CODE: Readonly<Record<string, number>> = {
  '1': 10, // República Dominicana
  '51': 9, // Perú
  '52': 10, // México
  '53': 8, // Cuba
  '54': 10, // Argentina
  '55': 11, // Brasil
  '56': 9, // Chile
  '57': 10, // Colombia
  '58': 10, // Venezuela
  '591': 8, // Bolivia
  '593': 9, // Ecuador
  '595': 9, // Paraguay
  '598': 8, // Uruguay
  '502': 8, // Guatemala
  '503': 8, // El Salvador
  '504': 8, // Honduras
  '505': 8, // Nicaragua
  '506': 8, // Costa Rica
  '507': 8, // Panamá
  '509': 8, // Haití
};

// Un prefijo que no está en la tabla (un cliente de la API, no el asistente)
// se acepta con el largo de un número nacional cualquiera de la región.
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
