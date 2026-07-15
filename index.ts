import 'dotenv/config';
import express, { Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const port = process.env.PORT;
const client = new MongoClient(process.env.MONGODB_URI!);


app.use(express.json());




export async function connectToMongoDB() {

    try {
        // await client.connect();
        const db = client.db("DocConnect");
        const userCollection = db.collection('user');
        const doctorCollection = db.collection('doctors');
        const appointmentCollection = db.collection('appointment');



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

        // Create a new appointment
        app.post("/appointments", async (req: Request, res: Response) => {
            try {
                const bookingData = req.body;
                if (!bookingData.userEmail || !bookingData.doctorName || !bookingData.date || !bookingData.timeSlot) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                const result = await appointmentCollection.insertOne({
                    ...bookingData,
                    createdAt: new Date()
                });

                res.status(201).json({ success: true, insertedId: result.insertedId });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to book appointment" });
            }
        });

        // get user appointment data
        app.get("/appointments", async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const doctor = await appointmentCollection.find({ _id: new ObjectId(id) });
                if (!doctor) return res.status(404).json({ message: "Doctor not found" });
                res.status(200).json(doctor);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch doctor details" });
            }
        });



        // Find individual doctor appointment
        app.get("/appointments/:userid", async (req: Request, res: Response) => {
            try {
                const { userid } = req.params;
                const appointments = await appointmentCollection.find({ userid }).toArray();
                res.status(200).json(appointments);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch appointments" });
            }
        });


        // Cancel/delete an appointment
        app.delete("/appointments/:id", async (req: Request, res: Response) => {
            try {
                const { id } = req.params as { id: string };
                const result = await appointmentCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) return res.status(404).json({ message: "Appointment not found" });
                res.status(200).json({ message: "Appointment cancelled" });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to cancel appointment" });
            }
        });


        // Adding doctors Services 
        app.post("/doctors", async (req, res) => {
            try {
                const doctor = req.body;
                if (!doctor?.specialization || !doctor?.about) {
                    return res.status(400).send({ message: "Missing required doctor fields." });
                }

                const result = await doctorCollection.insertOne(doctor);
                res.send(result);
            } catch (error) {
                console.error("Error adding doctor:", error);
                res.status(500).send({ message: "Failed to add doctor." });
            }
        });


        // getting doctors Services 
        app.get("/myservices", async (req, res) => {
            try {
                const id = req.query.id as string | undefined;
                if (!id) {
                    return res.status(400).send({ message: "Missing id query param." });
                }
                const doctors = await doctorCollection.find({ id }).toArray();
                res.send(doctors);
            } catch (error) {
                console.error("Error fetching doctor's services:", error);
                res.status(500).send({ message: "Failed to fetch services." });
            }
        });


        // edting doctors Services
        app.patch("/myservices", async (req, res) => {
            try {
                const serviceId = req.query.serviceId as string;
                const userId = req.query.userId as string;
                const updatedData = req.body;

                if (!serviceId || !userId) {
                    return res.status(400).send({ message: "Missing serviceId or userId in query params." });
                }
                const { _id, id, ...dataToUpdate } = updatedData;
                const result = await doctorCollection.updateOne(
                    {
                        _id: new ObjectId(serviceId),
                        id: userId
                    },
                    { $set: dataToUpdate }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Service not found or you are not authorized to edit this." });
                }

                res.send({ success: true, message: "Doctor service updated successfully!" });
            } catch (error) {
                console.error("Error updating doctor service:", error);
                res.status(500).send({ message: "Failed to update doctor service." });
            }
        });

        // deleting doctors Services
        app.delete("/myservices", async (req, res) => {
            try {
                const serviceId = req.query.serviceId as string;
                const userId = req.query.userId as string;
                if (!serviceId || !userId) {
                    return res.status(400).send({ message: "Missing serviceId or userId in query params." });
                }
                const result = await doctorCollection.deleteOne({
                    _id: new ObjectId(serviceId),
                    id: userId
                });
                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Service not found or you are not authorized to delete this." });
                }

                res.send({ success: true, message: "Doctor service deleted successfully!" });
            } catch (error) {
                console.error("Error deleting doctor service:", error);
                res.status(500).send({ message: "Failed to delete doctor service." });
            }
        });








        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

// Call this only when your application terminates
// export async function disconnectFromMongoDB() {
//     await client.close();
// }






connectToMongoDB();
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
export default app;