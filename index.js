require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const brands = require("./routes/brands");
const users = require("./routes/users");
const productes = require("./routes/products");
const categories = require("./routes/categories");

const app = express();
app.use(express.json());

// INFO: path for ststic file
app.use("/images", express.static(path.join(__dirname, "images")));

// INFO: All app routes
app.get("/", (req, res) => {
  res.send('<h1"> Ecommerce Api </h1>');
});
app.use("/api/v1/users", users);
app.use("/api/v1/brands", brands);
app.use("/api/v1/productes", productes);
app.use("/api/v1/categories", categories);

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;

// INFO: Connect to mongoDB and run the server
mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() =>
    app.listen(PORT, () => console.log(`server running on port ${PORT} ...`))
  );
