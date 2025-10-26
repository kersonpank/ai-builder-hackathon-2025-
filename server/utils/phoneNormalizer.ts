/**
 * Phone Normalizer
 * Normalizes Brazilian phone numbers to a consistent format
 */

/**
 * Normalizes a Brazilian phone number to format: DDD + number (only digits)
 * Examples:
 *   "+55 11 98765-4321" -> "11987654321"
 *   "(11) 98765-4321" -> "11987654321"
 *   "011987654321" -> "11987654321"
 *   "5511987654321" -> "11987654321"
 *   "021 11 98765-4321" -> "11987654321" (carrier prefix)
 *   "00 11 98765-4321" -> "11987654321"
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove country code (55) if present at the beginning
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove carrier prefixes (021, 014, 015, 031, etc) - typically 3 digits starting with 0
  // These appear before the area code in some formats
  if (cleaned.length > 11 && cleaned.startsWith('0')) {
    // Check for carrier prefix pattern (0XX where XX are digits)
    const possibleCarrierPrefix = cleaned.substring(0, 3);
    if (/^0\d{2}$/.test(possibleCarrierPrefix)) {
      // Remove the 3-digit carrier prefix
      cleaned = cleaned.substring(3);
    }
  }
  
  // Remove double leading zeros (00) sometimes used for international calling
  while (cleaned.startsWith('00') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove single leading zero from area code if present
  while (cleaned.startsWith('0') && cleaned.length > 11) {
    cleaned = cleaned.substring(1);
  }
  
  // Final format: 11987654321 (DDD + 9-digit mobile or 8-digit landline)
  // Valid lengths: 10 (landline) or 11 (mobile)
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    // If still invalid, try to extract the last 10 or 11 digits
    // This handles edge cases where there might be extra prefixes
    if (cleaned.length > 11) {
      // Take last 11 digits (mobile format)
      cleaned = cleaned.substring(cleaned.length - 11);
    } else if (cleaned.length > 10) {
      // Take last 10 digits (landline format)
      cleaned = cleaned.substring(cleaned.length - 10);
    }
  }
  
  return cleaned;
}

/**
 * Validates if a phone number is valid Brazilian format
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Should be 10 or 11 digits
  if (normalized.length !== 10 && normalized.length !== 11) {
    return false;
  }
  
  // First two digits (area code) should be valid DDD
  const areaCode = parseInt(normalized.substring(0, 2));
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ];
  
  return validDDDs.includes(areaCode);
}

/**
 * Formats a phone for display
 * "11987654321" -> "(11) 98765-4321"
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (normalized.length === 11) {
    // Mobile: (11) 98765-4321
    return `(${normalized.substring(0, 2)}) ${normalized.substring(2, 7)}-${normalized.substring(7)}`;
  } else if (normalized.length === 10) {
    // Landline: (11) 3456-7890
    return `(${normalized.substring(0, 2)}) ${normalized.substring(2, 6)}-${normalized.substring(6)}`;
  }
  
  return phone; // Return original if can't format
}
