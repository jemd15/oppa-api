'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const https = require('http');
const fs = require('fs');
const dayjs = require('dayjs');

// Initializations
const app = express();
const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, './cert/privkey1.pem'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, './cert/fullchain1.pem'), 'utf8')
}, app)

// Settings
app.set('port', process.env.PORT || 3000);
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
        url: 'http://localhost:' + 3000 + '/api',
        description: 'Development server (local with test data).'
      },
      {
        url: process.env.HOST + '/api',
        description: 'Development server (online with test data).'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};
const swaggerDocument = swaggerJsDoc(swaggerOptions);

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
/* app.use(multer({
  storage
}).single('image')) // atributo name del input de imagen del frontend */

// Headers
app.use(cors());

// Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/services', require('./routes/services.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/superCategories', require('./routes/super-categories.routes'));
app.use('/api/addresses', require('./routes/addresses.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/wallets', require('./routes/wallets.routes'));

// Public
app.use('/api/public', express.static(path.join(__dirname, './public')));

// Starting the server
server.listen(app.get('port'), () => {
  console.clear()
  console.log("HTTPS server listening on port " + app.get('port'));
});
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["*"]
  }
});

// Socket setup
const servicesModel = require('./models/services.model');
io.on('connection', (socket) => {
  console.log('WS: User connected:', socket.handshake.query.firstname, socket.handshake.query.lastname);

  // se le asigna un chat según el data.chat
  socket.on('connectToChat', data => {
    console.log('WS: Connecting user to chat:', data.chat);
    if (data.chat) socket.join(data.chat)
  });
  
  // cuando un mensaje es recibido, se reenvia a todos los miembros del chat
  socket.on('message', data => {
    console.log('WS: Message:', data.text);
    socket.to(data.chat).broadcast.emit('message', data);
    // guardar mensaje en la bdd
  });

  // se crea una sala para notificar al proveedor
  socket.on('notificationsProvider', data => {
    if (data.provider_id) socket.join(data.provider_id);
  })

  // se crea una sala para notificar al usuario
  socket.on('notificationsProvider', data => {
    if (data.user_id) socket.join(data.user_id);
  })

  // se envía una notificación al proveedor
  socket.on('notificateProvider', data => {
    socket.to(data.provider_id).broadcast.emit('notificateProvider', data);
  })

  // se envía una notificación al usuario
  socket.on('notificateUser', data => {
    console.log('notificando usuario', data.user_id);
    socket.to(data.user_id).broadcast.emit('notificateUser', data);
  })

  socket.on('serviceConfirmation', data => {
    console.log('enviando confirmación de servicio al proveedor', data.provider.provider_id);
    socket.to(data.provider.provider_id).broadcast.emit('serviceConfirmation', data);
  })
  
  // acciones al desconectar
  socket.on('disconnect', () => {
    console.log('WS: User disconnected:', socket.handshake.query.firstname, socket.handshake.query.lastname);
  });
});