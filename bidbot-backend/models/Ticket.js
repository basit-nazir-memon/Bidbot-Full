const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'cancelled'],
        default: 'active'
    },
    type: {
        type: String,
        enum: ['technical', 'billing', 'account', 'feature', 'other'],
        default: 'other'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    responses: [
        {
            createdAt: {
                type: Date,
                default: Date.now
            },
            message: {
                type: String,
                required: true
            },
            isAdmin: {
                type: Boolean,
                default: false
            }
        }
    ]
});

module.exports = mongoose.model('Ticket', TicketSchema);
