// controllers/materialController.js
import Material from "../Models/Material.js";

const materialController = {
    // Get all materials
    getAllMaterials: async (req, res) => {
        try {
            const materials = await Material.find();
            res.json(materials);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create new material
    createMaterial: async (req, res) => {
        try {
            const { name } = req.body;
            const material = await Material.create({ name });
            res.status(201).json(material);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    //Update Material
    updateMaterial: async (req, res) => {
        try {
            const { name } = req.body;
            const material = await Material.findByIdAndUpdate(
                req.params.id,
                { name },
                { new: true }
            );
            if (!material) {
                return res.status(404).json({ message: 'Material not found' });
            }
            res.json(material);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    // Delete material
    deleteMaterial: async (req, res) => {
        try {
            await Material.findByIdAndDelete(req.params.id);
            res.json({ message: 'Material deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

export { materialController };