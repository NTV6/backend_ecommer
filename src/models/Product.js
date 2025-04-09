const db = require('../config/database');

class Product {
    static async findAll() {
        try {
            const [rows] = await db.query('SELECT * FROM products');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findPublicIdById(id) {
        try {
            const [rows] = await db.query('SELECT image_public_id FROM products WHERE id = ?', [id]);
            return rows[0]?.image_public_id;
        } catch (error) {
            throw error;
        }
    }

    static async create(productData) {
        try {
            const { name, description, price, stock, category_id, image_url, image_public_id } = productData;
            const [result] = await db.query(
                'INSERT INTO products (name, description, price, stock, category_id, image_url, image_public_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [name, description, price, stock, category_id, image_url, image_public_id]
            );
            return { id: result.insertId, ...productData };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, productData) {
        try {
            const { name, description, price, stock, category_id, image_url, image_public_id } = productData;
            await db.query(
                'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image_url = ?, image_public_id = ? WHERE id = ?',
                [name, description, price, stock, category_id, image_url, image_public_id, id]
            );
            return { id, ...productData };
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            await db.query('DELETE FROM products WHERE id = ?', [id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    static async findByCategory(categoryId) {
        try {
            const [rows] = await db.query('SELECT * FROM products WHERE category_id = ?', [categoryId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Product;