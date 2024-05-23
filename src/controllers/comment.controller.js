import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const {page = 1, limit = 10} = req.query 

    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video ID is invalid")
    }

    const getComments = Comment.aggregate([
        {
          $match: {
            video: new mongoose.Types.ObjectId(videoId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owners",
          },
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "comment",
            as: "likes",
          },
        },
        {
          $addFields: {
            likesCount: {
              $size: "$likes",
            },
            owner: {
              $first: "$owners",
            },
            isLiked: {
              $cond: {
                if: {
                  $in: [req.user?._id, "$likes.likedBy"],
                },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $project: {
            content: 1,
            createdAt: 1,
            likesCount: 1,
            owner: {
                fullName: 1,
                username: 1,
                avatar: 1
            },
            isLiked: 1,
          },
        },
    ]);
    
    if (!getComments) {
        throw new ApiError(500, "Error while loading getComments section");
    }
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };
    
    const comments = await Comment.aggregatePaginate(getComments, options);
    
    if (!comments) {
        throw new ApiError(500, "Error while loading comments section");
    }
    
    res
    .status(200)
    .json(new ApiResponse(200, comments, "Comment fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video ID is invalid")
    }

    console.log(req.body);

    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if(!comment){
        throw new ApiError(500, "Something went wrong while creating comment")
    }

    res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    
    if(!commentId){
        throw new ApiError(400, "Comment ID is required")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Comment ID is invalid")
    }

    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if(!comment){
        throw new ApiError(500, "Something went wrong while updating comment")
    }

    res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    
    if(!commentId){
        throw new ApiError(400, "Comment ID is required")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Comment ID is invalid")
    }

    const comment = await Comment.findByIdAndDelete(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}