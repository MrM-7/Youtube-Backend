import mongoose, {isValidObjectId, mongo} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId){
        throw new ApiError(400, "ChannelId is required")
    }

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "ChannelId is invalid")
    }

    // Check if the channel (user) exists
    const channelExists = await User.findById(channelId);
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const subscription = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
                subscriber: new mongoose.Types.ObjectId(req.user?._id)
            }
        }
    ])

    if(!subscription || subscription.length === 0){
        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user?._id
        })

        if(!newSubscription){
            throw new ApiError(500, "Something went wrong while subscribing to the channel")
        }

        res
        .status(201)
        .json(new ApiResponse(201, newSubscription, "Subscription added successfully"))

    } else {
        const deletedSubscription = await Subscription.findByIdAndDelete(subscription[0]?._id)

        if (!deletedSubscription) {
            throw new ApiError(500, "Something went wrong while unsubscribing from the channel");
        }

        res
        .status(200)
        .json(new ApiResponse(200, {}, "Successfully unsubscribed"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId){
        throw new ApiError(400, "ChannelId is required")
    }

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "ChannelId is invalid")
    }

    // Check if the channel (user) exists
    const channelExists = await User.findById(channelId);
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscription",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber", 
                        }
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [channelId, "$subscribedToSubscriber.subscriber"],
                                    },
                                    then: true,
                                    else: false
                                }
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
              _id: 0,
              subscriber: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                subscribedToSubscriber: 1,
                subscribersCount: 1,
              },
            },
        }
    ])

    if(!subscribers || subscribers.length === 0){
        res
        .status(200)
        .json(new ApiResponse(200, {}, "No subscribers found"))

    }else{
        res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"))
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if(!userId){
        throw new ApiError(400, "UserId is required")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "UserId is invalid")   
    }

    const userExists = await User.findById(userId)

    if(!userExists){
        throw new ApiError(404, "User not found")
    }

    const channels = await Subscription.aggregate([
        {
          $match: {
            subscriber: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "subscribedChannel",
            pipeline: [
              {
                $lookup: {
                  from: "videos",
                  localField: "_id",
                  foreignField: "owner",
                  as: "videos",
                },
              },
              {
                $addFields: {
                  latestVideo: {
                    $last: "$videos",
                  },
                },
              },
            ],
          },
        },
        {
          $unwind: "$subscribedChannel",
        },
        {
          $project: {
            _id: 0,
            subscribedChannel: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
              latestVideo: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                owner: 1,
                title: 1,
                description: 1,
                duration: 1,
                createdAt: 1,
                views: 1,
              },
            },
          },
        },
    ]);


    if(!channels || channels.length === 0){
        res
        .status(200)
        .json(new ApiResponse(200, {}, "No subscription found"))
    } else{
        res
        .status(200)
        .json(new ApiResponse(200, channels, "Subscribed channels found"))
    }   
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}