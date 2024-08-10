import jwt from "jsonwebtoken"; // Import the jwt module

const JWTGenerator = {
  throwErrorIfSecretKeyDoNotExist: () => {
    if (
      !process.env.JWT_ACCESS_TOKEN_SECRET_KEY ||
      !process.env.JWT_REFRESH_TOKEN_SECRET_KEY ||
      !process.env.JWT_ACCESS_TOKEN_EXPIRY ||
      !process.env.JWT_REFRESH_TOKEN_EXPIRY
    ) {
      throw new Error("JWT secret key does not exist");
    }
  }, // Add type annotation for 'doSecretKeyExist'

  generateAccessToken: (UserData: {
    email: string;
    name: string;
    uniqueUserId: string;
  }) => {
    // Add type annotation for 'user'
    JWTGenerator.throwErrorIfSecretKeyDoNotExist();
    console.log(
      "generateAccessToken -> for data: ", UserData
    );
    return jwt.sign(UserData, process.env.JWT_ACCESS_TOKEN_SECRET_KEY || "", {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY,
    });
  },

  generateRefreshToken: (UserData: {
    email: string;
    name: string;
    uniqueUserId: string;
  }) => {
    // Add type annotation for 'user'
    JWTGenerator.throwErrorIfSecretKeyDoNotExist();
    return jwt.sign(UserData, process.env.JWT_REFRESH_TOKEN_SECRET_KEY || "", {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY,
    });
  },

  verifyAccessToken: (token: any) => {
    // Add type annotation for 'token'
    JWTGenerator.throwErrorIfSecretKeyDoNotExist();
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY || "");
    } catch (e) {
      console.log("## error while verifying access token: ", e);
      return null;
    }
  },

  verifyRefreshToken: (token: any) => {
    // Add type annotation for 'token'
    JWTGenerator.throwErrorIfSecretKeyDoNotExist();
    return jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET_KEY || "");
  },
};

export default JWTGenerator; // Export the JWTGenerator object
