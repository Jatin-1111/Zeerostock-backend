/**
 * Credential generation utilities for admin users
 */

/**
 * Generate a unique 6-digit alphanumeric Admin ID
 * Format: A3X7K9 (always starts with 'A', followed by 5 random alphanumeric chars)
 */
function generateAdminId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars (I, O, 0, 1)
    let adminId = 'A'; // Always start with 'A' for Admin

    for (let i = 0; i < 5; i++) {
        adminId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return adminId;
}

/**
 * Generate a secure temporary password
 * Format: Temp@A3X7K9 (includes uppercase, lowercase, number, special char)
 * @param {string} adminId - The admin ID to incorporate into password
 */
function generateTempPassword(adminId) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '@#$%&*';

    // Create a password that includes the adminId for memorability
    // Format: Temp@[AdminId]
    return `Temp@${adminId}`;
}

/**
 * Generate a more complex secure password (optional)
 * @param {number} length - Password length (default: 12)
 */
function generateSecurePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '@#$%&*!';
    const allChars = lowercase + uppercase + numbers + special;

    let password = '';

    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculate credential expiry time
 * @param {number} hours - Hours until expiry (default: 24)
 */
function calculateExpiryTime(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Check if credentials have expired
 * @param {string} expiryDate - ISO date string
 */
function areCredentialsExpired(expiryDate) {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
}

/**
 * Format time remaining until expiry
 * @param {string} expiryDate - ISO date string
 */
function getTimeUntilExpiry(expiryDate) {
    if (!expiryDate) return null;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
    }

    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

module.exports = {
    generateAdminId,
    generateTempPassword,
    generateSecurePassword,
    validatePasswordStrength,
    calculateExpiryTime,
    areCredentialsExpired,
    getTimeUntilExpiry
};
