const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend server is running.");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});