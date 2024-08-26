const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog'); 

router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 }); // Sort by newest first
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog post not found" });
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    const { title, content, author, category } = req.body;

    if (!title || !content || !author || !category) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const newBlog = new Blog({
        title,
        content,
        author,
        category
    });

    try {
        const savedBlog = await newBlog.save();
        res.status(201).json(savedBlog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { title, content, author, category } = req.body;

    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog post not found" });

        blog.title = title || blog.title;
        blog.content = content || blog.content;
        blog.author = author || blog.author;
        blog.category = category || blog.category;

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog post not found" });

        await blog.remove();
        res.json({ message: "Blog post deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;