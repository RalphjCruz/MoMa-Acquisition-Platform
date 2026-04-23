const dotenv = require("dotenv");

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? "3001", 10);

module.exports = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.isNaN(parsedPort) ? 3001 : parsedPort
};

