import express from 'express';
import { 
    getCart, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    clearCart 
} from '../Controllers/Cart.controller.js';
import { optionalAuth } from '../Middlewares/Protect.js';

const router = express.Router();

// Apply optional authentication to all cart routes
router.use(optionalAuth);

// Cart routes that work for both authenticated users and guests
router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/remove/:itemId', removeFromCart);
router.delete('/clear', clearCart);

export default router;