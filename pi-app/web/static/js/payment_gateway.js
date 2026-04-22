// payment_gateway.js

/**
 * Simulates a payment gateway process.
 * @param {number} amount - The amount to be paid.
 * @returns {Promise<boolean>} - Returns true if payment is successful, false otherwise.
 */
async function processPayment(amount) {
    console.log(`Processing payment for ₹${amount}...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Payment successful!");
    return true;
}
