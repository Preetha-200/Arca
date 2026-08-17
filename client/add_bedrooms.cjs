const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public', 'designs', 'bedroom');
const productsFile = path.join(__dirname, 'src', 'data', 'products.js');

let productsContent = fs.readFileSync(productsFile, 'utf8');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

const sizes = ['16x14 feet', '14x12 feet', '12x10 feet', '18x16 feet'];
const materials = ['Wood & Fabric', 'Metal & Glass', 'Oak & Linen', 'Walnut & Leather'];
const colors = ['Beige & Cream', 'Charcoal & White', 'Navy & Brass', 'Pale Pink & Rose Gold'];
const finishes = ['Matte', 'Glossy', 'Satin', 'Textured'];

const bedroomProducts = files.map((filename, i) => {
    const id = `bedroom-${filename.split('.')[0]}`;
    return {
        id,
        category: 'bedroom',
        roomType: 'Bedroom',
        title: `Elegant Modern Bedroom Design ${i+1}`,
        size: sizes[i % sizes.length],
        material: materials[i % materials.length],
        finish: finishes[i % finishes.length],
        color: colors[i % colors.length],
        description: `A beautifully designed modern bedroom featuring a ${colors[i%colors.length].toLowerCase()} palette, ${materials[i%materials.length].toLowerCase()} textures, and a ${finishes[i%finishes.length].toLowerCase()} finish. A perfect sanctuary for relaxation.`,
        image: `/designs/bedroom/${filename}`,
        popular: Math.random() > 0.5,
        createdAt: new Date().toISOString()
    };
});

const endIndex = productsContent.indexOf('];');
if (endIndex === -1) {
    console.error('Could not find end of array');
    process.exit(1);
}

let arrayPart = productsContent.substring(0, endIndex);
let remainingPart = productsContent.substring(endIndex);

const lastItemMatch = arrayPart.lastIndexOf('}');
if (lastItemMatch !== -1) {
    arrayPart = arrayPart.substring(0, lastItemMatch + 1) + ',\n';
}

const newItemsString = bedroomProducts.map(p => '  ' + JSON.stringify(p, null, 4).replace(/\n/g, '\n  ')).join(',\n');

const newContent = arrayPart + newItemsString + '\n' + remainingPart;

fs.writeFileSync(productsFile, newContent);
console.log('Successfully added ' + bedroomProducts.length + ' bedroom products.');
