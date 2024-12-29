// models/Color.js
import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

const Color = mongoose.model('Color', colorSchema);

export default Color;