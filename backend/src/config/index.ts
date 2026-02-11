import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",

    jwt: {
        secret: process.env.JWT_SECRET || "default-secret-change-me",
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    },

    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    },

    database: {
        url: process.env.DATABASE_URL || "file:./dev.db",
    },
};
