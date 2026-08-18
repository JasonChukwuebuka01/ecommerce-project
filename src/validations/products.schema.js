const Joi = require("joi");

// Schema for POST /api/products (Create product)
const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().messages({
    "string.base": "Product name must be a string",
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 2 characters",
    "string.max": "Product name cannot exceed 60 characters",
    "any.required": "Product name is a required field",
  }),

  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a valid number",
    "number.min": "Price cannot be less than 0",
    "any.required": "Price is a required field",
  }),

  description: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.base": "Description must be a string",
    "string.max": "Description cannot exceed 1000 characters",
  }),

  category: Joi.string().trim().required().messages({
    "string.base": "Category must be a string",
    "string.empty": "Category is required",
    "any.required": "Category is a required field",
  }),

  inStock: Joi.boolean().default(true).messages({
    "boolean.base": "inStock must be a boolean value (true or false)",
  }),
});





module.exports = {
  createProductSchema,

};