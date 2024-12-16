const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("justi.json");
const middlewares = jsonServer.defaults();
const fs = require("fs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

const port = process.env.PORT || 10000;

// Configuración de nodemailer (asegúrate de configurar correctamente el servicio)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'trabajoduoc2024@gmail.com', // Cambia esto por tu email
    pass: 'duoc2024'       // Cambia esto por tu contraseña o utiliza una app password
  }
});

server.use(middlewares);

// Función para leer el archivo JSON y parsearlo
const readJson = () => JSON.parse(fs.readFileSync("justi.json", "utf-8"));

// Función para escribir en el archivo JSON
const writeJson = (data) => fs.writeFileSync("justi.json", JSON.stringify(data, null, 2));

// Ruta para solicitar el restablecimiento de la contraseña
server.post("/reset-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "El email es obligatorio." });

  const data = readJson();
  const user = data.usuarios.find((u) => u.email === email);

  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

  // Generar un token de restablecimiento
  const resetToken = uuidv4();
  const tokenExpiration = Date.now() + 3600000; // El token expira en 1 hora

  // Guardar el token y la expiración en el JSON
  user.resetToken = resetToken;
  user.tokenExpiration = tokenExpiration;
  writeJson(data);

  // Enviar el correo con el enlace para restablecer la contraseña
  const resetLink = `https://apidata-4bv6.onrender.com/reset-password/${resetToken}`; // Cambia la URL
  const mailOptions = {
    from: "trabajoduoc2024@gmail.com", // Cambia esto por tu email
    to: email,
    subject: "Restablecimiento de Contraseña",
    text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.status(500).json({ error: "No se pudo enviar el correo.", details: err });
    res.json({ message: "Correo enviado.", resetLink });
  });
});

// Ruta para restablecer la contraseña
server.post("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ error: "La nueva contraseña es obligatoria." });

  const data = readJson();
  const user = data.usuarios.find((u) => u.resetToken === token && u.tokenExpiration > Date.now());

  if (!user) return res.status(400).json({ error: "Token inválido o expirado." });

  // Actualizar la contraseña del usuario
  user.password = newPassword;
  delete user.resetToken;
  delete user.tokenExpiration;
  writeJson(data);

  res.json({ message: "Contraseña restablecida con éxito." });
});

// Usar las rutas estándar de json-server
server.use(router);

server.listen(port, () => {
  console.log(`Servidor ejecutándose en el puerto ${port}`);
});
