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
const menus = db.collection('menus');

app.get('/',(req,res) =>{
    res.send("Ready with your pizza")
})

app.get('/menus/:vendorId', async (req, res) => {
  const vendorId = req.params.vendorId;
  const menu = await menus.find({'vendor.id': vendorId}
    ).toArray();
  res.send(menu)
})


app.post('/menus',async(req,res) =>{
  const newData = req.body;
  const result = await menus.insertOne(newData);
  res.send(result)
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})