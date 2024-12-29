// controllers/categoryController.js
import Category from "../Models/Category.js";

const categoryController = {
    // Get all categories
    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.find();
            res.json(categories);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create new category
    createCategory: async (req, res) => {
        try {
            const { id, name } = req.body;
            const category = await Category.create({ id, name });
            res.status(201).json(category);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    //Update Category
    updateCategory: async (req, res) => {
        try {
            const { id, name } = req.body;
            const category = await Category.findByIdAndUpdate(
                req.params.id,
                { id, name },
                { new: true }
            );
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.json(category);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    // Delete category
    deleteCategory: async (req, res) => {
        try {
            await Category.findByIdAndDelete(req.params.id);
            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

export { categoryController };