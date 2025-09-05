export const mongooseConfig = {
  id: "default",
  url: "mongodb://admin:secret@localhost:27017/appdb?authSource=admin",
  connectionOptions: {},
};
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

export async function connectInMemoryMongo() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return mongoServer;
}

export async function disconnectInMemoryMongo(mongoServer: MongoMemoryServer) {
  await mongoose.disconnect();
  await mongoServer.stop();
}
