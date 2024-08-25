const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/blogDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// Blog post schema
const postSchema = new mongoose.Schema({
    title: String,
    category: String,
    description: String,
    author: String,
    date: { type: Date, default: Date.now },
    imageUrl: String,
});

const Post = mongoose.model('Post', postSchema);

// Routes
// Fetch all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Fetch posts by category
app.get('/api/posts/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const posts = await Post.find({ category });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new post
app.post('/api/posts', async (req, res) => {
    const post = new Post({
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        author: req.body.author,
        imageUrl: req.body.imageUrl,
    });

    try {
        const savedPost = await post.save();
        res.status(201).json(savedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
