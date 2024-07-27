import express from "express";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { dbConfig } from "../utils/db";
import { HASHING_CONFIG, RESPONSE_MESSAGE_CONST } from "../consts";
const registerRouter = express.Router();

registerRouter.post('/', async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).send('Invalid input');
    }
    console.log("made registeration request! ", req.body);
    try {
        const db = await dbConfig.loadDataBase();
        const passwordHash = await bcrypt.hash(password, HASHING_CONFIG.SALT_ROUNDS);
        const uniqueUserId = uuid();
        const response = await db?.user.set({ email, name, passwordHash, uniqueUserId });
        if (response) {
            res.json(RESPONSE_MESSAGE_CONST.SUCCESS);
        } else {
            res.status(400).send(RESPONSE_MESSAGE_CONST.FAILURE);
        }
    } catch (e) {
        console.log("Error while registering user: ", e);
        res.status(500).send(RESPONSE_MESSAGE_CONST.ERROR);
    }
});

export { registerRouter };
