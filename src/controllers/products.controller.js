const Product = require("../models/products.model");




const getAllProducts = async (req, res, next) =>{
    return res.status(200).json({message: "All products"})
};





module.exports ={getAllProducts}