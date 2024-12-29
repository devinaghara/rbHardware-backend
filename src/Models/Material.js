// models/Material.js
import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

const Material = mongoose.model('Material', materialSchema);

export default Material;