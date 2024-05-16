import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if(!title.trim()){
        throw new ApiError(400, "Video title is required")
    }

    if(!description.trim()){
        throw new ApiError(400, "Video description is required")
    }

    let videoFileLocalPath;

    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){
        videoFileLocalPath = req.files.videoFile[0].path
    }

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file is required")
    }

    let thumbnailLocalPath;

    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail file is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(500, "Error uploading video file")
    }

    if(!thumbnail){
        throw new ApiError(500, "Error uploading thumbnail file")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        duration: videoFile?.duration,
        owner: req.user?._id
    })

    if(!video){
        throw new ApiError(500, "Something went wrong while publishing a video")
    }

    res
    .status(201)
    .json(new ApiResponse(201, video, "Video uploaded successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    const { title, description } = req.body

    if(!title || !description){
        throw new ApiError(400, "Title and description are required")
    }

    let thumbnailLocation = req.file?.path

    if(!thumbnailLocation){
        throw new ApiError(400, "Thumbnail file is required")
    }

    // todo: delete previous image from cloudinary

    const thumbnail = await uploadOnCloudinary(thumbnailLocation)

    if(!thumbnail){
        throw new ApiError(500, "Error while uploading thumbnail file")
    }

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url
            }
        },
        { new: true }
    )

    if(!video){
        throw new ApiError(500, "Something went wrong while updating the video")
    }

    res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    const video = await Video.findByIdAndDelete(videoId) // returns null if doc not found

    if(!video){ 
        throw new ApiError(404, "Video not found")
    }

    res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Video ID is required")
    }

    const publishStatus = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $project: {
                isPublished: 1
            }
        }
    ])

    if(!publishStatus || !(publishStatus.length>0)){
        throw new ApiError(404, "Video not found")
    }

    const isPublished = publishStatus[0]?.isPublished

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $set: { isPublished: !isPublished }                                          
        },
        { new: true }
    )

    if(!video){
        throw new ApiError(500, "Something went wrong while changing the publish status")
    }

    res
    .status(200)
    .json(new ApiResponse(200, video, "publish status updated"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}