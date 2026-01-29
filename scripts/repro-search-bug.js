const Marketplace = require('../src/models/Marketplace');

async function testSearch() {
    try {
        console.log('Searching for "hlo"...');
        const result = await Marketplace.getProducts({ q: 'hlo', limit: 10 });

        console.log(`Total Results: ${result.total}`);
        console.log(`Returned Products: ${result.products.length}`);

        if (result.products.length > 0) {
            console.log('First Product:', result.products[0].title);
            console.log('❌ Bug Reproduced: Expected 0 results, got ' + result.products.length);
        } else {
            console.log('✅ Correct Behavior: 0 results found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSearch();
