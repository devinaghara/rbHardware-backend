import User from '../Models/User.js';

// Get all addresses for the current user
export const getUserAddresses = async (req, res) => {
    try {
        const userId = req.session.user?._id; // Fetch userId correctly
        console.log(userId,"get address")

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized, please login",
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        res.status(200).json({
            addresses: user.addresses || [],
            success: true
        });
    } catch (error) {
        console.error("Get addresses error:", error);
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

// Add a new address
export const addAddress = async (req, res) => {
    try {
        const userId = req.session.user._id; // Fetch userId correctly
        console.log(userId,"add address")

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized, please login",
                success: false
            });
        }

        const {
            type,
            name,
            phone,
            street,
            city,
            state,
            zipCode,
            isDefault
        } = req.body;

        // Validate required fields
        if (!name || !phone || !street || !city || !state || !zipCode) {
            return res.status(400).json({
                message: "Please provide all required address fields",
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Create new address object
        const newAddress = {
            type: type || 'Home',
            name,
            phone,
            street,
            city,
            state,
            zipCode,
            isDefault: isDefault || false
        };

        // If marked as default or first address, handle default logic
        if (newAddress.isDefault || user.addresses.length === 0) {
            // Make the new address default and unset other defaults
            newAddress.isDefault = true;
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // Add new address to user
        user.addresses.push(newAddress);
        await user.save();

        res.status(201).json({
            message: "Address added successfully",
            address: user.addresses[user.addresses.length - 1],
            success: true
        });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

// Update an existing address
export const updateAddress = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { addressId } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized, please login",
                success: false
            });
        }

        const {
            type,
            name,
            phone,
            street,
            city,
            state,
            zipCode,
            isDefault
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Find address by ID
        const addressIndex = user.addresses.findIndex(addr =>
            addr._id.toString() === addressId
        );

        if (addressIndex === -1) {
            return res.status(404).json({
                message: "Address not found",
                success: false
            });
        }

        // Save old default status for comparison
        const wasDefault = user.addresses[addressIndex].isDefault;

        // Update address fields
        if (type) user.addresses[addressIndex].type = type;
        if (name) user.addresses[addressIndex].name = name;
        if (phone) user.addresses[addressIndex].phone = phone;
        if (street) user.addresses[addressIndex].street = street;
        if (city) user.addresses[addressIndex].city = city;
        if (state) user.addresses[addressIndex].state = state;
        if (zipCode) user.addresses[addressIndex].zipCode = zipCode;

        // Handle default address logic
        if (isDefault !== undefined) {
            // If setting to default, update all other addresses
            if (isDefault && !wasDefault) {
                user.addresses.forEach((addr, idx) => {
                    addr.isDefault = (idx === addressIndex);
                });
            }
            // If removing default status from the only default address,
            // we need to make another address default
            else if (!isDefault && wasDefault && user.addresses.length > 1) {
                // Find first address that's not this one to make default
                const newDefaultIndex = user.addresses.findIndex((addr, idx) =>
                    idx !== addressIndex
                );

                if (newDefaultIndex !== -1) {
                    user.addresses[newDefaultIndex].isDefault = true;
                }

                user.addresses[addressIndex].isDefault = false;
            } else {
                // Just update the value
                user.addresses[addressIndex].isDefault = isDefault;
            }
        }

        await user.save();

        res.status(200).json({
            message: "Address updated successfully",
            address: user.addresses[addressIndex],
            success: true
        });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

// Delete an address
export const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { addressId } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized, please login",
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Find address by ID
        const addressIndex = user.addresses.findIndex(addr =>
            addr._id.toString() === addressId
        );

        if (addressIndex === -1) {
            return res.status(404).json({
                message: "Address not found",
                success: false
            });
        }

        // Check if this is the default address
        const wasDefault = user.addresses[addressIndex].isDefault;

        // Remove the address
        user.addresses.splice(addressIndex, 1);

        // If we deleted the default address and there are other addresses,
        // make the first one the default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.status(200).json({
            message: "Address deleted successfully",
            success: true
        });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

// Set an address as default
export const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { addressId } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized, please login",
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Find address by ID
        const addressIndex = user.addresses.findIndex(addr =>
            addr._id.toString() === addressId
        );

        if (addressIndex === -1) {
            return res.status(404).json({
                message: "Address not found",
                success: false
            });
        }

        // If already default, no need to update
        if (user.addresses[addressIndex].isDefault) {
            return res.status(200).json({
                message: "This address is already set as default",
                address: user.addresses[addressIndex],
                success: true
            });
        }

        // Update default status for all addresses
        user.addresses.forEach((addr, idx) => {
            addr.isDefault = (idx === addressIndex);
        });

        await user.save();

        res.status(200).json({
            message: "Default address updated successfully",
            address: user.addresses[addressIndex],
            success: true
        });
    } catch (error) {
        console.error('Set default address error:', error);
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
};