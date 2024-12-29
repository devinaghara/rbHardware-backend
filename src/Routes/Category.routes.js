import { Router } from 'express';
import { categoryController } from '../Controllers/Category.controller.js';

const router = Router();

// Category routes
router.get('/categories', categoryController.getAllCategories);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

export default router;
