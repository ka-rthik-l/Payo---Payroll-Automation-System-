import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 5);

const ALLOWED_MIMES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

function ensureUploadDirs() {
  for (const sub of ['employees', 'salaries']) {
    const dir = path.join(uploadDir, sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureUploadDirs();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = req.uploadType || 'employees';
    cb(null, path.join(uploadDir, type));
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMES.includes(file.mimetype) || file.mimetype === 'application/octet-stream';
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (extOk && (mimeOk || file.mimetype === 'application/octet-stream')) {
    cb(null, true);
    return;
  }
  const error = new Error('Unsupported file type. Use CSV or Excel.');
  error.statusCode = 400;
  error.code = 'UNSUPPORTED_FILE_TYPE';
  cb(error);
}

const baseUpload = multer({
  storage,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
  fileFilter
});

export function uploadEmployees(req, res, next) {
  req.uploadType = 'employees';
  baseUpload.single('file')(req, res, next);
}

export function uploadSalaries(req, res, next) {
  req.uploadType = 'salaries';
  baseUpload.single('file')(req, res, next);
}

export { ensureUploadDirs, uploadDir };
