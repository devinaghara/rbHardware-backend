import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../Models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        // Check if user already exists (by email or googleId)
        let user = await User.findOne({
          $or: [{ email }, { googleId: profile.id }],
        });

        if (user) {
          // Link Google account if not already linked
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isVerified = true;
            if (!user.profilePicture && profile.photos?.[0]?.value) {
              user.profilePicture = profile.photos[0].value;
            }
            await user.save();
          }
        } else {
          // Create new user with Google profile data
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            profilePicture: profile.photos?.[0]?.value || null,
            isVerified: true,
            // No password — Google-only accounts don't need one
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user — store user _id in session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user — fetch from the unified User model
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
