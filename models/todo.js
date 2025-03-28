const mongoose = require('mongoose');
const Schema = mongoose.Schema;

todoSchema = new Schema({
    message: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Todo', todoSchema);