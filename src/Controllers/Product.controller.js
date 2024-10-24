import Product from "../Models/Product.js";

const addProducts = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            images,
            availableColors,
            color,
            category,
            material
        } = req.body;

        // Create new product
        const newProduct = new Product({
            name,
            description,
            price,
            images,
            availableColors,
            color,
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
}

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export { addProducts, getAllProducts, getProduct };