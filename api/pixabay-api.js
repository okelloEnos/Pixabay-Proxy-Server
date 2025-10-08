// api/pixabay.js  (pure ESM)
export default async function handler(req, res) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
        .split(',')
        .map(o => o.trim());

    const origin = req.headers.origin || '';
    const allow =
        allowedOrigins.includes('*') ||
        allowedOrigins.some(o => o && origin.toLowerCase() === o.toLowerCase());

    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (allow) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();

    const key = process.env.PIXABAY_KEY;
    if (!key) return res.status(500).json({ error: 'PIXABAY_KEY not configured' });

    const {
        q = '',
        page = '1',
        per_page = '10',
        image_type = 'photo',
        safesearch = 'true',
        order = 'popular',
    } = req.query || {};

    const url = new URL('https://pixabay.com/api/');
    url.searchParams.set('key', key);
    url.searchParams.set('q', q);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', per_page);
    url.searchParams.set('image_type', image_type);
    url.searchParams.set('safesearch', safesearch);
    url.searchParams.set('order', order);

    try {
        const upstream = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json', 'User-Agent': 'pixabay-proxy/1.0' },
        });

        const text = await upstream.text();
        try {
            const data = JSON.parse(text);
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
            return res.status(upstream.status).json(data);
        } catch {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(upstream.status).send(text);
        }
    } catch (err) {
        return res
            .status(502)
            .json({ error: 'Upstream fetch failed', detail: String(err?.message || err) });
    }
}
