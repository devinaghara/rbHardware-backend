import express from 'express';
import {
    getUserAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../Controllers/Address.controller.js';
import { protect } from '../Middlewares/Protect.js';

const router = express.Router();


// Get all addresses
router.get('/getaddress', protect, getUserAddresses);

// Add a new address
router.post('/add', protect, addAddress);

// Update an address
router.put('/:addressId', protect, updateAddress);

// Delete an address
router.delete('/:addressId', protect, deleteAddress);

// Set an address as default
router.patch('/:addressId/set-default', protect, setDefaultAddress);

export default router;