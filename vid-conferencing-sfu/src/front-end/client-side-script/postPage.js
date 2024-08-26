$(document).ready(function() {
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const postId = getQueryParam('id'); // Assumes you pass the post ID in the URL, e.g., post-page.html?id=1

    if (postId) {
        $.ajax({
            url: `http://localhost:3000/blogs/${postId}`,
            method: 'GET',
            success: function(post) {
                console.log("Post Data:", post); // Debugging line
                $('#post-title').text(post.title);
                $('#post-heading').text(post.heading);
                $('#post-content').text(post.content);
                $('#post-image').attr('src', post.image);
            },
            error: function(error) {
                alert("There was an error retrieving the post. Please try again later.");
                console.error("Error retrieving post:", error);
            }
        });
    } else {
        alert("No post ID provided.");
        window.location.href = 'blog.html'; // Redirect to home page if no post ID
    }
});
