/**
 * Masks an email address for logging purposes
 * @param {string} email - The email address to mask
 * @returns {string} The masked email address
 */
export function maskEmail(email) {
    if (!email) return 'MISSING';
    const parts = email.split('@');
    if (parts.length !== 2) return 'INVALID_FORMAT';
    const [user, domain] = parts;
    const maskedUser = user.length > 2 ? `${user.substring(0, 2)}***` : `${user}***`;
    return `${maskedUser}@${domain}`;
}
