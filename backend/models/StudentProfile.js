import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      maxlength: [150, 'Topic name cannot exceed 150 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      required: true,
    },
  },
  { _id: true }
);

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    topics: {
      type: [topicSchema],
      default: [],
    },
  },
  { _id: true }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    profilePicture: {
      type: String,
      default: '',
      maxlength: [700000, 'Profile picture must be smaller than 512 KB'],
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    gender: {
      type: String,
      enum: ['', 'female', 'male', 'non-binary', 'prefer-not-to-say', 'other'],
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    collegeName: {
      type: String,
      trim: true,
      maxlength: [150, 'College or university name cannot exceed 150 characters'],
    },
    universityRollNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Roll number cannot exceed 50 characters'],
    },
    degree: {
      type: String,
      trim: true,
      maxlength: [100, 'Degree cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: [100, 'Branch or specialization cannot exceed 100 characters'],
    },
    currentYear: {
      type: Number,
      min: [1, 'Current year must be at least 1'],
      max: [8, 'Current year cannot exceed 8'],
    },
    currentSemester: {
      type: Number,
      min: [1, 'Current semester must be at least 1'],
      max: [16, 'Current semester cannot exceed 16'],
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be less than 0'],
      max: [10, 'CGPA cannot exceed 10'],
      default: null,
    },
    technicalSkills: {
      type: [String],
      default: [],
    },
    programmingLanguages: {
      type: [String],
      default: [],
    },
    careerGoal: {
      type: String,
      trim: true,
      maxlength: [300, 'Career goal cannot exceed 300 characters'],
    },
    linkedinUrl: {
      type: String,
      trim: true,
      maxlength: [300, 'LinkedIn URL cannot exceed 300 characters'],
      default: '',
    },
    githubUrl: {
      type: String,
      trim: true,
      maxlength: [300, 'GitHub URL cannot exceed 300 characters'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    academicTrack: {
      type: String,
      required: [true, 'Please specify an academic track or course'],
      trim: true,
      maxlength: [100, 'Academic track cannot exceed 100 characters'],
    },
    targetExamDate: {
      type: Date,
      default: null,
    },
    dailyStudyTarget: {
      type: Number,
      required: [true, 'Daily study target is required'],
      min: [0.25, 'Daily study target must be at least 0.25 hours'],
      max: [24, 'Daily study target cannot exceed 24 hours'],
    },
    subjects: {
      type: [subjectSchema],
      default: [],
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalStudyHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    preferredLearningStyle: {
      type: String,
      enum: ['visual', 'interactive', 'reading', 'practice'],
      default: 'interactive',
    },
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
