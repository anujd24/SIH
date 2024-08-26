// post.js
$(document).ready(function() {
    // Function to get query parameters
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to load post content
    function loadPostContent(postId) {
        // Placeholder: Replace with actual content loading logic
        const posts = {
            1: {
                title: "Blog Post Title 1",
                heading: "Create Best UI/UX Design",
                content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                image: "../images/post-1.jpg"
            },
            2: {
                title: "Blog Post Title 2",
                heading: "Understanding Marketing Strategies",
                content: "Curabitur vel urna nec metus vulputate dictum.",
                image: "../images/post-2.jpg"
            }
            // Add more posts as needed
        };

        const post = posts[postId];
        if (post) {
            $('#post-title').text(post.title);
            $('#post-heading').text(post.heading);
            $('#post-content').text(post.content);
            $('#post-image').attr('src', post.image);
        } else {
            $('#post-title').text("Post not found");
            $('#post-content').text("The post you are looking for does not exist.");
        }
    }

    // Get post ID from URL and load content
    const postId = getQueryParam('id');
    loadPostContent(postId);
});
