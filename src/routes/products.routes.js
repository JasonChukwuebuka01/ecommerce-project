const productsRouter = require("express").Router();
const {getAllProducts} = require("../controllers/products.controller")



productsRouter.get("/", getAllProducts );




module.exports = productsRouter;