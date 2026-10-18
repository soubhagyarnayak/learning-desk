import 'dotenv/config';
import path from 'path';
import express from 'express';

import { verifyConnection } from './config/db';
import { UPLOAD_DIR } from './config/uploads';
import indexRouter from './routes/index';
import learningPlansRouter from './routes/learningPlans';
import learningSectionsRouter from './routes/learningSections';
import learningTasksRouter from './routes/learningTasks';

const app = express();
const PORT = Number(process.env.PORT) || 3005;

// views/ and public/ live at the project root, one level above src/ (or dist/).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Formatting helpers available in every view.
app.locals.formatHours = (hours: number) => String(Math.round(hours * 100) / 100);
app.locals.plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/', indexRouter);
app.use('/learning-plans', learningPlansRouter);
app.use('/learning-plans/:planId/sections', learningSectionsRouter);
app.use('/learning-plans/:planId/sections/:sectionId/tasks', learningTasksRouter);

verifyConnection()
  .then(() => {
    console.log(`Connected to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    app.listen(PORT, () => {
      console.log(`Learning Desk running at http://localhost:${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  });
