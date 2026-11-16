// Variables de entorno SOLO para los tests (secretos de prueba, nunca se usan en producción).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-solo-para-tests-0000000000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-solo-para-tests-000000';
process.env.QR_SECRET = 'test-qr-secret-solo-para-tests-00000000000';
// Las fotos de los tests van a una carpeta temporal distinta en cada corrida.
process.env.UPLOADS_DIR = require('path').join(require('os').tmpdir(), 'mano-amiga-test-uploads-' + process.pid);
