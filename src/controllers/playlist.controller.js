import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!(name && description)){
        throw new ApiError(400, "Name and description are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500, "Something went wrong while creating playlist")
    }

    res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!userId){
        throw new ApiError(400, "UserId is required")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "UserId is invalid")
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ]);


    if(!playlist || playlist.length === 0){
        throw new ApiError(404, "No playlist found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlists found"))

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist Id is invalid")
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    ownerDetails: {
                        username: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    if(!playlist || playlist.length === 0){
        throw new ApiError(404, "Playlist not found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist found"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist Id is invalid")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is invalid")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(400, "only owner can add video to their playlist");
    }

    // const videos = playlist.videos
    // videos.push(videoId)

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        { new: true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "Error while adding the video to the playlist");
    }

    res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video added successfully to the playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
   
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist Id is invalid")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is invalid")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(400, "only owner can remove video from their playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
          $pull: {
            videos: videoId,
          },
        },
        { new: true }
      );
      if (!updatedPlaylist) {
        throw new ApiError(500, "Error while removing the video from the playlist");
    }

    res
    .status(200)
    .json(new ApiResponse(200, updatePlaylist, "Video removed successfully from the playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlist Id");
    }
  
    const playlist = await Playlist.findById(playlistId);
  
    if (!playlist) {
      throw new ApiError(400, "Playlist not found");
    }
  
    if (playlist.owner.toString() !== req.user?._id.toString()) {
      throw new ApiError(400, "You are not authorized to delete the playlist");
    }
  
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
  
    if (!deletedPlaylist) {
      throw new ApiError(500, "Something went wrong while deleting playlist");
    }
  
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    );  
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if (!(name && description)) {
        throw new ApiError(400, "All fields are required , name and description");
    }
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }
    
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owner can edit the playlist");
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
    {
        $set: {
            name,
            description,
        },
    },
    { new: true }
    );
    
    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while updating the playlist");
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}