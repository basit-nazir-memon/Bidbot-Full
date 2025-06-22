const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true },
    avatar: { type: String, default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Individual Freelancer", "Company Team Member", "Company Admin", "Admin", "Support Team", "None"], default: "None" },
    companyRole: { type: String, default: "None" },
    blocked: { type: Boolean, default: false },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: { type: String},
    createdAt: { type: Date, default: Date.now},
    pagesAccess: {
        dashboard: { type: Boolean, default: false },
        roles: { type: Boolean, default: false },
        users: { type: Boolean, default: false },
        profile: { type: Boolean, default: false },
        onboarding: { type: Boolean, default: true },
        accounts: { type: Boolean, default: false },
        linkAccount: { type: Boolean, default: false }, 
        upworkProfile: { type: Boolean, default: false },
        configurations: { type: Boolean, default: false },
        jobs: { type: Boolean, default: false },
        tracking: { type: Boolean, default: false },
        notifications: { type: Boolean, default: false },
        jobDetails: { type: Boolean, default: false },
        team: { type: Boolean, default: false },
        kanban: { type: Boolean, default: false },
        manageKanban: { type: Boolean, default: false },
        reports: { type: Boolean, default: false },
        support: { type: Boolean, default: false },
    },
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    location: { type: String},
    subscriptionId: { type: String },
    subscriptionStatus: { type: String, enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'none'], default: 'none' },
    accountType: { type: String, enum: ['free', 'individual', 'company', 'enterprise'], default: 'free' },
    planType: { type: String },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
});

const User = mongoose.model("User", userSchema);
module.exports = User;