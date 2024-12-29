import { Router } from 'express';
import { colorController } from '../Controllers/Color.controller.js';

const router = Router();

// Color routes
router.get('/colors', colorController.getAllColors);
router.post('/colors', colorController.createColor);
router.put('/colors/:id', colorController.updateColor);
router.delete('/colors/:id', colorController.deleteColor);

export default router;