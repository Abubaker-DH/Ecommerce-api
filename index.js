require("dotenv").config();
const path = require("path");
const express = require("express");
const Joi = require("joi");
const mongoose = require("mongoose");
const swaggerUI = require("swagger-ui-express");
const YAML = require("yamljs");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const xss = require("xss-clean");
const brands = require("./routes/brands");
const types = require("./routes/types");
const genres = require("./routes/genres");
const orders = require("./routes/orders");
const users = require("./routes/users");
const products = require("./routes/products");
const categories = require("./routes/categories");
const error = require("./middleware/error");
Joi.objectId = require("joi-objectid")(Joi);

const app = express();
app.use(express.json());

// INFO: if we behind a proxy
app.set("trust proxy", 1);
// INFO: use it to limit number of reqest
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

//  INFO: production packages
app.use(cors());
app.use(xss());
app.use(helmet());
app.use(compression());

// INFO: path for ststic file
app.use("/images", express.static(path.join(__dirname, "images")));

// INFO: Swagger
const swaggerDocument = YAML.load("./swagger.yaml");

app.get("/", (req, res) => {
  res.send('<h1">E-Commerce Api </h1><a href="/api-docs">Documentation</a>');
});

// INFO: All app routes
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
app.use("/api/v1/users", users);
app.use("/api/v1/brands", brands);
app.use("/api/v1/types", types);
app.use("/api/v1/genres", genres);
app.use("/api/v1/orders", orders);
app.use("/api/v1/products", products);
app.use("/api/v1/categories", categories);
app.use(error);

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
  )
  .catch((error) => console.log("Error connecting to DB...", error));
