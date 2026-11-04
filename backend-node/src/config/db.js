import mongoose from 'mongoose';

/**
 * Establece la conexión asíncrona con MongoDB usando Mongoose.
 * Lee la URI desde la variable de entorno MONGODB_URI.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[DB] MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Error al conectar con MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

