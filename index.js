import express from 'express'
import bodyParser from 'body-parser'
import ldap from 'ldapjs'
import cors from 'cors'

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'))

app.get('/', (req, res)=>{
    res.sendFile('/public/index.html')
})
// Función para autenticar al usuario
app.post('/ldap-login', (req, res) => {
    const { username, password } = req.body;

    // Construir el DN con base en tu estructura LDAP
    const dn = `uid=${username},ou=itsfcp,dc=iscplayground,dc=local`;

    const client = ldap.createClient({
        url: 'ldap://localhost:389'
    });

    // Paso 1: Autenticación del usuario (bind)
    client.bind(dn, password, (err) => {
        if (err) {
            console.error('Fallo de autenticación:', err);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

        console.log(`Usuario ${username} autenticado exitosamente.`);

        // Paso 2: Búsqueda de los datos del usuario
        const opts = {
            filter: `(uid=${username})`,  // Buscar por uid
            scope: 'sub',  // Buscar en todo el subárbol
            attributes: ['uid', 'mail', 'ou', 'uidNumber']  // Asegúrate de incluir los atributos que deseas
        };

        client.search('ou=itsfcp,dc=iscplayground,dc=local', opts, (err, searchRes) => {
            if (err) {
                console.error('Error en la búsqueda:', err);
                client.unbind();
                return res.status(500).json({ success: false, message: 'Error en la búsqueda LDAP' });
            }

            let userData = null;

            // Agregar eventos de búsqueda
            searchRes.on('searchEntry', (entry) => {
                //console.log('Entrada encontrada:', entry);  // Muestra toda la entrada

                // Imprimir todos los atributos disponibles
                //console.log('Atributos de la entrada:', entry.attributes);

                // Extraer valores de los atributos
                let uidValue = 'No disponible';
                let mailValue = 'No disponible';
                let cnValue = 'No disponible';
                let idValue = 'No disponible';

                // Ver todos los atributos de la entrada
                entry.attributes.forEach((attribute) => {
                    console.log(`Atributo: ${attribute.type}, Valores: ${attribute.values}`);
                    
                    // Capturar los valores de los atributos que necesitamos
                    if (attribute.type === 'uid' && attribute.values && attribute.values.length > 0) {
                        uidValue = attribute.values[0];
                    }
                    if (attribute.type === 'mail' && attribute.values && attribute.values.length > 0) {
                        mailValue = attribute.values[0];
                    }
                    if (attribute.type === 'ou' && attribute.values && attribute.values.length > 0) {
                        cnValue = attribute.values[0];
                    }
                    if (attribute.type === 'uidNumber' && attribute.values && attribute.values.length > 0) {
                        idValue = attribute.values[0];
                    }
                });

                // Asignar los valores extraídos
                userData = {
                    username: uidValue,
                    email: mailValue,
                    organization: cnValue,
                    id: idValue
                };
                console.log('Datos de la entrada:', userData);
            });

            searchRes.on('end', (result) => {
                // Cerrar la conexión LDAP después de completar la operación
                client.unbind();
                
                if (userData) {
                    return res.json({
                        success: true,
                        message: 'Autenticación y búsqueda de datos exitosa',
                        user: userData
                    });
                } else {
                    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
                }
            });

            searchRes.on('error', (err) => {
                console.error('Error en la búsqueda:', err);
                client.unbind();
                return res.status(500).json({ success: false, message: 'Error en la búsqueda LDAP' });
            });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API corriendo en http://localhost:${PORT}`);
});