const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '90d';

class User {
    static async findAll() {
        try {
            const [rows] = await db.query('SELECT id, email, role, full_name, phone_number, address, date_of_birth, profile_picture, created_at FROM users');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query('SELECT id, email, role, full_name, phone_number, address, date_of_birth, profile_picture, created_at FROM users WHERE id = ?', [id]);
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

    static async createUser(userData) {
        const {
            uid,
            full_name,
            email,
            phone_number,
            address,
            date_of_birth,
            role,
            profile_picture
        } = userData;

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            // Log để debug
            console.log('Inserting user data:', {
                uid,
                full_name,
                email,
                phone_number,
                address,
                date_of_birth,
                role
            });
            const [result] = await conn.execute(
                `INSERT INTO users (uid, full_name, email, phone_number, address, date_of_birth, role, profile_picture)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uid, full_name, email, phone_number, address, date_of_birth, role || 'user', profile_picture]
            );

            await conn.commit();
            console.log('User created successfully:', result);
            return result;
        } catch (error) {
            await conn.rollback();
            console.error('Error in createUser:', {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            });
            throw error;
        } finally {
            conn.release();
        }
    };

    static async update(id, userData) {
        try {
            const { username, email, role, full_name, phone_number, address, date_of_birth, profile_picture } = userData;
            await db.query(
                'UPDATE users SET email = ?, role = ?, full_name = ?, phone_number = ?, address = ?, date_of_birth = ?, profile_picture = ? WHERE id = ?',
                [username, email, role, full_name, phone_number, address, date_of_birth, profile_picture, id]
            );
            return { id, username, email, role, full_name, phone_number, address, date_of_birth, profile_picture };
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