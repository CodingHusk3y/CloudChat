const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [2, "Group name must be at least 2 characters"],
      maxlength: [60, "Group name cannot exceed 60 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },

    inviteCode: {
      type: String,
      unique: true,
      default: () => uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase(),
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["admin", "member"], 
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    settings: {
      isPrivate: { type: Boolean, default: false },
      maxMembers: { type: Number, default: 100, min: 2, max: 500 },
      allowFileSharing: { type: Boolean, default: true },
    },

    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

groupSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

groupSchema.set("toJSON", { virtuals: true });
groupSchema.set("toObject", { virtuals: true });

groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

groupSchema.methods.isAdmin = function (userId) {
  return this.members.some(
    (m) => m.user.toString() === userId.toString() && m.role === "admin"
  );
};

module.exports = mongoose.model("Group", groupSchema);