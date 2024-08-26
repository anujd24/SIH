$(document).ready(function() {
    // Filter functionality
    $('.filter-item').click(function() {
        const value = $(this).attr('data-filter');
        if (value == 'all') {
            $('.post-box').show('1000');
        } else {
            $('.post-box').not('.' + value).hide('1000');
            $('.post-box').filter('.' + value).show('1000');
        }
        $(this).addClass("active-filter").siblings().removeClass('active-filter');
    });

    function fetchPosts() {
        $.ajax({
            url: 'http://localhost:3000/blogs',
            method: 'GET',
            success: function(posts) {
                $('.post').empty(); 
                posts.forEach(post => {
                    // Determine the image URL based on the post category
                    let imageUrl;
                    switch (post.category.toLowerCase()) {
                        case 'tech':
                            imageUrl = '../images/post-2.jpg';
                            break;
                        case 'marketing':
                            imageUrl = '../images/marketing.jpeg';
                            break;
                        case 'design':
                            imageUrl = '../images/post-1.jpg';
                            break;
                        default:
                            imageUrl = '../images/default.jpg'; // Fallback image
                    }

                    const postBox = `
                        <div class="post-box ${post.category.toLowerCase()}">
                            <img src="${imageUrl}" alt="" class="post-img">
                            <h2 class="category">${post.category}</h2>
                            <a href="post-page.html?id=${post.id}" class="post-title">${post.title}</a>
                            <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
                            <p class="post-description">${post.content}</p>
                            <div class="profile">
                                <img src="../images/profile-1.jpg" alt="" class="profile-img">
                                <span class="profile-name">${post.author}</span>
                            </div>
                        </div>`;
                    $('.post').append(postBox);
                });
            },
            error: function(error) {
                alert("There was an error retrieving the posts. Please try again later.");
                console.error("Error retrieving posts:", error);
            }
        });
    }

    fetchPosts();

    $('#new-post-form').on('submit', function(event) {
        event.preventDefault();

        const newPost = {
            title: $('#post-title').val(),
            content: $('#post-content').val(),
            author: $('#post-author').val(),
            category: $('#post-category').val()
        };

        $.ajax({
            url: 'http://localhost:3000/blogs',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(newPost),
            success: function(post) {
                alert('Post created successfully!');
                fetchPosts(); 
                $('#new-post-form')[0].reset();
            },
            error: function(error) {
                alert("There was an error creating the post. Please try again later.");
                console.error("Error creating post:", error);
            }
        });
    });

    // Header shadow on scroll
    let header = document.querySelector("header");

    window.addEventListener("scroll", () => {
        header.classList.toggle("Shadow", window.scrollY > 0);
    });
});
