const admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert(require("../firebase-service-account.json")),
});

module.exports = admin;
