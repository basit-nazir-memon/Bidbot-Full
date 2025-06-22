const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['Company', 'Individual'], required: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    upworkAccounts: [{ type: Schema.Types.ObjectId, ref: 'UpworkAccount' }],
    maxUpworkAccounts: {type: Number, default: 0},
    description: { type: String },
    skills: [ { type: String } ],
    totalHoursPerWeek: { type: Number },
    pricePerHour: { type: Number },
    projects: [{ 
        description: {type: String},
        media: [{type: String}], 
        published: {type: String}, 
        role: {type: String},
        skills: [ {type: String} ],
        title: {type: String},
    }],
});

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;