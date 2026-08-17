const mongoose = require("mongoose");
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1'])




async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};


module.exports = connectDb;