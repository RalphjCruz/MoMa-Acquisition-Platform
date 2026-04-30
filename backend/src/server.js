const app = require("./app");
const { autoSeedOnStart, port, nodeEnv, authJwtSecret } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { seedArtworksFromSubset } = require("./services/seed.service");

let server = null;
const DEFAULT_JWT_SECRET = "change-me-in-env";

const closeServer = async (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await disconnectDatabase();
  process.exit(0);
};

const start = async () => {
  try {
    if (nodeEnv !== "development" && authJwtSecret === DEFAULT_JWT_SECRET) {
      console.warn(
        "WARNING: AUTH_JWT_SECRET is using the default value. Set a strong secret in your environment."
      );
    }

    await connectDatabase();

    if (autoSeedOnStart) {
      const seedResult = await seedArtworksFromSubset();
      if (seedResult.seeded) {
        console.log(
          `Seeded artworks: ${seedResult.importedRecords} records imported.`
        );
      } else {
        console.log(`Seed skipped: ${seedResult.reason}`);
      }
    }

    server = app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });

    process.on("SIGINT", () => closeServer("SIGINT"));
    process.on("SIGTERM", () => closeServer("SIGTERM"));
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
};

start();
