const blogsRouter = require('express').Router()
const Blog = require('../models/customer')
const middleware = require('../utils/middleware')

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post(
  '/',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async (request, response) => {
    const body = request.body

    const user = request.user

    const newBlog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes ?? 0,
      comments: [],
      user: user._id
    })

    const savedBlog = await newBlog.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()

    const blogToReturn = await Blog.findById(savedBlog._id).populate('user', {
      username: 1,
      name: 1
    })
    response.status(201).json(blogToReturn)
  }
)

blogsRouter.post('/:id/comments', async (request, response) => {
  const newComment = request.body.comment

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    {
      $push: { comments: newComment }
    },
    {
      new: true,
      runValidators: true,
      context: 'query'
    }
  ).populate('user', { username: 1, name: 1 })
  response.json(updatedBlog)
})

blogsRouter.delete(
  '/:id',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async (request, response) => {
    const blog = await Blog.findById(request.params.id)

    if (!blog) {
      return response.status(404).json({ error: 'blog does not exist' })
    }

    const user = request.user

    if (user._id.toString() !== blog.user.toString()) {
      return response
        .status(401)
        .json({ error: 'only the creator can delete this blog' })
    }

    await Blog.findByIdAndRemove(request.params.id)
    response.status(204).end()
  }
)

blogsRouter.put('/:id', async (request, response) => {
  const newBlog = request.body

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, newBlog, {
    new: true,
    runValidators: true,
    context: 'query'
  }).populate('user', { username: 1, name: 1 })
  response.json(updatedBlog)
})

module.exports = blogsRouter
