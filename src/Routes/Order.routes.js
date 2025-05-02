import express from 'express';

import { cancelOrder, createOrder, getAllOrders, getOrderById, getUserOrders, updateOrderStatus } from '../Controllers/Order.controller.js';
import {isAdmin} from '../Middlewares/adminAuth.js'
import {isAuthenticated} from '../Middlewares/auth.js'
const router = express.Router();

// User routes - require authentication
router.post('/create', isAuthenticated, createOrder);
router.get('/user', isAuthenticated, getUserOrders);
router.get('/:orderId', isAuthenticated, getOrderById);
router.post('/:orderId/cancel', isAuthenticated, cancelOrder);

// Admin routes - require admin privileges
router.get('/all', isAuthenticated, isAdmin, getAllOrders);
router.patch('/admin/:userId/:orderId/status', isAuthenticated, isAdmin, updateOrderStatus);
router.patch('/:orderId/status', isAuthenticated, isAdmin, updateOrderStatus); // Alternative endpoint

export default router;