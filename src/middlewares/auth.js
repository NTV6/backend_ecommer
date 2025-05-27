const admin = require('../config/firebase');
const db = require('../config/database');

exports.protect = async (req, res, next) => {
    try {
        // 1) Kiểm tra token
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // 2. Kiểm tra token có tồn tại không
        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'Vui lòng đăng nhập để tiếp tục'
            });
        }

        // 3) Xác thực token Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);

        // 4. Kiểm tra uid có tồn tại không
        if (!decodedToken.uid) {
            return res.status(401).json({
                status: 'error',
                message: 'Token không hợp lệ'
            });
        }

        // 5) Lấy user từ database dựa vào firebase uid
        const [user] = await db.execute(
            'SELECT id, uid, role FROM users WHERE uid = ?',
            [decodedToken.uid]
        );

        if (!user || !user.length) {
            return res.status(401).json({
                status: 'fail',
                message: 'User không tồn tại trong hệ thống'
            });
        }

        // 6) Gán thông tin user vào request
        req.user = {
            id: user[0].id,        // database user id
            uid: user[0].uid,      // firebase uid
            role: user[0].role
        };

        // 5) Gán thông tin user vào request
        // req.user = decodedToken;
        next();
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(401).json({
            status: 'fail',
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền thực hiện hành động này'
            });
        }
        next();
    };
};