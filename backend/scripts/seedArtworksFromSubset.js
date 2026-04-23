const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const { seedArtworksFromSubset } = require("../src/services/seed.service");

const run = async () => {
  try {
    await connectDatabase();
    const result = await seedArtworksFromSubset();
    console.log("Seed result:", result);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

run();

