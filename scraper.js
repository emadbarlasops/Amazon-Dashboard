const puppeteer = require('puppeteer');

// ✅ FIX: Custom wait helper (replaces page.waitForTimeout)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeAmazonASIN(asin) {
  console.log(`🔍 Scraping ASIN: ${asin}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const result = {
    asin,
    title: '',
    bullets: [],
    aplus: '',
    reviews: [],
    price: '',
    rating: '',
    reviewCount: ''
  };

  try {
    await page.goto(`https://www.amazon.com/dp/${asin}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await wait(3000); // ✅ Fixed wait

    result.title = await page.$eval(
      '#productTitle',
      el => el.textContent.trim()
    ).catch(() => 'Not found');

    result.bullets = await page.$$eval(
      '#feature-bullets ul li span.a-list-item',
      els => els.map(el => el.textContent.trim()).filter(t => t.length > 10)
    ).catch(() => []);

    result.price = await page.$eval(
      '.a-price .a-offscreen',
      el => el.textContent.trim()
    ).catch(() => 'Not found');

    result.rating = await page.$eval(
      'span[data-hook="rating-out-of-text"]',
      el => el.textContent.trim()
    ).catch(() => 'Not found');

    result.reviewCount = await page.$eval(
      '#acrCustomerReviewText',
      el => el.textContent.trim()
    ).catch(() => 'Not found');

    result.aplus = await page.$eval(
      '#aplus, #aplus3p_feature_div',
      el => el.innerText.trim()
    ).catch(() => 'No A+ content found');

    console.log(`✅ Product page scraped: ${result.title.substring(0, 60)}...`);

    await page.goto(
      `https://www.amazon.com/product-reviews/${asin}?sortBy=recent&pageNumber=1`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    await wait(3000); // ✅ Fixed wait

    result.reviews = await page.$$eval(
      '[data-hook="review"]',
      reviews => reviews.slice(0, 10).map(r => ({
        rating: r.querySelector('[data-hook="review-star-rating"]')?.textContent?.trim() || '',
        title:  r.querySelector('[data-hook="review-title"]')?.textContent?.trim() || '',
        body:   r.querySelector('[data-hook="review-body"]')?.textContent?.trim() || ''
      }))
    ).catch(() => []);

    console.log(`✅ Reviews scraped: ${result.reviews.length} reviews`);

  } catch (error) {
    console.error(`❌ Error scraping ${asin}:`, error.message);
  }

  await browser.close();
  return result;
}

async function findCompetitors(seedAsin) {
  console.log(`🔍 Finding competitors for: ${seedAsin}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const competitorAsins = [];

  try {
    await page.goto(`https://www.amazon.com/dp/${seedAsin}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await wait(3000); // ✅ Fixed wait

    const asins = await page.$$eval(
      '[data-asin]',
      els => [...new Set(
        els
          .map(el => el.getAttribute('data-asin'))
          .filter(a => a && a.length === 10 && /^[A-Z0-9]+$/.test(a))
      )].slice(0, 5)
    );

    competitorAsins.push(...asins);
    console.log(`✅ Found ${competitorAsins.length} competitor ASINs:`, competitorAsins);

  } catch (error) {
    console.error('❌ Error finding competitors:', error.message);
  }

  await browser.close();
  return competitorAsins;
}

module.exports = { scrapeAmazonASIN, findCompetitors };