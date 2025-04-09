const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '90d';

class User {
    static async findAll() {
        try {
            const [rows] = await db.query('SELECT id, name, email, role FROM users');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(userData) {
        try {
            const { name, email, password, role = 'user' } = userData;

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const [result] = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, role]
            );

            return {
                id: result.insertId,
                name,
                email,
                role
            };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, userData) {
        try {
            const { name, email, role } = userData;
            await db.query(
                'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
                [name, email, role, id]
            );
            return { id, name, email, role };
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            await db.query('DELETE FROM users WHERE id = ?', [id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    static async login(email, password) {
        try {
            // 1) Check if email and password exist
            if (!email || !password) {
                throw new Error('Vui lòng cung cấp email và mật khẩu!');
            }

            // 2) Check if user exists && password is correct
            const user = await this.findByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new Error('Email hoặc mật khẩu không chính xác!');
            }

            // 3) Generate JWT token
            const token = jwt.sign(
                { id: user.id, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // 4) Return user without password
            const { password: _, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword,
                token
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;