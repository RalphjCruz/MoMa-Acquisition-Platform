const dotenv = require("dotenv");

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? "3001", 10);
const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
};

module.exports = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.isNaN(parsedPort) ? 3001 : parsedPort,
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDbName: process.env.MONGODB_DB_NAME ?? "moma_acquisition_platform",
  useInMemoryDb: parseBoolean(process.env.USE_IN_MEMORY_DB, true),
  autoSeedOnStart: parseBoolean(process.env.AUTO_SEED_ON_START, true),
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? "change-me-in-env",
  authTokenTtl: process.env.AUTH_TOKEN_TTL ?? "7d"
};
