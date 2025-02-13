import mongoose from "mongoose";
import Product from "../Models/Product.js";

// const addProducts = async (req, res) => {
//     try {
//         const {
//             productId,
//             name,
//             price,
//             images,
//             color,
//             colorCode,
//             description,
//             category,
//             material
//         } = req.body;

//         // Validate required fields
//         if (!productId || !name || !price || !Array.isArray(images) || images.length === 0 || !color || !colorCode || !description || !category || !material) {
//             return res.status(400).json({
//                 message: 'All required fields must be provided'
//             });
//         }

//         // Check if the product already exists
//         const existingProduct = await Product.findOne({ productId: productId });

//         if (existingProduct) {
//             // If the product exists, add the new data to the linkedProducts subarray
//             existingProduct.linkedProducts.push({
//                 name,
//                 price,
//                 images,
//                 color,
//                 colorCode,
//                 description
//             });

//             // Save the updated product
//             const updatedProduct = await existingProduct.save();
//             return res.status(200).json({
//                 message: 'Linked product added successfully!',
//                 product: updatedProduct
//             });
//         } else {
//             // If the product does not exist, create a new product
//             const newProduct = new Product({
//                 productId,
//                 category,
//                 material,
//                 linkedProducts: [
//                     {
//                         name,
//                         price,
//                         images,
//                         color,
//                         colorCode,
//                         description
//                     }
//                 ]
//             });

//             // Save the new product to the database
//             const savedProduct = await newProduct.save();
//             return res.status(201).json({
//                 message: 'Product added successfully!',
//                 product: savedProduct
//             });
//         }
//     } catch (error) {
//         res.status(500).json({
//             message: 'Failed to add product',
//             error: error.message
//         });
//     }
// };

const addProducts = async (req, res) => {
    try {
        const {
            productId,
            linkedProducts,
            category,
            material
        } = req.body;

        // Validate required fields
        if (!productId || !category || !material || !Array.isArray(linkedProducts) || linkedProducts.length === 0) {
            return res.status(400).json({
                message: 'ProductId, category, material, and at least one linked product are required'
            });
        }

        // Validate each linked product
        for (const product of linkedProducts) {
            if (!product.name || !product.price || !Array.isArray(product.images) || 
                product.images.length === 0 || !product.color || !product.colorCode || 
                !product.description) {
                return res.status(400).json({
                    message: 'Each linked product must have name, price, images, color, colorCode, and description'
                });
            }
        }

        // Check if the product already exists
        const existingProduct = await Product.findOne({ productId });

        if (existingProduct) {
            // If the product exists, add the new linked products to the array
            existingProduct.linkedProducts.push(...linkedProducts);

            // Save the updated product
            const updatedProduct = await existingProduct.save();
            return res.status(200).json({
                message: 'Linked products added successfully!',
                product: updatedProduct
            });
        } else {
            // If the product does not exist, create a new product
            const newProduct = new Product({
                productId,
                linkedProducts,
                category,
                material
            });

            // Save the new product to the database
            const savedProduct = await newProduct.save();
            return res.status(201).json({
                message: 'Product added successfully!',
                product: savedProduct
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'Failed to add product',
            error: error.message
        });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('linkedProducts', 'name images price'); // Populate basic info of linked products

        res.status(200).json({
            message: 'Products retrieved successfully',
            products
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to retrieve products',
            error: error.message
        });
    }
};

// const getProduct = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id)
//             .populate('linkedProducts', 'name images price');
//         if (!product) {
//             return res.status(404).json({ message: 'Product not found' });
//         }
//         res.status(200).json({ message: 'Product retrieved successfully', product });
//     } catch (error) {
//         if (error.name === 'CastError') {
//             return res.status(400).json({ message: 'Invalid product ID' });
//         }
//         res.status(500).json({ message: 'Failed to retrieve product', error: error.message });
//     }
// };

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        // First try to find product where the main _id matches
        let product = await Product.findById(id);
        
        // If not found, try to find product where productId matches
        if (!product) {
            product = await Product.findOne({ productId: id });
        }
        
        // If still not found, try to find product containing the variant with matching _id
        if (!product) {
            product = await Product.findOne({
                'linkedProducts._id': id
            });
        }
        
        if (!product) {
            return res.status(404).json({ 
                message: 'Product not found' 
            });
        }
        
        res.status(200).json({ 
            message: 'Product retrieved successfully', 
            product 
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid product ID format' 
            });
        }
        res.status(500).json({ 
            message: 'Failed to retrieve product', 
            error: error.message 
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
};

const updateLinkedProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { linkedProducts } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (linkedProducts && linkedProducts.length > 0) {
            const validProducts = await Product.find({ _id: { $in: linkedProducts } });
            if (validProducts.length !== linkedProducts.length) {
                return res.status(400).json({ message: 'One or more linked products do not exist' });
            }
        }

        product.linkedProducts = linkedProducts;
        const updatedProduct = await product.save();

        res.status(200).json({ message: 'Linked products updated successfully', product: updatedProduct });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID' });
        }
        res.status(500).json({ message: 'Failed to update linked products', error: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            productId,
            linkedProducts,
            category,
            material
        } = req.body;

        // Validate required fields
        if (!productId || !category || !material) {
            return res.status(400).json({
                message: 'ProductId, category, and material are required'
            });
        }

        // If linkedProducts is provided, validate each one
        if (linkedProducts) {
            if (!Array.isArray(linkedProducts)) {
                return res.status(400).json({
                    message: 'linkedProducts must be an array'
                });
            }

            for (const product of linkedProducts) {
                if (!product.name || !product.price || !Array.isArray(product.images) || 
                    product.images.length === 0 || !product.color || !product.colorCode || 
                    !product.description) {
                    return res.status(400).json({
                        message: 'Each linked product must have name, price, images, color, colorCode, and description'
                    });
                }
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                productId,
                linkedProducts,
                category,
                material
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid product ID'
            });
        }
        res.status(500).json({
            message: 'Failed to update product',
            error: error.message
        });
    }
};

export { addProducts, getAllProducts, getProduct, updateLinkedProducts, updateProduct, deleteProduct };   