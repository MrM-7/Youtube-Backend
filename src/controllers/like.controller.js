import mongoose, { isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from '../models/video.model.js';

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video ID is invalid")
    }

    const video = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }
    ])

    if(video.length <= 0){
        const like = await Like.create({
            video: videoId,
            likeBy: req.user?._id
        })

        res
        .status(201)
        .json(new ApiResponse(201, like, "Video Liked"))
    } else{
        await Like.findByIdAndDelete(video[0]._id)
        res
        .status(201)
        .json(new ApiResponse(201, {}, "Video Like removed"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId){
        throw new ApiError(400, "Comment ID is required")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Comment ID is invalid")
    }

    const comment = await Like.aggregate([
        {
            $match: {
                comment: new mongoose.Types.ObjectId(commentId)
            }
        }
    ])

    if(comment.length <= 0){
        const comment = await Like.create({
            comment: commentId,
            likeBy: req.user?._id
        })

        res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment Liked"))
    } else{
        await Like.findByIdAndDelete(comment[0]._id)
        res
        .status(201)
        .json(new ApiResponse(201, {}, "Comment Like removed"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!tweetId){
        throw new ApiError(400, "Tweet ID is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Tweet ID is invalid")
    }

    const tweet = await Like.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        }
    ])

    if(tweet.length <= 0){
        const like = await Like.create({
            tweet: tweetId,
            likeBy: req.user?._id
        })

        res
        .status(201)
        .json(new ApiResponse(201, like, "Tweet Liked"))
    } else{
        await Like.findByIdAndDelete(tweet[0]._id)
        res
        .status(201)
        .json(new ApiResponse(201, {}, "Tweet Like removed"))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {

    const videos = await Like.aggregate([
        {
            $match: {
                likeBy: new mongoose.Types.ObjectId(req.user?._id),
                comment: null,
                tweet: null
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo"
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $lookup: {
                from: "users",
                localField: "likedVideo.owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                videoFile: "$likedVideo.videoFile",
                thumbnail: "$likedVideo.thumbnail",
                title: "$likedVideo.title",
                description: "$likedVideo.description",
                duration: "$likedVideo.duration",
                views: "$likedVideo.views",
                createdAt: "$likedVideo.createdAt",
                owner: {
                    username: "$ownerDetails.username",
                    fullName: "$ownerDetails.fullName",
                    avatar: "$ownerDetails.avatar"
                }
            }
        }
    ]);

    if(videos.length > 0){
        res
        .status(200)
        .json(new ApiResponse(200, videos, "Liked videos fetched successfully"))
    } else { 
        res
        .status(404)
        .json(new ApiResponse(404, {}, "No liked videos found"))
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}