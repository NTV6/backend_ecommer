const db = require('../config/database');

class Order {
    static async findById(orderId) {
        const [orders] = await db.query(
            `SELECT o.*, oi.*, p.name as product_name, pv.color, pv.size,
            u.full_name as user_name, u.email as user_email
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN product_variants pv ON oi.variant_id = pv.id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = ?`,
            [orderId]
        );

        if (!orders.length) return null;

        // Cấu trúc lại dữ liệu để gom nhóm các items
        const orderDetails = {
            id: orders[0].id,
            order_id: orders[0].order_id,
            user_id: orders[0].user_id,
            user_name: orders[0].user_name,
            user_email: orders[0].user_email,
            shipping_address: orders[0].shipping_address,
            phone_number: orders[0].phone_number,
            total_amount: orders[0].total_amount,
            payment_method: orders[0].payment_method,
            payment_status: orders[0].payment_status,
            order_status: orders[0].order_status,
            created_at: orders[0].created_at,
            items: orders.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                price: item.price,
                product_name: item.product_name,
                color: item.color,
                size: item.size
            }))
        };

        return orderDetails;
    }

    static async getAllOrders() {
        const [orders] = await db.query(
            `SELECT o.*, 
            u.full_name as user_name,
            u.email as user_email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC`
        );

        return orders;
    }

    static async getOrderByTxnRef(txnRef) {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [txnRef]
        );
        return orders[0];
    }

    static async create(orderData) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const {
                user_id,
                shipping_address,
                phone_number,
                total_amount,
                payment_method,
                items
            } = orderData;

            // Tạo đơn hàng
            const [orderResult] = await conn.query(
                `INSERT INTO orders (
                    user_id, 
                    shipping_address, 
                    phone_number, 
                    total_amount, 
                    payment_method,
                    payment_status,
                    order_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user_id, shipping_address, phone_number, total_amount, payment_method, 'pending', 'processing']
            );
            const orderId = orderResult.insertId;

            // Insert order items
            for (const item of items) {
                await conn.query(
                    `INSERT INTO order_items (
                        order_id, 
                        product_id, 
                        variant_id, 
                        quantity, 
                        price
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.product_id, item.variant_id, item.quantity, item.price]
                );

                // Update product variant stock
                await conn.query(
                    'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.variant_id]
                );
            }

            // Clear user's cart
            await conn.query('DELETE FROM cart_items WHERE user_id = ?', [user_id]);

            await conn.commit();
            return orderId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async updatePaymentStatus(orderId, status) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(
                'UPDATE orders SET payment_status = ? WHERE id = ?',
                [status, orderId]
            );

            await conn.commit();
            return await this.findById(orderId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async updateOrderStatus(orderId, status) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(
                'UPDATE orders SET order_status = ? WHERE id = ?',
                [status, orderId]
            );

            await conn.commit();
            return await this.findById(orderId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = Order;