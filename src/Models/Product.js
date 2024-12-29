import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    images: {
        type: [String],  // Array of image URLs
        required: true
    },
    linkedProducts:[{   
        type: mongoose.Schema.Types.ObjectId,
    }],
    color: {
        type: String,
        required: true,
    },
    colorCode: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true
    },
    material: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

export default Product;