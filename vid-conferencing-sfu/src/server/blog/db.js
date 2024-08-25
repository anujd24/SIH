const mongoose = require('mongoose');
const Post = require('../models/Post'); // Assuming your post model is in a separate file

mongoose.connect('mongodb://localhost:27017/blogDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const seedPosts = [
    {
        title: "How to create UI/UX design with Figma",
        category: "Tech",
        description: "Lorem ipsum dolor sit amet consectetur...",
        author: "Anuj Dubey",
        imageUrl: "path/to/image.jpg"
    },
    {
        title: "Effective Marketing Strategies",
        category: "Marketing",
        description: "Marketing is key to success...",
        author: "Jane Doe",
        imageUrl: "path/to/image2.jpg"
    }
    // Add more posts as needed
];

Post.insertMany(seedPosts)
    .then(() => {
        console.log("Data inserted");
        mongoose.connection.close();
    })
    .catch(err => console.log(err));
