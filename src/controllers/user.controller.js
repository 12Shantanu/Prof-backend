import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccesAndRefreshTokens = async(userId) => {
    try {
     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    
    return {accessToken, refreshToken}
    
    } catch (error) {
        throw new ApiError(500, "Something Went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
  //1 get user detailes from frontend
  //2 validation - not empty
  //3 check if user already exists: username, email
  //4 check for images, check for avatar
  //5 upload them to cloudinary, avatar
  //6 create user object for mongodb - create entry in db
  //7 remove pass and refresh token feed from response
  //8 check for user creation 
  //9 return res


//1
  const {fullName, email, username, password } = req.body
//  console.log("email: ", email);

  //2
 if (
    [fullName, email, username, password].some( (field) => field?.trim() === "")
    ) {
     throw new ApiError(400, "All fields are required")
    }
  



//3
const existedUser = await User.findOne({
    $or: [{ username }, { email }]
})

if (existedUser) {
    throw new ApiError(409, "User with email or username already exists ")
}
//console.log(req.files);
//4
 const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;

 let coverImageLocalPath;
 if (req.files && Array.isArray(req.files.coverImage)  && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
 }

if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
}

//5
 const avatar =  await uploadOnCloudinary(avatarLocalPath)
 const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

 if(!avatar) {
    throw new ApiError(400, "Avatar file is required")
 }
 
//6
const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url  || "",
    email,
    password,
    username: username.toLowerCase() 
}) 


//7
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

//8
if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
}

//9
return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully ")
)

} )

const loginUser = asyncHandler( async (req,res) => {
    //1. req body -> data
    //2. username or email
    //3. find the user
    //4. password check
    //5. access and refresh token
    //6. send cookies

    //1.
    const {email, username, password} = req.body
    console.log(email);

    //2
    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required")
    }
   

    //3
   const user = await User.findOne({
        $or: [{username}, {email}]
    })
    
    if(!user) {
        throw new ApiError(404, "User does not exist")
    }

    
    //4
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    //5
  const {accessToken, refreshToken} = await generateAccesAndRefreshTokens(user._id)

    //6
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
            },
            "User logged In Successfully"
        )
    )

    

})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    
    const options = {
        httpOnly: true,
        secure: true
    }
   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
 const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

 if (incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
 }

 try {
    const decodedToken = jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
    )
   
    const user = await User.findById(decodedToken?._id)
   
    if (!user) {
       throw new ApiError(401, "Invalid refresh token")
    }
   
    if (incomingRefreshToken !== user?.refreshToken) {
       throw new ApiError(401, "Refresh token is expired or used")
    }
   
    const options = {
       httpOnly: true,
       secure: true
    }
   
   const {accessToken, newRefreshToken}= await generateAccesAndRefreshTokens(user._id)
   
   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", newRefreshToken, options)
   .json(
       new ApiResponse(
           200,
           {accessToken, refreshToken: newRefreshToken},
           "Access token refreshed"
       )
   )
 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
 }

})
export { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken
  };
