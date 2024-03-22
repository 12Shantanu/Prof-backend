import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, //one who is subscribing
        ref:"User"
    },
    channel: {
        type: Schema.Types.ObjectId, //oneto whom "subscriber" is subscribing
        ref:"User"
    }
}, {timestamps: true}
)


export const Subcription = mongoose.model("Subscription", subscriptionSchema)