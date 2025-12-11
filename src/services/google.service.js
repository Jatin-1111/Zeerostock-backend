const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuthService = {
    /**
     * Verify Google OAuth token
     */
    async verifyToken(token) {
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            return {
                success: true,
                data: {
                    googleId: payload.sub,
                    email: payload.email,
                    firstName: payload.given_name || '',
                    lastName: payload.family_name || '',
                    emailVerified: payload.email_verified
                }
            };
        } catch (error) {
            console.error('Google token verification error:', error);
            return {
                success: false,
                error: 'Invalid Google token'
            };
        }
    }
};

module.exports = googleAuthService;
