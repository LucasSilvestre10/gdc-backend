export const mongooseConfig = {
  id: "default",
  // Usa variável de ambiente quando disponível (ex.: em Docker Compose)
  url:
    process.env.MONGO_URL ||
    "mongodb://admin:secret@localhost:27017/appdb?authSource=admin",
  connectionOptions: {},
};
