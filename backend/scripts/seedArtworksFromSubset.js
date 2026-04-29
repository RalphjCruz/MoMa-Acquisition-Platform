const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const { seedArtworksFromSubset } = require("../src/services/seed.service");

const parseArgValue = (name, fallback = "") => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) {
    return fallback;
  }
  return arg.slice(prefix.length);
};

const run = async () => {
  try {
    const subsetFileName = parseArgValue("file", "moma_subset_200.json");
    const ifData = parseArgValue("if-data", "skip");

    await connectDatabase();
    const result = await seedArtworksFromSubset({ subsetFileName, ifData });
    console.log("Seed result:", result);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

run();
