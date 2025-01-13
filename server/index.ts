import express from 'express';
import cors from 'cors';
import { ExecuteFileTool } from './shellExecution-Tool/execute';
import databaseRoutes from './database-tool/routes';

const app = express();
const port = process.env.PORT || 3001;
 
app.use(cors());
app.use(express.json());

// Add database routes
app.use('/api/database', databaseRoutes);



app.post('/api/execute', async (req, res) => {
  try {
    const { command, timeout } = req.body;
    const result = await ExecuteFileTool.execute(command, timeout);
    
    // // Store execution result in database
    // await DatabaseService.safeExecute(
    //   'INSERT INTO execution_logs (command, output, success, executed_at) VALUES ($1, $2, $3, $4)',
    //   [command, result.output, result.success, new Date()]
    // );

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 