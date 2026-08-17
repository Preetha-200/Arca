const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const categories = [
    { id: 'living-room', url: 'https://www.livspace.com/in/design-ideas/living-rooms' },
    { id: 'kitchen', url: 'https://www.livspace.com/in/design-ideas/kitchens' },
    { id: 'dining-room', url: 'https://www.livspace.com/in/design-ideas/dining-rooms' },
    { id: 'home-office', url: 'https://www.livspace.com/in/design-ideas/study-rooms' },
    { id: 'bedroom', url: 'https://www.livspace.com/in/design-ideas/bedrooms' },
    { id: 'bathroom', url: 'https://www.livspace.com/in/design-ideas/bathrooms' },
];

const publicDir = path.join(__dirname, 'client', 'public', 'designs');

// Helper to download image
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
            }
            const file = fs.createWriteStream(filepath);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => reject(err));
        });
    });
}

function generateSize(categoryId) {
    const sizes = {
        'living-room': ['18x16 feet', '20x18 feet', '16x14 feet', '14x12 feet'],
        'kitchen': ['12x10 feet', '14x12 feet', '10x8 feet', '16x12 feet'],
        'dining-room': ['14x12 feet', '16x14 feet', '12x10 feet'],
        'home-office': ['10x8 feet', '12x10 feet', '14x12 feet'],
        'bedroom': ['16x14 feet', '14x12 feet', '12x10 feet', '18x16 feet'],
        'bathroom': ['8x6 feet', '10x8 feet', '7x5 feet', '9x7 feet']
    };
    const opts = sizes[categoryId] || ['12x10 feet'];
    return opts[Math.floor(Math.random() * opts.length)];
}

async function scrapeCategory(cat) {
    console.log(`Scraping category: ${cat.id} from ${cat.url}`);
    
    // Create dir
    const dir = path.join(publicDir, cat.id);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        const response = await fetch(cat.url);
        const html = await response.text();
        
        // Extract all cloudfront URLs
        const urls = html.match(/https:\/\/d3gq2merok8n5r\.cloudfront\.net\/[^"'\s\?&#;]+/g) || [];
        const uniqueUrls = [...new Set(urls)];
        
        // Filter out logos, icons, badges
        const validImages = uniqueUrls.filter(u => {
            const lower = u.toLowerCase();
            return !lower.includes('favicon') && 
                   !lower.includes('icon') && 
                   !lower.includes('logo') && 
                   !lower.includes('store') &&
                   !lower.includes('banner') &&
                   !lower.includes('svg');
        });

        console.log(`Found ${validImages.length} potential images for ${cat.id}. Processing up to 30.`);
        
        const finalProducts = [];
        const limit = Math.min(30, validImages.length);
        
        for (let i = 0; i < limit; i++) {
            const src = validImages[i];
            const ext = src.split('.').pop().split('?')[0] || 'jpg';
            
            const filename = `${cat.id}-${i + 1}.${ext}`;
            const filepath = path.join(dir, filename);
            const dbImagePath = `/designs/${cat.id}/${filename}`;
            
            try {
                await downloadImage(src, filepath);
                
                const roomType = cat.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                finalProducts.push({
                    id: `${cat.id}-${i + 1}`,
                    category: cat.id,
                    roomType: roomType,
                    title: `Modern ${roomType} Design ${i + 1}`,
                    size: generateSize(cat.id),
                    description: `A beautifully designed ${roomType.toLowerCase()} curated for modern living.`,
                    image: dbImagePath,
                    popular: Math.random() > 0.8,
                    createdAt: new Date().toISOString()
                });
                
            } catch (err) {
                console.error(`Failed to download ${src}:`, err.message);
            }
        }
        
        return finalProducts;
        
    } catch (err) {
        console.error(`Failed to scrape ${cat.id}:`, err);
        return [];
    }
}

async function run() {
    let allProducts = [];
    
    for (const cat of categories) {
        const catProducts = await scrapeCategory(cat);
        allProducts = allProducts.concat(catProducts);
        console.log(`Finished ${cat.id}: Saved ${catProducts.length} items.\n`);
    }

    // Write to products.js without prices
    const jsContent = `/**
 * Generated product catalog.
 * Note: Prices have been entirely removed as requested.
 */
export const products = ${JSON.stringify(allProducts, null, 2)};

export const getCategories = () => [
  ...new Set(products.map((p) => p.category)),
];

export const getProductsByCategory = (category) =>
  products.filter((p) => p.category === category);

export const getProductById = (id) => products.find((p) => p.id === id);
`;

    const outPath = path.join(__dirname, 'client', 'src', 'data', 'products.js');
    fs.writeFileSync(outPath, jsContent);
    console.log(`\nSuccessfully wrote ${allProducts.length} total products to ${outPath}`);
}

run();
