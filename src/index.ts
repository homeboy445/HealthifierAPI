import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { dbConfig } from './utils/db';
import { userRoute } from './routes/users';
import { HealthifierSocketManager } from './socketHandler';
import { contextRouter } from './routes/context';
import { medicineRouter } from './routes/medicine';

const app = express();
const port = process.env.PORT || 3010;

// Middleware
app.use(bodyParser.json());
app.use("/users", userRoute);
app.use("/context", contextRouter);
app.use("/medicine", medicineRouter);

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send("Server's running!");
});

app.get('/health', async (req: Request, res: Response) => {
    try {
        console.log("running health check!");
        const response = await dbConfig.runHealthCheck();
        res.json(response);
    } catch (error) {
        console.log("## error while running health check: ", error);
        res.status(500).send('Health check failed');
    }
});

const serverInstance = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const socketHandler = new HealthifierSocketManager(serverInstance);
socketHandler.initializeSocket();
