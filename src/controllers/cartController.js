const Cart = require('../models/Cart');

exports.addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;

        // Xác thực đầu vào
        if (!productId || !variantId || !quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'Thiếu thông tin sản phẩm'
            });
        }

        // Lấy ID người dùng từ auth middleware
        const userId = req.user.id;

        // Thêm vào giỏ hàng và nhận giỏ hàng cập nhật
        const cartItems = await Cart.addToCart(
            userId,
            parseInt(productId),
            parseInt(variantId),
            parseInt(quantity)
        );

        res.status(200).json({
            status: 'success',
            data: { items: cartItems }
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getCart = async (req, res) => {
    try {
        const items = await Cart.getCartByUserId(req.user.id);
        res.status(200).json({
            status: 'success',
            data: { items }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.updateQuantity = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'Thiếu thông tin cần thiết'
            });
        }

        const cartItems = await Cart.updateQuantity(
            req.user.id,
            parseInt(productId),
            parseInt(variantId),
            parseInt(quantity)
        );

        res.status(200).json({
            status: 'success',
            data: { items: cartItems }
        });
    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const { productId, variantId } = req.params;

        const cartItems = await Cart.removeFromCart(
            req.user.id,
            parseInt(productId),
            parseInt(variantId)
        );

        res.status(200).json({
            status: 'success',
            data: { items: cartItems }
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await Cart.clearCart(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { items: [] }
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};