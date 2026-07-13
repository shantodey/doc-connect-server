import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const app = express();
const port = process.env.PORT;
const client = new MongoClient(process.env.MONGODB_URI!);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});





export async function connectToMongoDB() {

    try {
        await client.connect();
        const db = client.db("DocConnect");
        const doctorCollection = db.collection('doctors');





        // Get all doctors or search by name
        app.get("/doctors", async (req: Request, res: Response) => {
            try {
                const { search } = req.query;
                const query = search ? { name: { $regex: search as string, $options: "i" } } : {};

                const doctors = await doctorCollection.find(query).toArray();
                res.status(200).json(doctors);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch doctors" });
            }
        });

        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
    await client.close();
}






connectToMongoDB();
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});