import { Router } from 'express';
import { materialController } from '../Controllers/Material.controller.js';

const router = Router();

// Material routes
router.get('/materials', materialController.getAllMaterials);
router.post('/materials', materialController.createMaterial);
router.put('/materials/:id', materialController.updateMaterial);
router.delete('/materials/:id', materialController.deleteMaterial);

export default router;