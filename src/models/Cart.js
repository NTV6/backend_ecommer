const db = require('../config/database');

class Cart {
    static async getCartByUserId(userId) {
        const conn = await db.getConnection();
        try {
            const [items] = await conn.query(
                `SELECT 
                ci.*,
                p.name as product_name,
                pv.color,
                pv.size,
                pv.price,
                pv.stock,
                (SELECT pvi.image 
                 FROM product_variant_images pvi 
                 WHERE pvi.variant_id = ci.variant_id 
                 AND pvi.is_thumbnail = 1 
                 LIMIT 1) as image_url
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            JOIN product_variants pv ON ci.variant_id = pv.id
            WHERE ci.user_id = ?`,
                [userId]
            );
            return items;
        } finally {
            conn.release();
        }
    }

    static async addToCart(userId, productId, variantId, quantity) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Kiểm tra xem sản phẩm và biến thể có tồn tại không
            const [variant] = await conn.query(
                `SELECT pv.*, p.name as product_name, pvi.image as image_url 
                 FROM product_variants pv 
                 JOIN products p ON pv.product_id = p.id
                 LEFT JOIN product_variant_images pvi ON pv.id = pvi.variant_id
                 WHERE pv.id = ? AND pv.product_id = ? AND pvi.is_thumbnail = 1`,
                [variantId, productId]
            );

            if (!variant.length) {
                throw new Error('Sản phẩm không tồn tại');
            }

            // Kiểm tra kho hàng
            if (variant[0].stock < quantity) {
                throw new Error('Số lượng trong kho không đủ');
            }

            // Kiểm tra xem sản phẩm đã tồn tại trong giỏ hàng chưa
            const [existingItem] = await conn.query(
                'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?',
                [userId, productId, variantId]
            );

            if (existingItem.length > 0) {
                // Cập nhật số lượng nếu mặt hàng tồn tại
                await conn.query(
                    'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ? AND variant_id = ?',
                    [quantity, userId, productId, variantId]
                );
            } else {
                // Chèn mục mới nếu nó không tồn tại
                await conn.query(
                    'INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
                    [userId, productId, variantId, quantity]
                );
            }

            await conn.commit();
            return await this.getCartByUserId(userId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async updateQuantity(userId, productId, variantId, quantity) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Kiểm tra xem sản phẩm có trong giỏ hàng không
            const [existingItem] = await conn.query(
                'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?',
                [userId, productId, variantId]
            );

            if (!existingItem.length) {
                throw new Error('Sản phẩm không tồn tại trong giỏ hàng');
            }

            // Kiểm tra tình trạng còn hàng
            const [variant] = await conn.query(
                'SELECT stock FROM product_variants WHERE id = ? AND product_id = ?',
                [variantId, productId]
            );

            if (!variant.length || variant[0].stock < quantity) {
                throw new Error('Số lượng trong kho không đủ');
            }

            // Cập nhật số lượng
            await conn.query(
                'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ? AND variant_id = ?',
                [quantity, userId, productId, variantId]
            );

            await conn.commit();
            return await this.getCartByUserId(userId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async removeFromCart(userId, productId, variantId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(
                'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?',
                [userId, productId, variantId]
            );

            await conn.commit();
            return await this.getCartByUserId(userId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async clearCart(userId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

            await conn.commit();
            return [];
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = Cart;