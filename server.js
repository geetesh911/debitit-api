const express = require("express");
const connectDB = require("./config/db");

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization,x-auth-token"
  );

  // Pass to next layer of middleware
  next();
});

// Routes
app.get("/", (req, res) => res.json({ msg: "Welcome to Debitit" }));

app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/creditor", require("./routes/creditor"));
app.use("/api/purchase", require("./routes/purchase"));
app.use("/api/purchasereturn", require("./routes/purchaseReturn"));
app.use("/api/product", require("./routes/product"));
app.use("/api/customer", require("./routes/customer"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/salesreturn", require("./routes/salesReturn"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
