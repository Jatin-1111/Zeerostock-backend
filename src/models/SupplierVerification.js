const { query: db } = require('../config/database');

class SupplierVerification {
    /**
     * Save verification draft (auto-save feature)
     * @param {string} userId - User ID
     * @param {Object} stepData - Form data from current step
     * @param {number} currentStep - Current step number (1, 2, or 3)
     * @returns {Promise<Object>} Saved draft object
     */
    static async saveDraft(userId, stepData, currentStep) {
        const query = `
      INSERT INTO verification_drafts (user_id, step_data, current_step, last_saved_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        step_data = verification_drafts.step_data || EXCLUDED.step_data,
        current_step = EXCLUDED.current_step,
        last_saved_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
        const result = await db(query, [userId, JSON.stringify(stepData), currentStep]);
        return result.rows[0];
    }

    /**
     * Get verification draft
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Draft object or null
     */
    static async getDraft(userId) {
        const query = `
      SELECT user_id, step_data, current_step, last_saved_at, created_at
      FROM verification_drafts
      WHERE user_id = $1
    `;
        const result = await db(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Submit complete verification
     * @param {string} userId - User ID
     * @param {Object} data - Complete verification data
     * @returns {Promise<Object>} Created verification object
     */
    static async submit(userId, data) {
        const query = `
      INSERT INTO supplier_verifications (
        user_id,
        owner_full_name, government_id_type, government_id_number,
        government_id_document_url, proof_of_address_document_url,
        bank_name, account_holder_name, account_number, routing_number, swift_code,
        legal_business_name, business_registration_number, business_type,
        business_tax_id, establishment_year,
        primary_business_address, warehouse_locations,
        business_phone, business_email,
        business_license_url, certificate_of_incorporation_url,
        tax_registration_certificate_url, business_certificate_url,
        iso_certificate_url, quality_assurance_license_url, audit_reports_url,
        verification_status, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, 'pending', CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

        const values = [
            userId,
            data.ownerFullName,
            data.governmentIdType,
            data.governmentIdNumber,
            data.governmentIdDocumentUrl,
            data.proofOfAddressDocumentUrl,
            data.bankName,
            data.accountHolderName,
            data.accountNumber,
            data.routingNumber,
            data.swiftCode,
            data.legalBusinessName,
            data.businessRegistrationNumber,
            data.businessType,
            data.businessTaxId,
            data.establishmentYear,
            data.primaryBusinessAddress,
            JSON.stringify(data.warehouseLocations || []),
            data.businessPhone,
            data.businessEmail,
            data.businessLicenseUrl,
            data.certificateOfIncorporationUrl,
            data.taxRegistrationCertificateUrl,
            data.businessCertificateUrl,
            data.isoCertificateUrl,
            data.qualityAssuranceLicenseUrl,
            data.auditReportsUrl
        ];

        const result = await db(query, values);
        return result.rows[0];
    }

    /**
     * Get verification by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Verification object or null
     */
    static async findByUserId(userId) {
        const query = `
      SELECT *
      FROM supplier_verifications
      WHERE user_id = $1
      ORDER BY submitted_at DESC
      LIMIT 1
    `;
        const result = await db(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Update verification status (admin approval/rejection)
     * @param {string} verificationId - Verification ID
     * @param {string} status - Status ('approved', 'rejected', 'under_review')
     * @param {string} reviewedBy - Admin user ID
     * @param {string} rejectionReason - Reason if rejected
     * @returns {Promise<Object>} Updated verification object
     */
    static async updateStatus(verificationId, status, reviewedBy, rejectionReason = null) {
        const query = `
      UPDATE supplier_verifications
      SET 
        verification_status = $1,
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = $2,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
        const result = await db(query, [status, reviewedBy, rejectionReason, verificationId]);
        return result.rows[0];
    }

    /**
     * Get all pending verifications (for admin)
     * @returns {Promise<Array>} Array of pending verifications
     */
    static async findPending() {
        const query = `
      SELECT 
        sv.*,
        u.email,
        u.first_name,
        u.last_name
      FROM supplier_verifications sv
      JOIN users u ON sv.user_id = u.id
      WHERE sv.verification_status = 'pending'
      ORDER BY sv.submitted_at ASC
    `;
        const result = await db(query);
        return result.rows;
    }

    /**
     * Delete draft after successful submission
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async deleteDraft(userId) {
        const query = `DELETE FROM verification_drafts WHERE user_id = $1`;
        await db(query, [userId]);
    }
}

module.exports = SupplierVerification;
