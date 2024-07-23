"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_1 = require("./utils/db");
const users_1 = require("./routes/users");
const socketHandler_1 = require("./socketHandler");
const app = (0, express_1.default)();
const port = process.env.PORT || 3010;
// Middleware
app.use(body_parser_1.default.json());
app.use("/users", users_1.userRoute);
// Routes
app.get('/', (req, res) => {
    res.send("Server's running!");
});
app.get('/health', async (req, res) => {
    try {
        console.log("running health check!");
        const response = await db_1.dbConfig.runHealthCheck();
        res.json(response);
    }
    catch (error) {
        console.log("## error while running health check: ", error);
        res.status(500).send('Health check failed');
    }
});
const serverInstance = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
const socketHandler = new socketHandler_1.HealthifierSocketManager(serverInstance);
socketHandler.initializeSocket();
