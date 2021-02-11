'use strict';

const express = require('express');
var cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initializations
const app = express();
const storage = multer.diskStorage({
  destination: path.join(__dirname, `./public/images`),
  fileFilter: (req, file, callback) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const mimetype = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname));

    if (mimetype && extname) callback(null, true)
    callback('Error: File not valid.')
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname.toLowerCase())
  }
})

// Settings
app.set('port', process.env.port || 3000);
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      version: "1.0.0",
      title: "Oppa API",
      description: "This is the documentation of the Oppa API REST.",
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: 'http://localhost:' + app.get('port') + '/api',
        description: 'Development server (local with test data).'
      },
      {
        url: 'http://oppa.proyectosfit.cl/api',
        description: 'Development server (online with test data).'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};
const swaggerDocument = swaggerJsDoc(swaggerOptions);

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(multer({
  storage
}).single('image')) // atributo name del input de imagen del frontend

// Headers
app.use(cors());

// Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/services', require('./routes/services.routes'));

// Public
app.use('/api/public', express.static(path.join(__dirname, './public')));

// Starting the server
app.listen(app.get('port'), () => {
  console.log('Server on port', app.get('port'));
});