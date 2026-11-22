const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  device: {
    type: String,
    default: 'mobile',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    photoURL: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationSentAt: {
      type: Date,
      select: false,
    },
    pushTokens: [pushTokenSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
