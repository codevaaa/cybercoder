export const SECRET_PATTERNS = [
  // AWS
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  // GitHub
  { name: 'GitHub Token', regex: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/g },
  // Stripe
  { name: 'Stripe Secret Key', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
  // Generic / OpenAI API Key
  { name: 'Generic API Key (sk-...)', regex: /sk-[a-zA-Z0-9-]{32,64}/g },
  // Codeva / CyberCoder API Key
  { name: 'CyberCoder API Key', regex: /sk_cyber_[a-zA-Z0-9]{24,64}/g },
  // Google / GCP
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
  // RSA Private Key
  { name: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----(?:.|\n)*?-----END RSA PRIVATE KEY-----/g }
];

export class SecretScanner {
  /**
   * Scans text for secrets and returns a list of detected secret names.
   * Useful for blocking operations (like file writes or git commits).
   */
  static scan(text: string): string[] {
    if (!text) return [];
    const detected: Set<string> = new Set();
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(text)) {
        detected.add(pattern.name);
      }
      // Reset lastIndex because of /g
      pattern.regex.lastIndex = 0;
    }
    return Array.from(detected);
  }

  /**
   * Redacts secrets from the given text.
   * Replaces them with `***[REDACTED <SecretName>]***`
   */
  static redact(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let redactedText = text;
    for (const pattern of SECRET_PATTERNS) {
      redactedText = redactedText.replace(pattern.regex, `***[REDACTED ${pattern.name}]***`);
    }
    return redactedText;
  }
}
