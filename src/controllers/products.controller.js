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





const getProductById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const findProduct = await Product.findById(id);

    if (!findProduct) {
      return res.status(404).json({ message: "No product found" });
    }

    res.status(200).json({ message: "Product found", product: findProduct });
  } catch (err) {
    next(err);
  }
};




const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "No product found" });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    next(err);
  }
};





module.exports = { getAllProducts, addProduct, getProductById, updateProduct};
