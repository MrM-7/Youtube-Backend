import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if(!content || !(content.trim())){
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if(!tweet){
        throw new ApiError(500, "Something went wrong while creating tweet")
    }

    res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if(!userId){
        throw new ApiError(400, "UserId is required")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "UserId is invalid")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project: {
                content: 1
            }
        }
    ])

    if(!tweets || tweets.length === 0){
        throw new ApiError(404, "No tweets found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    
    if(!tweetId){
        throw new ApiError(400, "TweetId is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "TweetId is invalid")
    }

    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.findByIdAndUpdate(tweetId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if(!tweet){
        throw new ApiError(500, "Something went wrong while updating tweet")
    }

    res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if(!tweetId){
        throw new ApiError(400, "TweetId is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "TweetId is invalid")
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId)

    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}