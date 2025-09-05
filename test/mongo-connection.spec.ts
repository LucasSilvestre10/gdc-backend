import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const MONGO_URL = "mongodb://admin:secret@localhost:27017/appdb?authSource=admin";
let connection: mongoose.Connection;

describe("MongoDB Docker Connection", () => {
  beforeAll(async () => {
    connection = await mongoose.createConnection(MONGO_URL).asPromise();
  });

  afterAll(async () => {
    await connection.close();
  });

  it("deve conectar ao MongoDB Docker e retornar o nome do banco", async () => {
    expect(connection.name).toBe("appdb");
    expect(connection.readyState).toBe(1); // 1 = conectado
  });
});
