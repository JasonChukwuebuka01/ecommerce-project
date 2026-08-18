const express = require("express");
const productsRouter = require("./src/routes/products.routes");
const globalError = require("./src/middlewares/error.middleware");
const connectDb = require("./src/databaseConfig/connectDb");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.Port;

connectDb();

app.use(express.json());
app.use(cors());

//routes
app.use("/api/products", productsRouter);

app.get("/", (req, res) => {
  res.send("Api is healthy");
});

app.use(globalError);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
