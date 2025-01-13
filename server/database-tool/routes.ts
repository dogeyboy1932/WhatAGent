import express, { Request, Response } from 'express';
import { DatabaseService } from './dbService';

const router = express.Router();

// Test both database and API connections
router.get('/test', async (req: Request, res: Response) => {
    try {
        const connectionStatus = await DatabaseService.testConnection();
        res.json({
            success: connectionStatus.connected,
            status: {
                database: connectionStatus.connected ? 'connected' : 'disconnected',
                api: connectionStatus.connected ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Connection test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Execute a query
router.post('/query', async (req: Request, res: Response) => {

    console.log("Entered query");

    try {
        const { query, operation, params } = req.body;
        
        // Validate required fields
        if (!operation) {
            return res.status(400).json({ error: 'Operation type is required' });
        }

        if (!query && !['LIST_TABLES'].includes(operation)) {
            return res.status(400).json({ error: 'Query is required for this operation' });
        }

        console.log("query: ", query);
        console.log("operation: ", operation);
        console.log("params: ", params);

        let result;
        switch (operation.toUpperCase()) {
            case 'SELECT':
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
                result = await DatabaseService.safeExecute(query, operation, params);
                break;

            case 'LIST_TABLES':
                result = await DatabaseService.getTables();
                break;

            case 'DESCRIBE':
                result = await DatabaseService.safeExecute(
                    `SELECT 
                        column_name, 
                        data_type, 
                        character_maximum_length,
                        column_default,
                        is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1`,
                    'SELECT',
                    [query]
                );
                break;

            default:
                return res.status(400).json({ error: `Unsupported operation: ${operation}` });
        }

        res.json(result);
        console.log("result: ", result);
    } catch (error) {
        res.status(500).json({ 
            error: 'Query execution failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// // Get available tables
// router.get('/tables', async (req: Request, res: Response) => {
//     try {
//         const tables = await DatabaseService.getTables();
//         res.json(tables);
//     } catch (error) {
//         res.status(500).json({ 
//             error: 'Failed to fetch tables',
//             details: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// });

// // Describe table structure
// router.get('/describe/:tableName', async (req: Request, res: Response) => {
//     try {
//         const { tableName } = req.params;
//         const result = await DatabaseService.safeExecute(
//             `SELECT 
//                 column_name, 
//                 data_type, 
//                 character_maximum_length,
//                 column_default,
//                 is_nullable
//             FROM information_schema.columns 
//             WHERE table_name = $1`,
//             'SELECT',
//             [tableName]
//         );
//         res.json(result.rows || result);
//     } catch (error) {
//         res.status(500).json({ 
//             error: 'Failed to describe table',
//             details: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// });

export default router;