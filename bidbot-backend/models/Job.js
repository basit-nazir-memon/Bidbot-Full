const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Job Schema
const jobSchema = new Schema({
    budget: { type: Number },
    country: { type: String, required: true },
    description: { type: String, required: true },
    items: [{ type: String, required: true }],
    payment_status: { type: String, required: true },
    postedOn: { type: String },
    proposals: { type: Number, required: true },
    maxHourlyPrice: { type: Number },
    minHourlyPrice: { type: Number },
    rating: { type: Number, required: true },
    spendings: { type: Number, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    job_status: { type: String, enum: ["Opened", "Closed"], default: "Opened" },
    upwork_id: { type: String, unique: true, required: true }
});

// Models
const Job = mongoose.model("Job", jobSchema);
// Export Models
module.exports = Job;