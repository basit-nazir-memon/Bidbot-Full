const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "Other"
    },
    answer: {
        type: String,
        required: true
    }
}, { timestamps: true });

const FAQ = mongoose.model('FAQ', FAQSchema);

module.exports = FAQ;
