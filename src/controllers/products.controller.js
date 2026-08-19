const Product = require("../models/products.model");
const mongoose = require("mongoose");





// controllers/products.controller.js
const getAllProducts = async (req, res, next) => {
  try {
    const { page, limit, sort, search, category } = req.query;

  
    const queryObject = {};

  
    if (category) {
      queryObject.category = category;
    }

    
    if (search) {
      queryObject.name = { $regex: search , $options : "i"};
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 8;
    const skip = (pageNum - 1) * limitNum;

    const sortBy = sort || "-createdAt";

    const products = await Product.find(queryObject)
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum);

   
    const totalProducts = await Product.countDocuments(queryObject);

    return res.status(200).json({
      success: true,
      count: products.length,       
      totalProducts,                
      totalPages: Math.ceil(totalProducts / limitNum), 
      currentPage: pageNum,
      data: products,
    });
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
