// controllers/colorController.js
import Color from "../Models/Color.js";

const colorController = {
    // Get all colors
    getAllColors: async (req, res) => {
        try {
            const colors = await Color.find();
            res.json(colors);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create new color
    createColor: async (req, res) => {
        try {
            const { name } = req.body;
            const color = await Color.create({ name });
            res.status(201).json(color);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    //Update color
    updateColor: async (req, res) => {
        try {
            const { name } = req.body;
            const color = await Color.findByIdAndUpdate(
                req.params.id,
                { name },
                { new: true }
            );
            if (!color) {
                return res.status(404).json({ message: 'Color not found' });
            }
            res.json(color);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    // Delete color
    deleteColor: async (req, res) => {
        try {
            await Color.findByIdAndDelete(req.params.id);
            res.json({ message: 'Color deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

export { colorController };