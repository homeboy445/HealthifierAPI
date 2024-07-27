import bcrypt from 'bcrypt';
import express from "express";
import jwt from "jsonwebtoken";
import { dbConfig } from "../utils/db";
import { FAILURE_TYPES } from "../consts";
import JWTGenerator from '../utils/jwtUtils';

const loginRouter = express.Router();

loginRouter.post("/", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        console.log("Invalid credentials");
        return res.status(401).send(FAILURE_TYPES.LOGIN_FAILURES.INVALID_CREDENTIALS);
    }
    try {
        console.log("login attempt! ", email);
        const db = await dbConfig.loadDataBase();
        const doesUserExist = await db?.user.get({ email });
        if (!doesUserExist) {
            console.log("User does not exist");
            return res.status(401).send(FAILURE_TYPES.LOGIN_FAILURES.USER_DOES_NOT_EXIST);
        }
        const { passwordHash, refreshToken,  ...jwtPayload } = doesUserExist;
        const doesPasswordMatch = await bcrypt.compare(password, passwordHash);
        if (!doesPasswordMatch) {
            console.log("Password does not match");
            return res.status(401).send(FAILURE_TYPES.LOGIN_FAILURES.PASSWORD_DOES_NOT_MATCH);
        }
        const accessToken = JWTGenerator.generateAccessToken({ ...jwtPayload });
        const newRefreshToken = JWTGenerator.generateRefreshToken({ ...jwtPayload });
        await db?.user.set({ ...doesUserExist, refreshToken: newRefreshToken, update: true });
        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (e) {
        console.log("Error while logging in: ", e);
        res.status(500).send(FAILURE_TYPES.INTERNAL_ERROR);
    }
});

loginRouter.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        console.log("Refresh token not provided");
        return res.sendStatus(401);
    }
    if (!process.env.JWT_REFRESH_TOKEN_SECRET_KEY) {
        console.log("JWT refresh token secret key not found");
        return res.status(500).send(FAILURE_TYPES.INTERNAL_ERROR);
    }
    try {
        jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET_KEY, async (err: any, user: any) => {
            if (err) {
                console.log("Error while verifying refresh token: ", err);
                return res.sendStatus(403);
            }
            if (!user || !user.email || !user.uniqueUserId) {
                console.log("Invalid refresh token ", user);
                return res.status(401).send(FAILURE_TYPES.LOGIN_FAILURES.INVALID_REFRESH_TOKEN);
            }
            try {
                const db = await dbConfig.loadDataBase();
                const doesUserExist = await db?.user.get({ uniqueUserId: user.uniqueUserId });
                if (!doesUserExist) {
                    console.log("User does not exist");
                    return res.status(401).json(FAILURE_TYPES.LOGIN_FAILURES.USER_DOES_NOT_EXIST);                
                }
                if (doesUserExist.refreshToken !== refreshToken) {
                    console.log("Invalid refresh token");
                    return res.status(401).send(FAILURE_TYPES.LOGIN_FAILURES.INVALID_REFRESH_TOKEN);
                }
                const payload = { email: doesUserExist.email, name: doesUserExist.name, uniqueUserId: doesUserExist.uniqueUserId };
                const accessToken = JWTGenerator.generateAccessToken(payload);
                const newRefreshToken = JWTGenerator.generateRefreshToken(payload);
                res.json({ accessToken, refreshToken: newRefreshToken });
            } catch (e) {
                console.log("Error while refreshing token (in callback): ", e);
                res.status(500).send(FAILURE_TYPES.INTERNAL_ERROR);
            }
        });
    } catch (e) {
        console.log("Error while refreshing token: ", e);
        res.status(500).send(FAILURE_TYPES.INTERNAL_ERROR);
    }
});

export { loginRouter };
