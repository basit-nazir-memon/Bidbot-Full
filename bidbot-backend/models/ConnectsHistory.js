const mongoose = require('mongoose');
const { Schema } = mongoose;

const connectsHistorySchema = new Schema({
    action: { type: String, required: true },
    date: { type: Date, default: Date.now },
    connectsChange: { type: Number, required: true }
});

const ConnectsHistory = mongoose.model('ConnectsHistory', connectsHistorySchema);

module.exports = ConnectsHistory;