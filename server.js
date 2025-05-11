import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import ldap from 'ldapjs';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectMongo } from './db/mongo.js';
import { mysqlPool } from './db/mysql.js';
import messagesRouter from './routes/messages.js';

// Load environment variables
dotenv.config();

// Initialize Express and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST']
  }
});

// Apply middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Use the messages router if needed
// app.use('/api/messages', messagesRouter);

// API Routes for messages
app.get('/api/messages', async (req, res) => {
  try {
    const [messages] = await mysqlPool.query('SELECT * FROM messages ORDER BY date ASC');
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Error al obtener mensajes', error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { sender, message } = req.body;
  if (!sender || !message) {
    return res.status(400).json({ message: 'Faltan datos requeridos: sender y message' });
  }

  try {
    const [result] = await mysqlPool.query(
      'INSERT INTO messages (sender, message, date) VALUES (?, ?, NOW())', 
      [sender, message]
    );
    
    const newMessage = { 
      id: result.insertId, 
      sender, 
      message, 
      date: new Date() 
    };
    
    io.emit('newMessage', newMessage);
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).json({ message: 'Error al guardar mensaje', error: err.message });
  }
});

// LDAP Authentication route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  // Local admin authentication
  if (username === 'admin' && password === '1234') {
    return res.json({ 
      success: true, 
      message: 'Autenticado localmente como admin',
      user: { 
        username: 'admin',
        email: 'admin@local',
        organization: 'administradores',
        id: '0'
      }
    });
  }

  // LDAP authentication
  const dn = `uid=${username},ou=itsfcp,dc=iscplayground,dc=local`;
  const client = ldap.createClient({
    url: process.env.LDAP_URL || 'ldap://localhost:389'
  });

  client.bind(dn, password, (err) => {
    if (err) {
      console.error('Authentication failed:', err);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log(`User ${username} successfully authenticated`);

    const opts = {
      filter: `(uid=${username})`,
      scope: 'sub',
      attributes: ['uid', 'mail', 'ou', 'uidNumber']
    };

    client.search('ou=itsfcp,dc=iscplayground,dc=local', opts, (err, searchRes) => {
      if (err) {
        console.error('LDAP search error:', err);
        client.unbind();
        return res.status(500).json({ success: false, message: 'LDAP search error' });
      }

      let userData = null;

      searchRes.on('searchEntry', (entry) => {
        const attributes = {};
        
        entry.attributes.forEach(attr => {
          attributes[attr.type] = attr.values[0];
        });

        userData = {
          username: attributes.uid || 'Not available',
          email: attributes.mail || 'Not available',
          organization: attributes.ou || 'Not available',
          id: attributes.uidNumber || 'Not available'
        };
      });

      searchRes.on('end', () => {
        client.unbind();
        if (userData) {
          res.json({
            success: true,
            message: 'LDAP authentication successful',
            user: userData
          });
        } else {
          res.status(404).json({ success: false, message: 'User not found in LDAP' });
        }
      });

      searchRes.on('error', (err) => {
        console.error('LDAP search error:', err);
        client.unbind();
        res.status(500).json({ success: false, message: 'LDAP search error' });
      });
    });
  });
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send message history to newly connected users
  mysqlPool.query('SELECT * FROM messages ORDER BY date ASC')
    .then(([messages]) => {
      socket.emit('messageHistory', messages);
    })
    .catch(err => {
      console.error('Error loading message history:', err);
    });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize databases
async function initDatabases() {
  // Uncomment to connect to MongoDB if needed
  // try {
  //   await connectMongo();
  //   console.log('MongoDB connected');
  // } catch (err) {
  //   console.error('MongoDB connection error:', err);
  // }

  // Test MySQL connection
  try {
    await mysqlPool.query('SELECT 1');
    console.log('MySQL connected');
  } catch (err) {
    console.error('MySQL connection error:', err);
    process.exit(1); // Exit if database connection fails
  }
}

// Start the server
const PORT = process.env.PORT || 4000;

// Initialize databases and start server
initDatabases().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});