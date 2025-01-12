import express from 'express';
import cors from 'cors';
import { ExecuteFileTool } from './lib/execute';

const app = express();
const port = process.env.PORT || 3001;
 
app.use(cors());
app.use(express.json());

app.post('/api/execute', async (req, res) => {

  // console.log(req.body);

  console.log(req.body);

  

  try {
    const { command, timeout } = req.body;
    const result = await ExecuteFileTool.execute(command, timeout);
    res.json(result);

    console.log("HI: ", result);
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