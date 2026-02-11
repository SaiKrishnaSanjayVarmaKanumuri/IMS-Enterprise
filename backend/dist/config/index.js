"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
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
//# sourceMappingURL=index.js.map