const productsRouter = require("express").Router();
const {getAllProducts, addProduct } = require("../controllers/products.controller")
const validate = require("../middlewares/validation.middleware");
const  {createProductSchema }= require("../validations/products.schema")






productsRouter.get("/", getAllProducts );
productsRouter.post("/", validate(createProductSchema), addProduct );




module.exports = productsRouter;