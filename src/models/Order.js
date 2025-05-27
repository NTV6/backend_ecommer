const db = require('../config/database');

class Order {
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

    static async findById(orderId) {
        const [orders] = await db.query(
            `SELECT o.*, oi.*, p.name as product_name, pv.color, pv.size
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN product_variants pv ON oi.variant_id = pv.id
         WHERE o.id = ?`,
            [orderId]
        );

        if (!orders.length) return null;

        const orderDetails = {
            ...orders[0],
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

        // Remove duplicated fields from root level
        delete orderDetails.product_id;
        delete orderDetails.variant_id;
        delete orderDetails.quantity;
        delete orderDetails.price;
        delete orderDetails.product_name;
        delete orderDetails.color;
        delete orderDetails.size;

        return orderDetails;
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

    static async getOrderByTxnRef(txnRef) {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [txnRef]
        );
        return orders[0];
    }
}

module.exports = Order;