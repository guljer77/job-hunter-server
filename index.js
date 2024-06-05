const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//create-token
function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

//verify-jwt
function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (verify?.email) {
    return res.send("you are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.igfrycv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //user-collection
    const userCollection = client.db("jobDB").collection("users");
    const jobsCollection = client.db("jobDB").collection("jobs");
    const applicationCollection = client.db("jobDB").collection("applications");

    //user-get
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });
    //save-user
    app.post("/users/:email", async (req, res) => {
      const user = req.body;
      const token = createToken(user);
      const isUseExist = await userCollection.findOne({ email: user?.email });
      if (isUseExist?._id) {
        return res.send({
          status: "Success",
          message: "Login Success",
          token,
        });
      }
      await userCollection.insertOne(user);
      return res.send({ token });
    });
    //update-user
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const body = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateUser = {
        $set: {
          ...body,
        },
      };
      const result = await userCollection.updateOne(filter, updateUser, option);
      res.send(result);
    });
    //post a job
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });
    //admin-get
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });
    //admin-approve-job
    app.put("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      const result = await jobsCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });
    //job-list
    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await jobsCollection.find(filter).toArray();
      res.send(result);
    });
    //update-job
    app.patch("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...body,
        },
      };
      const result = await jobsCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });
    //delete-job
    app.delete("/jobs/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(filter);
      res.send(result);
    });
    //application-collection-api
    app.post("/application", async (req, res) => {
      const user = req.body;
      const result = await applicationCollection.insertOne(user);
      res.send(result);
    });
    //apply-job-filter
    app.get("/application/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await applicationCollection.find(filter).toArray();
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
