import express, { Request, Response, NextFunction } from 'express';
import { uploadFile, downloadFile } from './index';
import * as dotenv from 'dotenv';
import multer from 'multer';

// Cấu hình multer để lưu tệp tạm thời
const upload = multer({ dest: 'uploads/' });

dotenv.config();

const app = express();
app.use(express.json());

// Middleware xử lý lỗi
const errorHandler: express.ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err.message });
};
app.use(errorHandler);

// Endpoint nhận tệp từ Spring Boot
app.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const filePath = req.file.path;
    console.log("FILE PATH: ", filePath);
    const result = await uploadFile(filePath);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Endpoint tải xuống
app.post('/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rootHash, outputPath } = req.body;
    if (!rootHash || !outputPath) {
      res.status(400).json({ success: false, error: 'Missing rootHash or outputPath' });
      return;
    }
    const result = await downloadFile(rootHash, outputPath);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
