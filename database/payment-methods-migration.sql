-- =====================================================
-- PAYMENT METHODS MIGRATION
-- Updates payment method values to match frontend checkout flow
-- =====================================================

-- This migration documents the change from old payment methods to new ones
-- Old values: 'cod', 'online', 'upi'
-- New values: 'card', 'escrow', 'wire', 'net-terms'

-- The orders.payment_method column is already VARCHAR(50) without constraints,
-- so no schema change is needed. This file documents the change for reference.

-- If you have existing orders with old payment methods, run this update:
-- UPDATE orders 
-- SET payment_method = CASE 
--     WHEN payment_method = 'online' THEN 'card'
--     WHEN payment_method = 'cod' THEN 'net-terms'
--     WHEN payment_method = 'upi' THEN 'card'
--     ELSE payment_method 
-- END
-- WHERE payment_method IN ('cod', 'online', 'upi');

-- New payment method descriptions:
-- 'card': Credit/Debit Card payments (Visa, MasterCard, American Express)
-- 'escrow': Escrow payment - funds held securely until delivery confirmation
-- 'wire': Wire Transfer - direct bank-to-bank transfer
-- 'net-terms': Net Terms - deferred payment for approved buyers (e.g., Net 30, Net 60)

-- Payment status flow by method:
-- card: pending -> processing -> paid
-- escrow: pending -> processing (on order) -> paid (on delivery confirmation)
-- wire: pending -> paid (manual confirmation)
-- net-terms: pending -> paid (on due date)

COMMENT
ON COLUMN orders.payment_method IS 'Payment method: card, escrow, wire, net-terms';
