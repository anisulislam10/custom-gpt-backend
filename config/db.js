const mongoose = require("mongoose");

const connectMongoDB = async () => {
  try {
await mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase to 30 seconds
  socketTimeoutMS: 45000, // Increase to 45 seconds
});    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB error:", error);
  }
};

module.exports = connectMongoDB;