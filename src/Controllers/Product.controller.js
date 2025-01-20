import Product from "../Models/Product.js";

const addProducts = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            images,
            linkedProducts,
            color,
            colorCode,
            category,
            material
        } = req.body;

        // Validate required fields
        if (!name || !description || !price || !images || !color || !colorCode || !category || !material) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        // Create new product
        const newProduct = new Product({
            name,
            description,
            price,
            images,
            linkedProducts: linkedProducts || [], // Default to empty array if not provided
            color,
            colorCode,
            category,
            material
        });

        // Save the product to the database
        const savedProduct = await newProduct.save();
        res.status(201).json({
            message: 'Product added successfully!',
            product: savedProduct
        });
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

const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('linkedProducts', 'name images price'); // Populate basic info of linked products

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({
            message: 'Product retrieved successfully',
            product
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID' });
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
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Remove this product from any other products' linkedProducts array
        await Product.updateMany(
            { linkedProducts: req.params.id },
            { $pull: { linkedProducts: req.params.id } }
        );

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
};

// Additional helper controller to update linked products
const updateLinkedProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { linkedProducts } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate that all linkedProducts exist
        if (linkedProducts && linkedProducts.length > 0) {
            const validProducts = await Product.find({
                _id: { $in: linkedProducts }
            });

            if (validProducts.length !== linkedProducts.length) {
                return res.status(400).json({
                    message: 'One or more linked products do not exist'
                });
            }
        }

        product.linkedProducts = linkedProducts;
        const updatedProduct = await product.save();

        res.status(200).json({
            message: 'Linked products updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID' });
        }
        res.status(500).json({
            message: 'Failed to update linked products',
            error: error.message
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate required fields
        if (!updateData.name || !updateData.description || !updateData.price ||
            !updateData.images || !updateData.color || !updateData.colorCode ||
            !updateData.category || !updateData.material) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        // Check if product exists
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate linked products if provided
        if (updateData.linkedProducts && updateData.linkedProducts.length > 0) {
            const validProducts = await Product.find({
                _id: { $in: updateData.linkedProducts }
            });

            if (validProducts.length !== updateData.linkedProducts.length) {
                return res.status(400).json({
                    message: 'One or more linked products do not exist'
                });
            }
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('linkedProducts', 'name images price');

        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID' });
        }
        res.status(500).json({
            message: 'Failed to update product',
            error: error.message
        });
    }
};

export { addProducts, getAllProducts, getProduct, updateLinkedProducts, updateProduct, deleteProduct };   