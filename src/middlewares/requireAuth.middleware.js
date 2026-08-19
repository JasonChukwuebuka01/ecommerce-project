const jwt = require("jsonwebtoken");

const requireAuth = async (req, res, next) => {
    const authHeader = req.header("Authorization");

    // check for authourization header
    if(!authHeader || !authHeader.startsWith(`Bearer `)){
        return res.status(401).json({
            error: `Access denied - no token`
        });
    }

    // extract token
    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // store decoded jwt payload
        req.user = payload;
        
        next();
        
    } catch (error) {
        console.log("JWT ERROR:", error.message);

        res.status(401).json({
            error: `Invalid or expired token`
        });
        
    }
}

module.exports = requireAuth