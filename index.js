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
const order = db.collection('order');

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

app.get('/available-menu', async(req, res)=>{
  const availMenu = await menus.find({available: true, status: "approved"}).toArray();
  res.send(availMenu);
})

app.get('/adminmenu/',async(req,res) =>{
  const menuItem = await menus.find({}).toArray();
  res.send(menuItem);
})

app.patch('/adminmenu/:id', async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const menuId = new ObjectId(id);

  if (updatedData.featured === true) {
    const featuredCount = await menus.countDocuments({
      featured: true,
      _id: { $ne: menuId },
    });

    if (featuredCount >= 3) {
      return res.status(409).send({ message: 'Only three menu items can be featured' });
    }
  }
  const result = await menus.updateOne({ _id: menuId }, { $set: updatedData });
  res.send(result);
});

app.post('/order', async (req, res) =>{
  const newData = req.body;
  const result = await order.insertOne(newData);
  res.send(result);
})

app.get('/customer_order/:userid', async(req, res) => {
  const id = req.params.userid;
  const result = await order.find({"customer.id": id}).toArray();
  res.send(result);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})