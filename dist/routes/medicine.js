"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const consts_1 = require("./../consts");
const express_1 = __importDefault(require("express"));
const db_1 = require("../utils/db");
const medicineRouter = express_1.default.Router();
medicineRouter.get("/", (req, res) => {
    res.send("Medicine route's operational!");
});
medicineRouter.get("/all", async (req, res) => {
    try {
        const { uniqueUserId } = req.query;
        const db = await db_1.dbConfig.loadDataBase();
        const medicines = db === null || db === void 0 ? void 0 : db.medicineStore.get({ uniqueUserId });
        res.json(medicines);
    }
    catch (e) {
        console.log("## error in /medicine/all: ", e);
        res.status(500).send("Error in fetching medicine!");
    }
});
medicineRouter.post("/storeMedicine", async (req, res) => {
    try {
        const _a = req.body, { uniqueUserId } = _a, medicine = __rest(_a, ["uniqueUserId"]);
        if (!medicine || !uniqueUserId) {
            res.status(400).send("Data missing!");
            return;
        }
        const db = await db_1.dbConfig.loadDataBase();
        await (db === null || db === void 0 ? void 0 : db.medicineStore.set(Object.assign({ uniqueUserId }, medicine)));
        res.send(consts_1.RESPONSE_MESSAGE_CONST.SUCCESS);
    }
    catch (e) {
        console.log("## error in /storeMedicine: ", e);
        res.status(500).send("Error in storing medicine!");
    }
});
