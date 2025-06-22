const mongoose = require('mongoose');
const { Schema } = mongoose;

// ProposalTemplate Schema
const proposalTemplateSchema = new Schema({
    name: { type: String, required: true },
    templateItems: [{ type: String, required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['General', 'Customized'], 
        required: true 
    }
});

const ProposalTemplate = mongoose.model('ProposalTemplate', proposalTemplateSchema);

module.exports = ProposalTemplate;
