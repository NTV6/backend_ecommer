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

    static async findByUid(uid) {
        try {
            const [rows] = await db.query(
                `SELECT id, uid, email, full_name, phone_number, address, 
             date_of_birth, profile_picture, role, created_at 
             FROM users WHERE uid = ?`,
                [uid]
            );
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
            const [result] = await conn.execute(
                `INSERT INTO users (uid, full_name, email, phone_number, address, date_of_birth, role, profile_picture)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uid, full_name, email, phone_number, address, date_of_birth, role || 'user', profile_picture]
            );
            await conn.commit();
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

    static async updateInfoProfile(id, userData) {
        try {
            const { full_name, phone_number, address, date_of_birth } = userData;
            await db.query(
                'UPDATE users SET full_name = ?, phone_number = ?, address = ?, date_of_birth = ? WHERE id = ?',
                [full_name, phone_number, address, date_of_birth, id]
            );
            return { id, full_name, phone_number, address, date_of_birth };
        } catch (error) {
            throw error;
        }
    }

    static async updateImageProfile(id, userData) {
        try {
            const { profile_picture } = userData;
            await db.query(
                'UPDATE users SET profile_picture = ? WHERE id = ?',
                [profile_picture, id]
            );
            return { id, profile_picture };
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
            // 1) Kiểm tra xem email và mật khẩu có tồn tại không
            if (!email || !password) {
                throw new Error('Vui lòng cung cấp email và mật khẩu!');
            }

            // 2) Kiểm tra xem người dùng có tồn tại không và mật khẩu có đúng không
            const user = await this.findByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new Error('Email hoặc mật khẩu không chính xác!');
            }

            // 3) Tạo mã thông báo JWT
            const token = jwt.sign(
                { id: user.id, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // 4) Trả về người dùng mà không có mật khẩu
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