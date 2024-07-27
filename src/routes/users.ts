import express from 'express';
import { User } from '../types';
import { dbConfig } from '../utils/db';
import { v4 as uuidV4 } from 'uuid';
import { RESPONSE_MESSAGE_CONST } from '../consts';

const userRoute = express.Router();

userRoute.get("/", (req, res) => {
    res.send("Route's operational!");
});

userRoute.get('/all', async (req, res) => {
    try {
        console.log("requested for all users!");
        const dbInstance = await dbConfig.loadDataBase("healthifier");
        if (!dbInstance) {
            res.status(500).send('Database not loaded');
            return;
        }
        const users = await dbInstance.user.getAll() || [];
        res.json(users.map((user) => { return { email: user.email, name: user.name }; }));
    } catch (e) {
        console.log("error while fetching users", e);
        res.status(400).json(RESPONSE_MESSAGE_CONST.ERROR);
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
    const dbInstance = await dbConfig.loadDataBase("healthifier");
    if (!dbInstance) {
        res.status(500).send('Database not loaded');
        return;
    }
    const user = await dbInstance.user.get({ uniqueUserId: id });
    res.json(user);
});

userRoute.post('/add', async (req, res) => {
    console.log("requested for adding user!");
    const { name, email, passwordHash } = req.body as User;
    if (!name || !email || !passwordHash) {
        res.status(400).send('Missing fields');
        return;
    }
    const dbInstance = await dbConfig.loadDataBase("healthifier");
    if (!dbInstance) {
        res.status(500).send('Database not loaded');
        return;
    }
    const uniqueUserId = uuidV4();
    const status = await dbInstance.user.set({ name, email, passwordHash, uniqueUserId });
    if (status == 1) {
        res.json({ userId: uniqueUserId });
        console.log("success!");
    } else {
        res.status(400).json(RESPONSE_MESSAGE_CONST.FAILURE);
    }
});

export { userRoute };
