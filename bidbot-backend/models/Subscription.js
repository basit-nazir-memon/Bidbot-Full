const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
    type: { type: String, enum: ['Standard', 'Platinum', 'Gold'], required: true },
    expiryDate: { type: Date, required: true },
    isExpired: { type: Boolean, default: false }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
