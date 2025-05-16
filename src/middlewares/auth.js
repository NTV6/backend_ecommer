const admin = require('../config/firebase');

exports.protect = async (req, res, next) => {
    try {
        // Bỏ qua xác thực trong môi trường development
        if (process.env.NODE_ENV === "development") {
            req.user = { id: "test-user", role: "admin" };
            return next();
        }

        // 1) Kiểm tra token
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'Vui lòng đăng nhập để tiếp tục'
            });
        }

        // 2) Xác thực token Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);

        // 3) Gán thông tin user vào request
        req.user = decodedToken;
        next();
    } catch (err) {
        return res.status(401).json({
            status: 'fail',
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {




        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
            return next(); // Bỏ qua kiểm tra role khi test
        }




        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền thực hiện hành động này'
            });
        }
        next();
    };
};