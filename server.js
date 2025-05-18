const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

mongoose.set('strictQuery', true); // Fix Mongoose warning

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err));

// Schemas
const studentSchema = new mongoose.Schema({
  name: String,
  fatherName: String,
  enrollNumber: String,
  aadharNumber: String,
  mobileNumber: String,
  subscriptionCharge: Number,
  startDate: String,
  photo: String,
});
const Student = mongoose.model('Student', studentSchema);

const candidateSchema = new mongoose.Schema({
  name: String,
  fatherName: String,
  village: String,
  enrollNumber: String,
  selectedIn: String,
  photo: String,
});
const Candidate = mongoose.model('Candidate', candidateSchema);

const facilityChargeSchema = new mongoose.Schema({
  charge: Number,
});
const FacilityCharge = mongoose.model('FacilityCharge', facilityChargeSchema);

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const Admin = mongoose.model('Admin', adminSchema);

// Middleware for Admin Authentication
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  const admin = await Admin.findOne({ username: 'admin' });
  if (!admin || !await bcrypt.compare(password, admin.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/api/students', async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.post('/api/students', authenticateAdmin, async (req, res) => {
  const student = new Student(req.body);
  await student.save();
  res.status(201).json(student);
});

app.delete('/api/students/:enrollNumber', authenticateAdmin, async (req, res) => {
  await Student.deleteOne({ enrollNumber: req.params.enrollNumber });
  res.status(204).send();
});

app.get('/api/candidates', async (req, res) => {
  const candidates = await Candidate.find();
  res.json(candidates);
});

app.post('/api/candidates', authenticateAdmin, async (req, res) => {
  const candidate = new Candidate(req.body);
  await candidate.save();
  res.status(201).json(candidate);
});

app.delete('/api/candidates/:enrollNumber', authenticateAdmin, async (req, res) => {
  await Candidate.deleteOne({ enrollNumber: req.params.enrollNumber });
  res.status(204).send();
});

app.get('/api/facility-charge', async (req, res) => {
  const charge = await FacilityCharge.findOne();
  res.json({ charge: charge?.charge || 0 });
});

app.post('/api/facility-charge', authenticateAdmin, async (req, res) => {
  const { charge } = req.body;
  await FacilityCharge.findOneAndUpdate({}, { charge }, { upsert: true });
  res.json({ charge });
});

// Initialize Admin
const initializeAdmin = async () => {
  const adminExists = await Admin.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await new Admin({ username: 'admin', password: hashedPassword }).save();
    console.log('Admin created');
  }
};
initializeAdmin();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
