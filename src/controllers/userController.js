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

        // Kiểm tra xem người dùng đã tồn tại chưa
        const existingUser = await User.findByUid(decodedToken.uid);
        if (existingUser) {
            // Nếu người dùng đã tồn tại, trả về thông tin người dùng
            return res.status(200).json({
                status: 'success',
                message: 'Người dùng đã tồn tại',
                data: {
                    uid: existingUser.uid,
                    email: existingUser.email,
                    full_name: existingUser.full_name
                }
            });
        }

        // Tạo người dùng mới trong cơ sở dữ liệu
        const userData = {
            uid: decodedToken.uid,
            email,
            full_name,
            phone_number: phone_number || '',  // Đặt giá trị mặc định là chuỗi rỗng
            address: address || '',            // Đặt giá trị mặc định là chuỗi rỗng
            date_of_birth: date_of_birth || null,  // Đặt giá trị mặc định là null
            profile_picture: profile_picture || '', // Đặt giá trị mặc định là chuỗi rỗng
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

exports.updateImageProfile = async (req, res) => {
    try {
        // Nhận ID người dùng Firebase từ mã thông báo được xác thực
        const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization.split(' ')[1]);

        // Tìm người dùng theo UID Firebase
        const existingUser = await User.findByUid(decodedToken.uid);

        if (!existingUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        // Cập nhật chỉ các trường được phép
        const allowedFields = {
            profile_picture: req.body.profile_picture
        };

        // Xóa các trường không xác định
        Object.keys(allowedFields).forEach(key =>
            allowedFields[key] === undefined && delete allowedFields[key]
        );

        // Cập nhật người dùng trong cơ sở dữ liệu
        const updatedUser = await User.updateImageProfile(existingUser.id, allowedFields);

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error updating profile'
        });
    }
};

exports.updateInfoProfile = async (req, res) => {
    try {
        // Nhận ID người dùng Firebase từ mã thông báo được xác thực
        const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization.split(' ')[1]);

        // Tìm người dùng theo UID Firebase
        const existingUser = await User.findByUid(decodedToken.uid);

        if (!existingUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        // Cập nhật chỉ các trường được phép
        const allowedFields = {
            full_name: req.body.full_name,
            phone_number: req.body.phone_number,
            address: req.body.address,
            date_of_birth: req.body.date_of_birth
        };

        // Xóa các trường không xác định
        Object.keys(allowedFields).forEach(key =>
            allowedFields[key] === undefined && delete allowedFields[key]
        );

        // Cập nhật người dùng trong cơ sở dữ liệu
        const updatedUser = await User.updateInfoProfile(existingUser.id, allowedFields);

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error updating profile'
        });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Vai trò không hợp lệ'
            });
        }

        const updatedUser = await User.updateRole(userId, role);

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            status: 'success',
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
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