import express from 'express'
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config'

const app = express()
const port = process.env.PORT || 8000

app.use(cors());
app.use(express.json());

const client = new MongoClient(`${process.env.Db_URI}`);

export async function connectToMongoDB(){
    try{
        await client.connect();
        console.log("successfully connected")
        return client;
    }
    catch(err){
        console.dir();
    }
}

const connectedClient = await connectToMongoDB();
const db = connectedClient.db('pizza_hub');
const menu = db.collection('menu');

app.post('/menu',async(req,res) =>{
  const newData = req.body;
  const result = await menu.insertOne(newData);
  res.send(result)
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})