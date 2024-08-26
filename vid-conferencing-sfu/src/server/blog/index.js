const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const blogs = require('./routes/blogs')
const connectDB = require('./config/db');
const Blog = require('./models/Blog');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());  
app.use(express.static(path.join(__dirname, 'src/front-end')));

connectDB(); 

app.use('/blogs', blogs);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
