/**
 * Brazilian Document Validator
 * Validates and normalizes CPF and CNPJ
 */

/**
 * Normalizes CPF to only digits
 * "123.456.789-01" -> "12345678901"
 */
export function normalizeCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

/**
 * Normalizes CNPJ to only digits
 * "12.345.678/0001-90" -> "12345678000190"
 */
export function normalizeCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

/**
 * Validates CPF using check digits algorithm
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = normalizeCPF(cpf);
  
  // Must have 11 digits
  if (cleaned.length !== 11) return false;
  
  // Cannot be all same digit
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate check digits
  let sum = 0;
  let remainder;
  
  // First check digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  // Second check digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}

/**
 * Validates CNPJ using check digits algorithm
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = normalizeCNPJ(cnpj);
  
  // Must have 14 digits
  if (cleaned.length !== 14) return false;
  
  // Cannot be all same digit
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validate check digits
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  // First check digit
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Second check digit
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Formats CPF for display
 * "12345678901" -> "123.456.789-01"
 */
export function formatCPF(cpf: string): string {
  const cleaned = normalizeCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formats CNPJ for display
 * "12345678000190" -> "12.345.678/0001-90"
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = normalizeCNPJ(cnpj);
  if (cleaned.length !== 14) return cnpj;
  
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Auto-detects and validates either CPF or CNPJ
 */
export function validateDocument(document: string): { type: 'cpf' | 'cnpj' | 'invalid', valid: boolean } {
  const cleaned = document.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return {
      type: 'cpf',
      valid: validateCPF(cleaned)
    };
  } else if (cleaned.length === 14) {
    return {
      type: 'cnpj',
      valid: validateCNPJ(cleaned)
    };
  }
  
  return {
    type: 'invalid',
    valid: false
  };
}
