import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {

    res
    .status(200)
    .json(new ApiResponse(200, {message: "Server is working properly"}, "Ok"))
})

export {
    healthcheck
}
