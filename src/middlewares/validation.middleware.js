const validate = (schema, target = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(",");
        
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: errorMessage,
      });
    }

    req[target] = value;
    next();
  };
};

module.exports = validate;
