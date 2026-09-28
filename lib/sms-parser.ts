export type ParsedSmsTransaction = {
  type: "expense" | "income";
  amount: number;
  merchant: string | null;
};

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/i;
// Fallback for banks that state a bare number right after the verb with no currency symbol at
// all, e.g. "A/C X1234 debited by 500.0 on date...".
const AMOUNT_AFTER_VERB_RE = /\b(?:debited|credited|spent|paid|received)\s+(?:by|with)?\s*(?:rs\.?|inr|₹)?\s?([\d,]+(?:\.\d{1,2})?)/i;

// Words that mean "money left the account" vs "money arrived" — checked in this order so a
// message mentioning both (rare) resolves to whichever the bank actually led with.
const DEBIT_WORDS = /\b(debited|spent|paid|sent|withdrawn|debit)\b/i;
const CREDIT_WORDS = /\b(credited|received|credit)\b/i;

// Disqualifies obvious non-transaction alerts: promos, OTPs, future-tense "will be", and
// anything with a link (real bank transaction alerts essentially never include one).
const REJECT_RE = /(will be (debited|credited)|otp|one time password|cashback offer|click here|https?:\/\/|apply now|pre-?approved|congratulations|win|lottery|limit increased|unbilled)/i;

const MERCHANT_PATTERNS = [
  /(?:to|at|towards|from)\s+vpa\s+([a-z0-9.\-_@]+)/i,
  /vpa\s+([a-z0-9.\-_@]+)\s+(?:credited|debited)/i,
  /trf to\s+([a-z0-9 .\-_&]+?)(?:\s+refno|\s+ref no|\.|,|$)/i,
  /towards upi\/([a-z0-9.\-_@]+)/i,
  /\bat\s+([a-z0-9 .\-_&]+?)(?:\s+on\s|\s+via\s|\.|,|$)/i,
  /\bto\s+([a-z0-9 .\-_&@]+?)(?:\s+on\s|\s+via\s|\s+ref|\.|,|$)/i,
  /\bfrom\s+([a-z0-9 .\-_&@]+?)(?:\s+on\s|\s+via\s|\s+ref|\.|,|$)/i,
];

function cleanMerchant(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 40) return null;
  // A bare UPI handle like "merchant@ybl" reads better without the bank suffix.
  const atIndex = trimmed.indexOf("@");
  const name = atIndex > 0 ? trimmed.slice(0, atIndex) : trimmed;
  return name.length > 0 ? name : null;
}

/**
 * Best-effort parse of a single SMS body into a transaction. Deliberately conservative — returns
 * null rather than guess when the message doesn't clearly look like a completed debit/credit
 * alert, since a wrongly auto-saved transaction is worse than a skipped one.
 */
export function parseTransactionSms(body: string): ParsedSmsTransaction | null {
  if (!body) return null;
  if (REJECT_RE.test(body)) return null;

  const amountMatch = body.match(AMOUNT_RE) ?? body.match(AMOUNT_AFTER_VERB_RE);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const debitMatch = body.match(DEBIT_WORDS);
  const creditMatch = body.match(CREDIT_WORDS);
  let type: "expense" | "income";
  if (debitMatch && creditMatch) {
    type = debitMatch.index! <= creditMatch.index! ? "expense" : "income";
  } else if (debitMatch) {
    type = "expense";
  } else if (creditMatch) {
    type = "income";
  } else {
    return null;
  }

  let merchant: string | null = null;
  for (const pattern of MERCHANT_PATTERNS) {
    const m = body.match(pattern);
    if (m) {
      merchant = cleanMerchant(m[1]);
      if (merchant) break;
    }
  }

  return { type, amount, merchant };
}

/** Sender-ID heuristic to skip obviously irrelevant SMS before even attempting to parse the body
 *  — most Indian bank/UPI alerts come from short alphanumeric codes like "HDFCBK", "VM-ICICIB",
 *  "AD-SBIINB", not a full phone number. Falls through to the body-based parse either way, so a
 *  message from an unrecognized sender still gets a chance if it clearly reads as a transaction. */
export function looksLikeBankSender(address: string): boolean {
  const cleaned = address.replace(/[^A-Za-z]/g, "");
  return cleaned.length >= 4 && cleaned.length <= 10 && /^[A-Za-z]+$/.test(cleaned);
}
