package com.shoestore.enums;

/**
 * Lifecycle of a customer-facing order.
 *
 * PENDING   → order created, awaiting payment (Stripe PaymentIntent in progress)
 * PAID      → Stripe confirmed the payment; stock already decremented
 * FULFILLED → order has been shipped / delivered / picked up
 * CANCELLED → order cancelled (either before or after payment; stock restored by admin)
 */
public enum OrderStatus {
    PENDING,
    PAID,
    FULFILLED,
    CANCELLED
}
