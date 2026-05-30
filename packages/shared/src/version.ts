/**
 * Single source of truth for the CyberCoder version + branding strings.
 * Bumped by the release pipeline (M14).
 *
 * Note: internal npm package scopes remain `@cybermind/*` to avoid churning
 * every import path; only the user-facing display name is "CyberCoder".
 */
export const CYBERMIND_VERSION = '0.1.22';
export const CYBERMIND_NAME = 'CyberCoder';
export const CYBERMIND_TAGLINE = 'Fullstack agentic coding CLI';
export const CYBERMIND_HOMEPAGE = 'https://cybermindcli.info';

// Friendly aliases (preferred in new code).
export const CYBERCODER_VERSION = CYBERMIND_VERSION;
export const CYBERCODER_NAME = CYBERMIND_NAME;
export const CYBERCODER_TAGLINE = CYBERMIND_TAGLINE;
