import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const PIXABAY_KEY = process.env.PIXABAY_KEY;

// CORS (limit to your app origin in dev/prod)
app.use(
    cors({
        origin: ALLOWED_ORIGIN,
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Proxy endpoint
app.get('/pixabay', async (req, res) => {
    try {
        const {
            q = '',
            page = '1',
            per_page = '10',
            image_type = 'photo',
            safesearch = 'true',
            order = 'popular',
        } = req.query;

        if (!PIXABAY_KEY) {
            return res.status(500).json({ error: 'PIXABAY_KEY not configured' });
        }

        const url = new URL('https://pixabay.com/api/');
        url.searchParams.set('key', PIXABAY_KEY);
        url.searchParams.set('q', q);
        url.searchParams.set('page', page);
        url.searchParams.set('per_page', per_page);
        url.searchParams.set('image_type', image_type);
        url.searchParams.set('safesearch', safesearch);
        url.searchParams.set('order', order);

        const upstream = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        // Pass through status & JSON
        const data = await upstream.json();
        console.log(`Fetched ${data.hits.length} items from Pixabay`);
        res.status(upstream.status).json(data);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'Upstream fetch failed : ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy listening on http://localhost:${PORT}`);
});
