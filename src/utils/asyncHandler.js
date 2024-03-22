const asyncHandler = (reqHandler) => {
   return (req, res, next) => {
        Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err))
    }
}


export {asyncHandler} //export as  a object
















// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => ()}
// const asyncHandler = (func) => async() => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//        await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || code).json({
//             success: false,
//             message: err.message
//         })
//     }
// }

