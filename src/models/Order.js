const db = require('../config/database');

class Order {
    static async findAll() {
        try {
            const [rows] = await db.query(`
        SELECT o.*, u.name as user_name 
        FROM orders o
        JOIN users u ON o.user_id = u.id
      `);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [orderRows] = await db.query(`
        SELECT o.*, u.name as user_name 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [id]);

            const order = orderRows[0];

            if (!order) return null;

            const [itemRows] = await db.query(`
        SELECT oi.*, p.name as product_name, p.price as product_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

            order.items = itemRows;

            return order;
        } catch (error) {
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const [rows] = await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async create(orderData) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            const { user_id, status = 'pending', total_amount, items } = orderData;

            // Create order
            const [orderResult] = await conn.query(
                'INSERT INTO orders (user_id, status, total_amount, created_at) VALUES (?, ?, ?, NOW())',
                [user_id, status, total_amount]
            );

            const orderId = orderResult.insertId;

            // Create order items
            for (const item of items) {
                await conn.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price]
                );

                // Update product stock
                await conn.query(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            await conn.commit();

            return await this.findById(orderId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async updateStatus(id, status) {
        try {
            await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
            return await this.findById(id);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Order;