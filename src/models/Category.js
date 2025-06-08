const db = require('../config/database');

class Category {
    static async findAll() {
        try {
            const [rows] = await db.query('SELECT * FROM categories');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(categoryData) {
        try {
            const { name, description, image, image_public_id } = categoryData;
            const [result] = await db.query(
                'INSERT INTO categories (name, description, image, image_public_id) VALUES (?, ?, ?, ?)',
                [name, description, image, image_public_id]
            );
            return { id: result.insertId, name, description, image, image_public_id };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, categoryData) {
        try {
            const { name, description, image, image_public_id } = categoryData;
            await db.query(
                'UPDATE categories SET name = ?, description = ?, image=?, image_public_id=? WHERE id = ?',
                [name, description, image, image_public_id, id]
            );
            return { id, name, description, image, image_public_id };
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            await db.query('DELETE FROM categories WHERE id = ?', [id]);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Category;