const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const vnpayConfig = require('../config/vnpay');

class VNPayService {
    static createPaymentUrl(orderId, amount, ipAddr) {
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');

        const tmnCode = vnpayConfig.tmnCode;
        const secretKey = vnpayConfig.hashSecret;
        let vnpUrl = vnpayConfig.url;

        const returnUrl = vnpayConfig.returnUrl;

        const currCode = 'VND';
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        vnp_Params = this.sortObject(vnp_Params);

        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
        return vnpUrl;
    }

    static sortObject(obj) {
        const sorted = {};
        const str = [];
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (let key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        return sorted;
    }

    static validateCallback(vnpParams) {
        const secureHash = vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        vnpParams = this.sortObject(vnpParams);
        const signData = querystring.stringify(vnpParams, { encode: false });
        const hmac = crypto.createHmac("sha512", vnpayConfig.hashSecret);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

        return secureHash === signed;
    }
}

module.exports = VNPayService;