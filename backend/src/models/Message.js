const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },   
    storedName: { type: String, required: true }, 
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },       
    url: { type: String, required: true },       
  },
  { _id: false }  
);

const messageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,          
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: [4000, "Message cannot exceed 4000 characters"],
      default: "",
    },

    type: {
      type: String,
      enum: ["text", "file", "system"],
      default: "text",
    },

    attachments: [attachmentSchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    reactions: {
      type: Map,
      of: [String],
      default: {},
    },

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ group: 1, createdAt: -1 });

messageSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);