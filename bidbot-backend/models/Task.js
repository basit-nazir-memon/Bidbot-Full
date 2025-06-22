const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Task Schema
const taskSchema = new Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['planning', 'requirements', 'design', 'development', 'testing', 'deployment', 'completed'], 
        required: true 
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        required: true 
    },
    job: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true 
    },
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    dueDate: { 
        type: Date, 
        required: true 
    },
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account', 
        required: true 
    },
}, { timestamps: true }); // This adds `createdAt` and `updatedAt` fields

// Create the Task model based on the schema
const Task = mongoose.model('Task', taskSchema);

// Export the model
module.exports = Task;
