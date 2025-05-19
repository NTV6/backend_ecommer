const admin = require("../config/firebase");
const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();

        res.status(200).json({
            status: 'success',
            results: users.length,
            data: { users }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng với ID này'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        const newUser = await User.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { user: newUser }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.update(req.params.id, req.body);

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.delete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.signup = async (req, res) => {
    try {
        const {
            token,
            full_name,
            email,
            phone_number,
            address,
            date_of_birth,
            profile_picture
        } = req.body;

        // Xác thực các trường bắt buộc
        if (!token || !email || !full_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: token, email, full_name'
            });
        }

        // Xác minh mã thông báo Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Tạo người dùng trong cơ sở dữ liệu
        const userData = {
            uid: decodedToken.uid,
            email,
            full_name,
            phone_number: phone_number || null,
            address: address || null,
            date_of_birth: date_of_birth || null,
            profile_picture: profile_picture || null,
            role: 'user'
        };

        await User.createUser(userData);

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                uid: decodedToken.uid,
                email,
                full_name
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Registration failed'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await User.login(email, password);

        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(401).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        // Lấy thông tin từ token đã decode trong middleware auth
        const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization.split(' ')[1]);

        // Tìm user trong database bằng uid từ Firebase
        const user = await User.findByUid(decodedToken.uid);

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        // Loại bỏ các thông tin nhạy cảm
        const { password, ...userInfo } = user;

        res.status(200).json({
            status: 'success',
            data: userInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};