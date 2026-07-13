import express, { Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const app = express();
const port = process.env.PORT;
const client = new MongoClient(process.env.MONGODB_URI!);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});
app.use(express.json());




export async function connectToMongoDB() {

    try {
        await client.connect();
        const db = client.db("DocConnect");
        const userCollection = db.collection('user');
        const doctorCollection = db.collection('doctors');



        // Get random doctors
        app.get("/doctors/random", async (req: Request, res: Response) => {
            try {
                const { limit = "7" } = req.query;
                const count = parseInt(limit as string, 10);
                const doctors = await doctorCollection
                    .aggregate([{ $sample: { size: count } }])
                    .toArray();

                res.status(200).json(doctors);
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    message: "Failed to fetch random doctors",
                });
            }
        });


        // Get all doctors or search by name && pagiantion
        app.get("/doctors", async (req: Request, res: Response) => {
            try {
                const { search, page = "1", limit = "8", sort, specialty } = req.query;
                const p = parseInt(page as string);
                const l = parseInt(limit as string);

                // Filter Build
                const query: any = {};
                if (search) query.name = { $regex: search as string, $options: "i" };
                if (specialty) query.specialization = specialty as string;

                // Sort Build
                const sortQuery: any = {};
                if (sort === "price-asc") sortQuery.fee = 1;
                if (sort === "price-desc") sortQuery.fee = -1;

                const total = await doctorCollection.countDocuments(query);
                const doctors = await doctorCollection.find(query).sort(sortQuery).skip((p - 1) * l).limit(l).toArray();

                res.status(200).json({ doctors, totalPages: Math.ceil(total / l) });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch doctors" });
            }
        });
        // Get Individual Dr 
        app.get("/doctors/:id", async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const doctor = await doctorCollection.findOne({ _id: new ObjectId(id) });
                if (!doctor) return res.status(404).json({ message: "Doctor not found" });
                res.status(200).json(doctor);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch doctor details" });
            }
        });


        // update user info
        app.put("/user/update", async (req: Request, res: Response) => {
            try {
                const { id, name, email, image } = req.body;
                if (!id) return res.status(400).json({ message: "User ID is required" });

                const result = await userCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { name, email, ...(image && { image }) } }
                );

                if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });
                res.status(200).json({ success: true, message: "Profile updated successfully" });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to update profile" });
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