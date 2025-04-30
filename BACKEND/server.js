require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');
const apiRoutes= require('./routes/api');

const app = express();
app.use(express.json());

// Validar ENV de MongoDB
if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI no definido en .env');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });

app.use('/api', apiRoutes);
app.use(express.static(path.resolve(__dirname, '../FRONTEND')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));