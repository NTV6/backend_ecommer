const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.protect = async (req, res, next) => {
    try {


        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
            req.user = { id: "test-user", role: "admin" }; // Gán user giả định để test
            return next();
        }




        // 1) Get token
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'Bạn chưa đăng nhập! Vui lòng đăng nhập để tiếp tục.'
            });
        }

        // 2) Verify token
        const decoded = await promisify(jwt.verify)(token, JWT_SECRET);

        // 3) Check if user still exists (would require a database query in a real app)
        // 4) Set user to req object
        req.user = decoded;
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