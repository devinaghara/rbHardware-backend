import mongoose from "mongoose";

const SocialUserSchema = new mongoose.Schema({
  userId: String,
  emailId: String,
  displayName: String,
  //   avatar: {
  //     data: String,
  //     type: "image/png",
  //   },
  avatar: String,
});

const socialUser = mongoose.model("SocialUser", SocialUserSchema);
export default socialUser;
