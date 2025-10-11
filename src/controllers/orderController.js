const Cart = require('../models/Cart');
const Order = require('../models/Order');
const VNPayService = require('../services/vnpayService');
const { ApiError } = require('../middlewares/error');

const getAllOrders = async (req, res, next) => {
    try {
        const orders = await Order.getAllOrders();
        res.status(200).json({
            status: 'success',
            data: orders
        });
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const getOrderDetails = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            throw new ApiError(404, 'Order not found');
        }

        res.status(200).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const getUserOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const orders = await Order.getOrdersByUserId(userId);

        res.status(200).json({
            status: 'success',
            data: orders
        });
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const createCodOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { shipping_address, phone_number, full_name } = req.body;

        if (!shipping_address || !phone_number || !full_name) {
            throw new ApiError(400, 'Missing required fields');
        }

        const cartItems = await Cart.getCartByUserId(userId);
        if (!cartItems.length) {
            throw new ApiError(400, 'Cart is empty');
        }

        const total_amount = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Tạo đơn hàng
        const orderId = await Order.create({
            user_id: userId,
            full_name,
            shipping_address,
            phone_number,
            total_amount,
            payment_method: 'COD',
            items: cartItems.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                price: item.price
            }))
        });

        const order = await Order.findById(orderId);

        res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const createVnpayOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { shipping_address, phone_number, full_name } = req.body;

        if (!shipping_address || !phone_number || !full_name) {
            throw new ApiError(400, 'Missing required fields');
        }

        // Validate cart
        const cartItems = await Cart.getCartByUserId(userId);
        if (!cartItems.length) {
            throw new ApiError(400, 'Cart is empty');
        }

        // Validate amount
        const total_amount = cartItems.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);
        if (total_amount <= 0) {
            throw new ApiError(400, 'Invalid order amount');
        }

        // Create order
        const orderId = await Order.create({
            user_id: userId,
            full_name,
            shipping_address,
            phone_number,
            total_amount,
            payment_method: 'VNPAY',
            items: cartItems.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                price: item.price
            }))
        });

        // Create VNPay URL with error handling
        try {
            const paymentUrl = VNPayService.createPaymentUrl(
                orderId,
                total_amount,
                req.ip
            );

            res.status(200).json({
                status: 'success',
                data: { paymentUrl }
            });
        } catch (error) {
            // Rollback order if VNPay URL creation fails
            await Order.cancelOrder(orderId);
            throw new ApiError(500, 'Payment service unavailable');
        }
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const vnpayCallback = async (req, res, next) => {
    try {
        const vnpParams = req.query;
        const responseCode = vnpParams['vnp_ResponseCode'];

        // Validate signature
        const isValidSignature = VNPayService.validateCallback(vnpParams);
        if (!isValidSignature) {
            console.error('Invalid VNPay signature');
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?code=97`);
        }

        // Get order
        const orderId = vnpParams['vnp_TxnRef'];
        const order = await Order.getOrderByTxnRef(orderId);

        if (!order) {
            console.error('Order not found:', orderId);
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?error=order_not_found`);
        }

        // Check if order already processed
        if (order.payment_status === 'completed') {
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/success?vnp_ResponseCode=${responseCode}&vnp_TxnRef=${orderId}`);
        }

        if (responseCode === '00') {
            await Order.updatePaymentStatus(orderId, 'completed');
            await Order.updateOrderStatus(orderId, 'processing');

            return res.redirect(`${process.env.URL_FRONTEND}/checkout/success?vnp_ResponseCode=${responseCode}&vnp_TxnRef=${orderId}`);
        } else {
            // Cập nhật trạng thái thất bại
            await Order.updatePaymentStatus(orderId, 'failed');
            await Order.updateOrderStatus(orderId, 'cancelled');

            console.error('Payment failed:', { orderId, responseCode });

            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?code=${responseCode}`);
        }
    } catch (error) {
        console.error('VNPay callback error:', error);
        return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?error=${encodeURIComponent(error.message)}`);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new ApiError(400, 'Status is required');
        }

        const validStatuses = ['pending', 'processing', 'delivered', 'cancelled', 'shipping'];
        if (!validStatuses.includes(status)) {
            throw new ApiError(400, 'Invalid status');
        }

        const updatedOrder = await Order.updateOrderStatus(orderId, status);

        if (!updatedOrder) {
            throw new ApiError(404, 'Order not found');
        }

        res.status(200).json({
            status: 'success',
            data: updatedOrder
        });
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

const cancelOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // Kiểm tra đơn hàng tồn tại
        const order = await Order.findById(orderId);
        if (!order) {
            throw new ApiError(404, 'Order not found');
        }
        if (order.user_id !== userId && req.user.role !== 'admin') {
            throw new ApiError(403, 'Not authorized to cancel this order');
        }

        // Kiểm tra trạng thái đơn hàng
        if (!['pending', 'processing'].includes(order.order_status)) {
            throw new ApiError(400, 'Order cannot be cancelled at this status');
        }

        // Thực hiện hủy đơn hàng
        const updatedOrder = await Order.cancelOrder(orderId);

        res.status(200).json({
            status: 'success',
            message: 'Order cancelled successfully',
            data: updatedOrder
        });
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, error.message));
    }
};

module.exports = {
    createCodOrder,
    createVnpayOrder,
    vnpayCallback,
    getAllOrders,
    updateOrderStatus,
    getOrderDetails,
    getUserOrders,
    cancelOrder
};