const Product = require("../models/products.model");
const mongoose = require("mongoose");

const getAllProducts = async (req, res, next) => {
  try {
    const allProducts = await Product.find({});

    return res.status(200).json({ products: allProducts });
  } catch (err) {
    next(err);
  }
};


const addProduct = async (req, res, next) => {
  try {
    const { name, price, description, category, inStock } = req.body;

    const newProduct = await Product.create({
      name,
      price,
      description,
      category,
      inStock,
    });

    return res.status(201).json({
      message: "Product Saved in Inventory",
      product: newProduct,
    });
  } catch (err) {
    next(err);
  }
};







module.exports = { getAllProducts, addProduct };
