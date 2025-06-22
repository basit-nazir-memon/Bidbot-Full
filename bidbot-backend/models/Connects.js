const mongoose = require('mongoose');
const { Schema } = mongoose;

const connectsSchema = new Schema({
    connects: { type: Number, default: 0 },
    history: [{ type: Schema.Types.ObjectId, ref: 'ConnectsHistory' }]
});

const Connects = mongoose.model('Connects', connectsSchema);

module.exports = Connects;
