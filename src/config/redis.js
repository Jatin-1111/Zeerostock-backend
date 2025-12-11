// // const Redis = require('ioredis');
// require('dotenv').config();

// Redis helper functions (all disabled)
const redisHelpers = {
    async setWithExpiry(key, value, expirySeconds) {
        return null;
    },
    async get(key) {
        return null;
    },
    async delete(key) {
        return null;
    },
    async storeOTP(identifier, otp, expiryMinutes) {
        return null;
    },
    async verifyOTP(identifier, otp) {
        return false;
    },
    async storeRefreshToken(userId, token, expirySeconds) {
        return null;
    },
    async verifyRefreshToken(userId, token) {
        return false;
    },
    async revokeRefreshToken(userId, token) {
        return null;
    },
    async storeResetToken(token, userId, expiryMinutes) {
        return null;
    },
    async verifyResetToken(token) {
        return null;
    }
};

// Mock Redis client
const redisClient = { on: () => { } };

module.exports = { redisClient, redisHelpers };
