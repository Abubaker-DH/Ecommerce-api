require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());


app.get("/", (req, res) => {
  res.send('<h1"> Ecommerce Api </h1>');
});

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() =>
    app.listen(PORT, () => console.log(`server running on port ${PORT} ...`))
  );
