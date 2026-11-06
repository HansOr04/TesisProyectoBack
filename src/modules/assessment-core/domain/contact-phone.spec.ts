import { isValidContactPhone } from './contact-phone';

describe('isValidContactPhone', () => {
  it('exige los dígitos del país según el prefijo', () => {
    expect(isValidContactPhone('+593 991234567')).toBe(true);
    expect(isValidContactPhone('+51 912345678')).toBe(true);
    expect(isValidContactPhone('+57 3123456789')).toBe(true);
    expect(isValidContactPhone('+591 71234567')).toBe(true);
  });

  it('rechaza un número con más o menos dígitos que su país', () => {
    expect(isValidContactPhone('+593 9912345678')).toBe(false);
    expect(isValidContactPhone('+57 312345678')).toBe(false);
    expect(isValidContactPhone('+591 712345678')).toBe(false);
  });

  it('rechaza lo que no tiene el formato "+<prefijo> <número>"', () => {
    expect(isValidContactPhone('0991234567')).toBe(false);
    expect(isValidContactPhone('+593991234567')).toBe(false);
    expect(isValidContactPhone('+593 99-123-4567')).toBe(false);
    expect(isValidContactPhone(593991234567)).toBe(false);
  });

  it('acepta de 8 a 11 dígitos con un prefijo fuera de la tabla', () => {
    expect(isValidContactPhone('+34 612345678')).toBe(true);
    expect(isValidContactPhone('+34 6123456')).toBe(false);
  });
});
