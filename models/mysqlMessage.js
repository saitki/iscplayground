import { mysqlPool } from '../db/mysql.js';

export const saveMysqlMessage = async (sender, message) => {
  try {
    const sql = 'INSERT INTO messages (sender, message, date) VALUES (?, ?, NOW())';
    await mysqlPool.query(sql, [sender, message]);
  } catch (error) {
    console.error('Error al guardar el mensaje:', error);
    throw new Error('Error al guardar el mensaje');
  }
};

export const getMysqlMessages = async () => {
  try {
    const [rows] = await mysqlPool.query('SELECT * FROM messages ORDER BY date ASC');
    return rows;
  } catch (error) {
    console.error('Error al obtener los mensajes:', error);
    throw new Error('Error al obtener los mensajes');
  }
};
