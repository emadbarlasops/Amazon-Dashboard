const { scrapeAmazonASIN, findCompetitors } = require('./scraper');
const { analyzeCompetitors } = require('./analyzer');
const fs = require('fs');
require('dotenv').config();

// ============================================================
// CONFIGURE YOUR RUN HERE — change these values
// ============================================================
const YOUR_CLIENT_ASIN = 'B078SZX3ML';  // ← Replace with your client's ASIN
const CATEGORY = 'Mushrooms';    // ← Replace with the product category
// ============================================================

async function main() {
  console.log('\n🚀 Starting Amazon Competitor Analysis');
  console.log('=====================================');
  console.log(`Client ASIN: ${YOUR_CLIENT_ASIN}`);
  console.log(`Category: ${CATEGORY}\n`);

  // Step 1: Find competitors
  const competitorAsins = await findCompetitors(YOUR_CLIENT_ASIN);
  
  if (competitorAsins.length === 0) {
    console.log('⚠️  No competitors found automatically. Add ASINs manually in run.js');
    return;
  }

  // Step 2: Also scrape the client's own listing for comparison
  const allAsins = [YOUR_CLIENT_ASIN, ...competitorAsins];
  
  // Step 3: Scrape all ASINs
  const scrapedData = [];
  for (const asin of allAsins) {
    const data = await scrapeAmazonASIN(asin);
    scrapedData.push(data);
    
    // Wait 3 seconds between requests (polite scraping, avoids blocks)
    console.log('⏳ Waiting 3 seconds before next request...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Step 4: Save raw scraped data
  if (!fs.existsSync('./results')) fs.mkdirSync('./results');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFile = `./results/raw_${YOUR_CLIENT_ASIN}_${timestamp}.json`;
  fs.writeFileSync(rawFile, JSON.stringify(scrapedData, null, 2));
  console.log(`\n💾 Raw data saved: ${rawFile}`);

  // Step 5: Send to Claude for analysis
  const competitorData = scrapedData.filter(d => d.asin !== YOUR_CLIENT_ASIN);
  const analysis = await analyzeCompetitors(competitorData, CATEGORY);

  // Step 6: Save analysis results
  const analysisFile = `./results/analysis_${YOUR_CLIENT_ASIN}_${timestamp}.json`;
  const fullReport = {
    meta: {
      client_asin: YOUR_CLIENT_ASIN,
      category: CATEGORY,
      competitor_asins: competitorAsins,
      run_date: new Date().toISOString()
    },
    raw_data: scrapedData,
    claude_analysis: analysis
  };
  
  fs.writeFileSync(analysisFile, JSON.stringify(fullReport, null, 2));
  
  console.log('\n✅ ANALYSIS COMPLETE');
  console.log('====================');
  console.log(`📁 Full report saved: ${analysisFile}`);
  console.log('\n📊 Quick Summary:');
  console.log(`• Top claims found: ${analysis.top_claims?.length || 0}`);
  console.log(`• Emotional triggers: ${analysis.emotional_triggers?.length || 0}`);
  console.log(`• Common objections: ${analysis.common_objections?.length || 0}`);
  console.log(`• Feature gaps: ${analysis.feature_gaps?.length || 0}`);
  console.log('\n💡 Recommended positioning:');
  console.log(analysis.recommended_positioning || 'See full report');
}

main().catch(console.error);