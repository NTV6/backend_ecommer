const config = {
    tmnCode: process.env.VNP_TMN_CODE,
    hashSecret: process.env.VNP_HASH_SECRET,
    url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: process.env.VNP_RETURN_URL
};

module.exports = config;