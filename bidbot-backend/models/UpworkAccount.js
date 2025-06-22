const mongoose = require('mongoose');
const { Schema } = mongoose;

// AppliedJobs Schema for Users
const completedJobSchema = new Schema({
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    proposalGenerated: { type: String },
    bidPrice: { type: Number },
    hourlyPrice: { type: Number },
    jobType: { type: String },
    jobDuration: { type: String },
    completionDate: {type: Date },
    appliedOn: { type: Date, default: Date.now }, 
});

// AppliedJobs Schema for Users
const appliedJobSchema = new Schema({
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    proposalGenerated: { type: String },
    jobApplicationStatus: { type: String, enum: ["Applied", "Rejected", "Suggested"], default: "Applied" },
    bidPrice: { type: Number },
    hourlyPrice: { type: Number },
    jobType: { type: String },
    jobDuration: { type: String },
    jobStatus: { type: String, enum: ["Ongoing", "Completed", "Discarded", "Not Started"], default: "Not Started" },
    appliedOn: { type: Date, default: Date.now }, 
});

// AppliedJobs Schema for Users
const suggestedJobSchema = new Schema({
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    proposalGenerated: { type: String },
    proposalStatus: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" },
    jobApplicationStatus: { type: String, enum: ["Applied", "Rejected", "Suggested"], default: "Suggested" },
    bidPrice: { type: Number },
    hourlyPrice: { type: Number },
    jobType: { type: String },
    jobDuration: {
        durationNum: { type: Number },
        durationScale: { type: String, enum: ["days", "weeks", "months", "years"] }
    },
});

// Notification Schema
const notificationSchema = new Schema({
    postedOn: { type: Date, default: Date.now, required: true },
    isRead: { type: Boolean, default: false },
    title: { type: String, required: true },
    imageUrl: { type: String },
    icon: { type: String },
    redirect_url: { type: String }
});

// const configurationSchema = new Schema();

const upworkAccountSchema = new Schema({
    loginType: { type: String, enum: ['emailPass', 'Google', 'Facebook'], required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    connects: { type: Schema.Types.ObjectId, ref: 'Connects' },
    username: { type: String },
    security_answer: { type: String },
    userid: { type: String },
    role: { type: String },
    status: { type: String, required: true },
    avatar: { type: String },
    address: { type: String },
    description: { type: String },
    education: [{ 
        degree: { type: String },
        institute: { type: String },
        year: { type: String },

    }],
    employment_history: [{ 
        title: {type: String},
        duration: {type: String},
        description: {type: String},
    }],
    name: { type: String },
    per_hour_charge: { type: String },
    phone: { type: String },
    projects: [{ 
        description: {type: String},
        media: [{type: String}], 
        published: {type: String}, 
        role: {type: String},
        skills: [ {type: String} ],
        title: {type: String},
    }],
    skills: [{ type: String }],
    timezone: { type: String },
    total_earnings: { type: String },
    total_jobs: { type: String },
    work_history: [{ 
        duration: {type: String},
        price: {type: String},
        title: {type: String},
        type: {type: String},
    }],
    appliedJobs: [appliedJobSchema], // Array of Applied Jobs
    suggestedJobs: [suggestedJobSchema],
    completedJobs: [completedJobSchema],
    spamJobs: [ { type: Schema.Types.ObjectId, ref: 'Job' }],
    notifications: [notificationSchema], // Array of Notifications
    configuration: {
        proposal: {
            showPrevProjects: { type: Boolean, default: false },
            showModuleDiv: { type: Boolean, default: false },
            showTimeDiv: { type: Boolean, default: false },
            showCostDiv: { type: Boolean, default: false },
            template: { type: Schema.Types.ObjectId, ref: 'ProposalTemplate' }
        },
        costAndTime: {
            timeEstimationStrategy: { 
                type: String, 
                enum: ['JobEstimatedTime', 'ModuleBreakDown', 'Custom'], 
                default: 'JobEstimatedTime'
            },
            usePreviousData: { type: Boolean, default: false },
            customTimePercent: { type: Number, default: 100 },
            perHourPrice: { type: String },
            costEstimationStrategy: { 
                type: String, 
                enum: ['HourBased', 'clientBudget', 'PrevProjectsBased', 'Custom'],
                default: 'clientBudget'
            },
            customCostPercentage: { type: Number, default: 100 }
        },
        job: {
            minimumFixedPrice: { type: Number, default: 0 },
            minimumHourlyPrice: { type: Number, default: 0 },
            jobType: {
                type: String,
                enum: ['hourly', 'fixed', 'both'],
                default: 'both'
            },
            maxProposalsSubmitted: { type: Number, default: 30 },
            excludedCountries: [{ type: String }],
            minimumProjectDuration: { type: String, default: "1 day" },  // skipped
            hoursPerWeek: {  // skipped
                type: String, 
                enum: ['Less Than 30', 'More than 30'], 
                default: 'Less Than 30' 
            },
            minimumClientRating: { 
                type: Number, 
                min: 1.0, 
                max: 5.0, 
                default: 4.0 
            },
            clientMinimumSpentUSD: { type: Number, default: 0 },
            onlyPaymentVerified: { type: Boolean, default: false }
        }
    },
});

const UpworkAccount = mongoose.model('UpworkAccount', upworkAccountSchema);

module.exports = UpworkAccount;
