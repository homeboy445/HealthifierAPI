import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { FAILURE_TYPES } from '../consts';

export const expressMiddleWares = {
  authenticateTokenMiddleWare(req: Request, res: Response, next: Function) {
    try {
      if (/(login|register|health)/.test(req.path) || req.path === "/") {
        console.log("Skipping authentication for login/register/health routes!");
        return next();
      }
      const authHeader = req.headers['authorization'] || "";
      const token = authHeader && authHeader.split('Bearer ')[1].trim();
      if (!token) return res.sendStatus(401);
      jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY || "", (err, user) => {
        if (err) {
          console.log("## error while authenticating: ", err);
          return res.sendStatus(403);
        }
        (req as any).userData = user;
        next();
      });
    } catch (e) {
      res.status(500).send(FAILURE_TYPES.INTERNAL_ERROR);
    }
  }
}
