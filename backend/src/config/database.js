const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { mongoDbName, mongoUri, useInMemoryDb } = require("./env");

let memoryServer = null;

const resolveMongoUri = async () => {
  if (useInMemoryDb) {
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: mongoDbName }
    });

    return memoryServer.getUri();
  }

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is required when USE_IN_MEMORY_DB=false."
    );
  }

  return mongoUri;
};

const connectDatabase = async () => {
  const connectionUri = await resolveMongoUri();

  await mongoose.connect(connectionUri, {
    dbName: mongoDbName
  });

  console.log(`MongoDB connected (${useInMemoryDb ? "in-memory" : "external"})`);
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase
};

