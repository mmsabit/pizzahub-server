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
  const menu = await menus.find({'vendor.id': vendorId},{
      projection: {
        description: 0,
        vendor: 0,
      },
    }
    ).toArray();
  res.send(menu)
})

app.get('/menu/:id', async(req, res) => {
  const id = req.params.id;
  const result = await menus.findOne({_id: new ObjectId(id)});
  res.send(result);
})

app.get('/available-menu', async(req, res)=>{
  const availMenu = await menus.find({available: true, status: "approved"}).toArray();
  res.send(availMenu);
})

app.post('/menus',async(req,res) =>{
  const newData = req.body;
  const result = await menus.insertOne(newData);
  res.send(result);
})

app.delete('/menu/:id', async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await menus.deleteOne(query);
  res.send(result);
})

app.patch('/menu/:id', async(req,res)=>{
  const id = req.params.id;
    const updateData = req.body;
    const filter = {_id: new ObjectId(id)};
    const options = { upsert: true };
    const updateDoc = {
        $set: updateData,
    };
    const result = await menus.updateOne(filter, updateDoc, options);
    res.send(result);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})