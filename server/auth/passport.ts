import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { UserModel } from "../models";

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== "PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE") {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        pkce: true,
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email found from Google"));

          let user = await UserModel.findOne({ email });
          if (!user) {
            user = await UserModel.create({
              name: profile.displayName || "Google User",
              email,
              password: "oauth_placeholder",
              role: "User",
            });
          }
          return done(null, user as any);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CLIENT_SECRET !== "PASTE_YOUR_GITHUB_CLIENT_SECRET_HERE") {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
          
          let user = await UserModel.findOne({ email });
          if (!user) {
            user = await UserModel.create({
              name: profile.displayName || profile.username || "GitHub User",
              email,
              password: "oauth_placeholder",
              role: "User",
            });
          }
          return done(null, user as any);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

export default passport;
