/**
 * Customer Identification Utilities
 * 
 * These utilities ensure consistent customer identification across all channels:
 * - ChatWeb, WhatsApp, Instagram, Facebook
 * 
 * Key identifiers (in order of priority):
 * 1. Phone (normalized) - Most reliable cross-platform
 * 2. Email - Secondary identifier
 * 3. CPF (for individuals) - Legal document
 * 4. CNPJ (for businesses) - Legal document
 */

/**
 * Normalize phone number to digits only
 * Handles Brazilian formats with carrier codes, international prefixes, etc.
 * 
 * Examples:
 * - "(99) 99125-3704" → "99991253704"
 * - "+55 99 99125-3704" → "5599991253704"
 * - "99 9 9125-3704" → "99991253704"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove leading zeros (except if it's just "0")
  if (normalized.length > 1 && normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  // If starts with country code 55 (Brazil), keep it
  // If it's 10-11 digits without country code, it's a Brazilian number
  if (normalized.length === 10 || normalized.length === 11) {
    // Brazilian number without country code - keep as is
    return normalized;
  } else if (normalized.length === 12 || normalized.length === 13) {
    // Might have country code
    if (normalized.startsWith('55')) {
      return normalized; // Has country code, keep it
    }
  }
  
  return normalized;
}

/**
 * Normalize CPF to digits only
 * Removes dots, dashes, and validates format
 */
export function normalizeCPF(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const normalized = cpf.replace(/\D/g, '');
  return normalized.length === 11 ? normalized : null;
}

/**
 * Normalize CNPJ to digits only
 * Removes dots, dashes, slashes, and validates format
 */
export function normalizeCNPJ(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const normalized = cnpj.replace(/\D/g, '');
  return normalized.length === 14 ? normalized : null;
}

/**
 * Validate and check CPF digit
 */
export function isValidCPF(cpf: string): boolean {
  const normalized = normalizeCPF(cpf);
  if (!normalized || normalized.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(normalized)) return false; // All same digit
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(normalized.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(normalized.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(normalized.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(normalized.charAt(10))) return false;
  
  return true;
}

/**
 * Validate and check CNPJ digit
 */
export function isValidCNPJ(cnpj: string): boolean {
  const normalized = normalizeCNPJ(cnpj);
  if (!normalized || normalized.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(normalized)) return false;
  
  // Validate first check digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(normalized.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (checkDigit !== parseInt(normalized.charAt(12))) return false;
  
  // Validate second check digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(normalized.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (checkDigit !== parseInt(normalized.charAt(13))) return false;
  
  return true;
}

/**
 * Customer identifiers for searching across channels
 */
export interface CustomerIdentifiers {
  phone?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
}

/**
 * Normalize all customer identifiers
 */
export function normalizeCustomerIdentifiers(data: {
  phone?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
}): CustomerIdentifiers {
  const identifiers: CustomerIdentifiers = {};
  
  if (data.phone) {
    identifiers.phone = normalizePhone(data.phone);
  }
  
  if (data.email) {
    identifiers.email = data.email.toLowerCase().trim();
  }
  
  if (data.cpf) {
    const normalized = normalizeCPF(data.cpf);
    if (normalized && isValidCPF(normalized)) {
      identifiers.cpf = normalized;
    }
  }
  
  if (data.cnpj) {
    const normalized = normalizeCNPJ(data.cnpj);
    if (normalized && isValidCNPJ(normalized)) {
      identifiers.cnpj = normalized;
    }
  }
  
  return identifiers;
}
