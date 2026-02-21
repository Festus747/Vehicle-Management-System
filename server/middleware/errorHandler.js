function errorHandler(err, req, res, next) {
    console.error(`[ERROR] ${err.message}`, err.stack);

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Resource already exists or constraint violation' });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
}

module.exports = errorHandler;
