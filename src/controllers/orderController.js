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
        const userId = req.user.id;  // Sử dụng database user id thay vì firebase uid
        // console.log('User data:', req.user);
        // console.log('Creating order for user:', userId);
        const { shipping_address, phone_number } = req.body;

        // Xác thực đầu vào
        if (!shipping_address || !phone_number) {
            throw new ApiError(400, 'Missing required fields');
        }

        // Get các mặt hàng trong giỏ hàng
        const cartItems = await Cart.getCartByUserId(userId);
        // console.log('Cart items retrieved:', cartItems);
        if (!cartItems.length) {
            throw new ApiError(400, 'Cart is empty');
        }

        // Tính tổng số tiền
        const total_amount = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Tạo đơn hàng
        const orderId = await Order.create({
            user_id: userId,  // Sử dụng database user id
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
        const { shipping_address, phone_number } = req.body;

        if (!shipping_address || !phone_number) {
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
        console.log('VNPay params:', vnpParams);

        // Validate signature
        const isValidSignature = VNPayService.validateCallback(vnpParams);
        if (!isValidSignature) {
            console.error('Invalid VNPay signature');
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?error=invalid_signature`);
        }

        const orderId = vnpParams['vnp_TxnRef'];
        const responseCode = vnpParams['vnp_ResponseCode'];
        const transactionNo = vnpParams['vnp_TransactionNo'];

        console.log('VNPay callback data:', {
            orderId,
            responseCode,
            transactionNo
        });

        // Get order
        const order = await Order.getOrderByTxnRef(orderId);
        console.log('Order before update:', order);
        if (!order) {
            console.error('Order not found:', orderId);
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?error=order_not_found`);
        }

        // Check if order already processed
        if (order.payment_status === 'completed') {
            return res.redirect(`${process.env.URL_FRONTEND}/checkout/success`);
        }

        if (responseCode === '00') {
            // Cập nhật trạng thái thanh toán và đơn hàng
            await Order.updatePaymentStatus(orderId, 'completed');
            await Order.updateOrderStatus(orderId, 'processing');
            console.log('Update result:', await Order.updatePaymentStatus(orderId, 'completed'));
            // Log successful transaction
            console.log('Payment completed successfully:', {
                orderId,
                transactionNo
            });

            return res.redirect(`${process.env.URL_FRONTEND}/checkout/success`);
        } else {
            // Cập nhật trạng thái thất bại
            await Order.updatePaymentStatus(orderId, 'failed');
            await Order.updateOrderStatus(orderId, 'cancelled');

            console.error('Payment failed:', {
                orderId,
                responseCode
            });

            return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?code=${responseCode}`);
        }
    } catch (error) {
        console.error('VNPay callback error:', error);
        return res.redirect(`${process.env.URL_FRONTEND}/checkout/failed?error=${error.message}`);
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

        // Kiểm tra đơn hàng tồn tại và thuộc về user
        const order = await Order.findById(orderId);
        if (!order) {
            throw new ApiError(404, 'Order not found');
        }
        if (order.user_id !== userId) {
            throw new ApiError(403, 'Not authorized to cancel this order');
        }

        // Chỉ cho phép hủy đơn hàng ở trạng thái pending hoặc processing
        if (!['pending', 'processing'].includes(order.order_status)) {
            throw new ApiError(400, 'Order cannot be cancelled');
        }

        // Cập nhật trạng thái đơn hàng
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