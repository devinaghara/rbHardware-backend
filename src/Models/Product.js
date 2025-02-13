import mongoose from 'mongoose';  

// Define the productLinks schema
const productLinks = new mongoose.Schema({     
    name: {         
        type: String,         
        required: true     
    },      
    price: {         
        type: Number,         
        required: true     
    },     
    images: {         
        type: [String],          
        required: true     
    },     
    color: {         
        type: String,         
        required: true,     
    },     
    colorCode: {         
        type: String,         
        required: true,     
    },     
    description: {         
        type: String,         
        required: true     
    } 
});

// Define the main product schema
const productSchema = new mongoose.Schema({     
    productId: {         
        type: String,         
        required: true     
    },     
    linkedProducts: [productLinks],
    category: {         
        type: String,         
        required: true     
    },     
    material: {         
        type: String,         
        required: true     
    } 
}, { 
    timestamps: true 
});

// Create the Product model
const Product = mongoose.model('Product', productSchema);  

export default Product;
