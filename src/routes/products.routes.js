const productsRouter = require("express").Router();

const {
    getAllProducts,
    addProduct,
    getProductById, 
    updateProduct,
    deleteProduct,
} = require("../controllers/products.controller");

const validate = require("../middlewares/validation.middleware");

const { 
    createProductSchema, 
    getProductsQuerySchema, 
    objectIdSchema 
} = require("../validations/products.schema");


productsRouter.get("/", validate(getProductsQuerySchema, "query"), getAllProducts);

productsRouter.post("/", validate(createProductSchema), addProduct);

productsRouter.get("/:id", validate(objectIdSchema, "params"), getProductById);

productsRouter.put("/:id", validate(objectIdSchema, "params"), updateProduct);

productsRouter.delete("/:id", validate(objectIdSchema, "params"), deleteProduct);





module.exports = productsRouter;