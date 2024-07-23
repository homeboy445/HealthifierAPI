"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoute = void 0;
const express_1 = __importDefault(require("express"));
const db_1 = require("../utils/db");
const uuid_1 = require("uuid");
const consts_1 = require("../consts");
const userRoute = express_1.default.Router();
exports.userRoute = userRoute;
userRoute.get("/", (req, res) => {
    res.send("Route's operational!");
});
userRoute.get('/all', async (req, res) => {
    try {
        console.log("requested for all users!");
        const dbInstance = await db_1.dbConfig.loadDataBase("healthifier");
        if (!dbInstance) {
            res.status(500).send('Database not loaded');
            return;
        }
        const users = await dbInstance.user.get() || [];
        res.json(users);
    }
    catch (e) {
        console.log("error while fetching users", e);
        res.status(400).json(consts_1.RESPONSE_MESSAGE_CONST.ERROR);
    }
});
// TODO: Add DB closing logic as well!
userRoute.get('/get/:id', async (req, res) => {
    console.log("requested for getting user!");
    const { id } = req.params;
    console.log("ID: ", id);
    if (!id) {
        res.status(400).send('Missing id');
        return;
    }
    const dbInstance = await db_1.dbConfig.loadDataBase("healthifier");
    if (!dbInstance) {
        res.status(500).send('Database not loaded');
        return;
    }
    const user = await dbInstance.user.get({ uniqueUserId: id });
    res.json(user);
});
userRoute.post('/add', async (req, res) => {
    console.log("requested for adding user!");
    const { name, email, passwordHash } = req.body;
    if (!name || !email || !passwordHash) {
        res.status(400).send('Missing fields');
        return;
    }
    const dbInstance = await db_1.dbConfig.loadDataBase("healthifier");
    if (!dbInstance) {
        res.status(500).send('Database not loaded');
        return;
    }
    const uniqueUserId = (0, uuid_1.v4)();
    const status = await dbInstance.user.set({ name, email, passwordHash, uniqueUserId });
    if (status == 1) {
        res.json({ userId: uniqueUserId });
        console.log("success!");
    }
    else {
        res.status(400).json(consts_1.RESPONSE_MESSAGE_CONST.FAILURE);
    }
});
