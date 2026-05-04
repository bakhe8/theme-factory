import BasePage from './base-page';

class Blog extends BasePage {
    onReady() {
        this.initToggleLike();
    }

    initToggleLike() {
        const likeBtn = document.querySelector('#blog-like');

        if (!likeBtn || !salla.url.is_page('blog.single')) {
            return;
        }

        const blogId = likeBtn.dataset.blogId;
        const likedBlogs = JSON.parse(localStorage.getItem('liked_blogs')) || [];
        this.isLiked = likedBlogs.includes(blogId);

        if (this.isLiked) {
            likeBtn.classList.add('liked');
        }

        likeBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            if (salla.config.isGuest()) {
                return salla.notify.error(salla.lang.get('common.messages.must_login'));
            }

            likeBtn.classList.add('s-loading');

            const endpoint = `blog/articles/${blogId}/like`;
            try {
                await salla.api.request(endpoint, '', this.isLiked ? 'delete' : 'put');
                this.updateLikedBlogs(blogId, !this.isLiked);
                this.updateLikesCount(!this.isLiked);
                this.isLiked = !this.isLiked;
            } catch (e) {
                if (e.response?.status === 409) {
                    this.handleExistingLike(likeBtn, blogId);
                }
            } finally {
                likeBtn.classList.remove('s-loading');
            }
        });
    }

    handleExistingLike(likeBtn, blogId) {
        const isLiked = likeBtn.classList.contains('liked');
        this.updateLikedBlogs(blogId, !isLiked);
        this.updateLikesCount(!isLiked);
        this.isLiked = !isLiked; 
    }

    updateLikedBlogs(blogId, add) {
        const likedBlogs = JSON.parse(localStorage.getItem('liked_blogs')) || [];
        const updatedBlogs = add ? [...likedBlogs, blogId] : likedBlogs.filter(id => id !== blogId);
        localStorage.setItem('liked_blogs', JSON.stringify(updatedBlogs));
    }

    updateLikesCount(isLiked) {
        const likeButton = document.querySelector('#blog-like');
        const countSpan = likeButton.querySelector('span');
        let currentCount = parseInt(countSpan?.textContent) || 0;

        likeButton.classList.toggle("liked", isLiked);
        if (countSpan) {
            countSpan.textContent = isLiked ? currentCount + 1 : currentCount - 1;
        }

        anime({
            targets: countSpan,
            scale: [1, 1.2],
            duration: 300,
            easing: 'easeInOutQuad',
        });
    }
}

Blog.initiateWhenReady(['blog.single', 'blog.index']);
