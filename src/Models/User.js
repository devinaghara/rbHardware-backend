import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Address Schema
const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Home", "Office", "Other"],
    default: "Home",
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// Cart Item Schema
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  image: {
    type: String,
  },
  color: {
    type: String,
    default: null,
  },
  size: {
    type: String,
    default: null,
  },
});

// Wishlist Item Schema
const wishlistItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Order Item Schema
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
  color: {
    type: String,
    default: null,
  },
  size: {
    type: String,
    default: null,
  },
});

// Order Schema
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      // unique: true
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentDetails: {
      id: String,
      status: String,
      method: String,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "In Transit", "Delivered", "Cancelled"],
      default: "Pending",
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "Pending",
            "Processing",
            "In Transit",
            "Delivered",
            "Cancelled",
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        comment: String,
      },
    ],
    trackingNumber: {
      type: String,
      default: null,
    },
    estimatedDelivery: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Main User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    addresses: [addressSchema],
    cart: {
      items: [cartItemSchema],
      totalAmount: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    wishlist: [wishlistItemSchema],
    orders: [orderSchema],
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      required: true,
      default: "user",
    },
    preferences: {
      notificationSettings: {
        email: {
          orderUpdates: { type: Boolean, default: true },
          promotions: { type: Boolean, default: true },
        },
        sms: {
          orderUpdates: { type: Boolean, default: false },
          promotions: { type: Boolean, default: false },
        },
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (!this.password) {
    return next(new Error("Password is required for hashing"));
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Set default address if it's the first one or marked as default
userSchema.pre("save", function (next) {
  if (this.isModified("addresses") && this.addresses.length) {
    // If only one address, make it default
    if (this.addresses.length === 1) {
      this.addresses[0].isDefault = true;
    }
    // If multiple addresses and one is marked as default, ensure others are not default
    else {
      const defaultExists = this.addresses.some((addr) => addr.isDefault);
      if (defaultExists) {
        let foundDefault = false;
        this.addresses.forEach((addr) => {
          if (addr.isDefault && !foundDefault) {
            foundDefault = true;
          } else if (addr.isDefault && foundDefault) {
            addr.isDefault = false;
          }
        });
      } else {
        // If no default is set, make the first one default
        this.addresses[0].isDefault = true;
      }
    }
  }
  next();
});

// Update cart total amount when cart items change
userSchema.pre("save", function (next) {
  if (this.isModified("cart.items")) {
    this.cart.totalAmount = this.cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    this.cart.lastUpdated = Date.now();
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to add item to cart
userSchema.methods.addToCart = function (item) {
  const cartItemIndex = this.cart.items.findIndex(
    (cartItem) =>
      cartItem.productId.toString() === item.productId.toString() &&
      cartItem.color === item.color &&
      cartItem.size === item.size
  );

  if (cartItemIndex >= 0) {
    // Item exists, update quantity
    this.cart.items[cartItemIndex].quantity += item.quantity;
  } else {
    // Add new item
    this.cart.items.push(item);
  }

  return this.save();
};

// Method to remove item from cart
userSchema.methods.removeFromCart = function (itemId) {
  this.cart.items = this.cart.items.filter(
    (item) => item._id.toString() !== itemId.toString()
  );
  return this.save();
};

// Method to add address
userSchema.methods.addAddress = function (address) {
  if (address.isDefault) {
    // Set all other addresses as not default
    this.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }
  this.addresses.push(address);
  return this.save();
};

// Method to get default address
userSchema.methods.getDefaultAddress = function () {
  return this.addresses.find((addr) => addr.isDefault);
};

const User = mongoose.model("User", userSchema);

export default User;
