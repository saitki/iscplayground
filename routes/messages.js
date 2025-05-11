import { Router } from 'express';
import { saveMysqlMessage, getMysqlMessages } from '../models/mysqlMessage.js';

const messagesRouter = (io) => {
  const router = Router();

  // Obtener mensajes desde MySQL
  router.get('/', async (req, res) => {
    try {
      const messages = await getMysqlMessages();
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: 'Error al obtener mensajes' });
    }
  });

  // Guardar mensaje y emitir por WebSocket
  router.post('/', async (req, res) => {
    const { sender, message } = req.body;
    if (!sender || !message)
      return res.status(400).json({ message: 'Faltan datos' });

    try {
      await saveMysqlMessage(sender, message);
      io.emit('newMessage', { sender, message }); // Emitir mensaje por WebSocket
      res.status(201).json({ sender, message });
    } catch (err) {
      res.status(500).json({ message: 'Error al guardar mensaje' });
    }
  });

  return router;
};

export default messagesRouter;
