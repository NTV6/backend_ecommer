const Order = require('../models/Order');

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll();

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn hàng với ID này'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { order }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.params.userId);

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const newOrder = await Order.create({
            ...req.body,
            user_id: req.user.id // Lấy từ middleware auth
        });

        res.status(201).json({
            status: 'success',
            data: { order: newOrder }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.updateStatus(req.params.id, req.body.status);

        res.status(200).json({
            status: 'success',
            data: { order }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};
