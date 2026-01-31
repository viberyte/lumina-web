import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Paste the new data here
const newData = `
https://watermarkny.com/ | https://www.instagram.com/watermarkny
http://www.fornino.com/ | https://www.instagram.com/forninopizza
https://www.thedelancey.com/ | https://www.instagram.com/thedelancey
http://www.americanonj.com/ | https://www.instagram.com/americanonj
http://www.jasperstonenj.com/ | https://instagram.com/jasperstonenj
https://www.missionceviche.com/ | https://www.instagram.com/missionceviche
http://www.sylviasrestaurant.com/ | https://www.instagram.com/sylviasrestaurant
http://www.atlanticgrill.com/ | https://www.instagram.com/atlanticgrillnyc
https://www.shawnaeshouse.com/ | https://www.instagram.com/shawnaeshouse
http://czennyc.com/ | https://www.instagram.com/czenrestaurant
https://citywinery.com/pages/locations/city-vineyard | https://www.instagram.com/cityvineyardnyc
https://www.mezzeontheriver.com/ | https://www.instagram.com/mezzeontheriver
http://www.230-fifth.com/ | https://www.instagram.com/230fifthrooftop
https://bluonthehudson.com/ | https://www.instagram.com/bluonthehudson
https://shinjukusushi.com/ | https://www.instagram.com/shinjukusushius
https://www.markettablenyc.com/ | https://www.instagram.com/markettablenyc
https://www.saintrestolounge.com/menu-4 | http://instagram.com/saintloungenyc
https://www.aperibar.com/ | https://www.instagram.com/aperibar
https://moxychelsea.com/the-fleur-room/ | https://www.instagram.com/FleurRoomNY
https://jaranarestaurant.com/new-jersey/ | https://www.instagram.com/jarana.nj/
http://www.filenyc.com/ | https://www.instagram.com/filegumbobar
https://www.eataly.com/us_en/stores/nyc-flatiron | https://www.instagram.com/eatalynewyorkcity
http://www.scarrspizza.com/ | https://www.instagram.com/scarrspizza
https://opheliany.com/ | https://www.instagram.com/opheliany
https://www.barcimanyc.com/ | https://www.instagram.com/barcimanyc
http://docksoff5th.com/ | https://www.instagram.com/docksoff5th
https://ayzanyc.com/ | https://www.instagram.com/ayzanyc
http://www.mariebelle.com/ | https://www.instagram.com/mariebelleofficial
https://moxyeastvillage.com/cathedrale/ | https://www.instagram.com/cathedralenewyork
https://www.grandbrasserie.com/ | https://www.instagram.com/grandbrasserienyc
https://pointsevennyc.com/ | https://www.instagram.com/pointsevennyc
http://wonderlandbarnyc.com/ | https://www.instagram.com/wonderlandbarnyc
https://www.thebazaar.com/location/new-york-city/ | https://www.instagram.com/bazaarbyjose
https://www.meduza33.com/ | https://www.instagram.com/meduzamediterrania
http://cecconisdumbo.com/ | https://www.instagram.com/cecconisrestaurants
http://www.maisoncloserestaurant.com/ | https://www.instagram.com/maisoncloserestaurant
https://www.theplazany.com/ | http://www.instagram.com/theplazahotel
https://53-nyc.com/ | https://www.instagram.com/53nyc
https://www.sansabinonyc.com/ | https://www.instagram.com/sansabinonyc
https://www.manhattarestaurant.com/ | https://www.instagram.com/manhatta_nyc
https://cafecarmellini.com/ | http://instagram.com/cafecarmellini
https://www.barprimi.com/bowery | https://www.instagram.com/barprimi
http://www.spicymoonnyc.com/ | https://www.instagram.com/spicymoonnyc
https://www.upandupnyc.com/ | https://www.instagram.com/theupandupnyc
https://www.noburestaurants.com/downtown/home/ | https://www.instagram.com/noburestaurants
http://anejotribeca.com/ | https://www.instagram.com/anejonyc
http://fridamidtown.com/ | https://www.instagram.com/fridamidtown
http://tinosnyc.com/ | https://www.instagram.com/tinosnyc
https://www.marlowbistro.com/ | https://www.instagram.com/marlowbistro
http://www.citricocafe.com/ | https://www.instagram.com/citricocafe
https://www.boskeastoria.com/ | http://instagram.com/boskeastoria
https://www.sinigualrestaurants.com/ | https://www.instagram.com/sinigualnyc
https://www.casaoranyc.com/ | https://www.instagram.com/casaoranyc
http://www.upthainyc.com/ | https://www.instagram.com/upthainyc
https://www.lapecorabianca.com/ | https://www.instagram.com/lapecorabianca
https://sanbabilanyc.com/ | https://www.instagram.com/sanbabilanyc
https://www.birdlandjazz.com/ | https://www.instagram.com/birdlandjazz
http://goodroombk.com/ | https://instagram.com/goodroombk
http://www.monarchrooftop.com/ | https://www.instagram.com/monarchnyc
http://www.carnegie-club.com/ | https://www.instagram.com/thecarnegieclubnyc
https://www.broadwaylounge.nyc/ | https://www.instagram.com/broadwayloungenyc
https://miranyc34.com/ | https://www.instagram.com/miranyc34
https://www.lagosnyc.com/ | https://www.instagram.com/lagosnyc
https://www.lostinparadiserooftop.com/ | https://www.instagram.com/lostinparadiserooftop
https://refineryrooftop.com/ | https://www.instagram.com/refineryrooftop
https://www.castellnyc.com/ | https://www.instagram.com/castellnyc
http://www.havenrooftop.com/ | http://instagram.com/havenrooftop
http://www.pdtnyc.com/ | https://www.instagram.com/pdtnyc
https://vintagegreen.nyc/ | https://www.instagram.com/vintagegreen.nyc
https://www.deluxxfluxx.com/ | https://www.instagram.com/deluxxfluxxnyc
http://moxytimessquare.com/dining/magic-hour-rooftop-bar-lounge/ | https://www.instagram.com/magichourny
http://oscarwildenyc.com/ | https://www.instagram.com/oscarwildenyc
http://tavernonthegreen.com/menu | https://www.instagram.com/tavernonthegreen
https://electriclemonnyc.com/ | https://instagram.com/electriclemonnyc
https://www.ocean-prime.com/locations/new-york-city | https://www.instagram.com/oceanprimenyc
https://www.boucherieus.com/ | https://www.instagram.com/boucherie_us
https://www.mastrosrestaurants.com/Locations/NY/New-York/ | https://www.instagram.com/mastrosofficial
https://www.barblondeau.com/ | https://www.instagram.com/barblondeau
https://www.laserwolfbrooklyn.com/ | https://www.instagram.com/laserwolf_bk
https://charmbarrestaurant.com/ | https://www.instagram.com/charmbarbk
https://www.sungoldbk.com/ | https://www.instagram.com/sungoldbk
https://www.rivercafe.com/ | https://www.instagram.com/therivercafe
http://parkslope.miriamrestaurant.com/ | https://www.instagram.com/miriamrest
https://www.fandimata.com/ | https://www.instagram.com/fandimatabklyn
https://www.felicerestaurants.com/felice-montague/ | https://www.instagram.com/felice.restaurants
https://www.bcrestaurantgroup.com/location/peaches-kitchen-bar/ | https://www.instagram.com/PeachesBrooklyn
https://www.salvajesocialclub.com/ | http://www.instagram.com/salvajesocialclub.nyc
https://thelocalbar4104.wixsite.com/website | https://www.instagram.com/the.local.bar.astoria
http://www.vistalic.com/ | https://www.instagram.com/vistaskylounge
http://www.blendonthewater.com/ | https://www.instagram.com/blendonthewater
http://www.christossteakhouse.com/ | https://www.instagram.com/christossteakhouse
http://primemetny.com/ | https://www.instagram.com/primemetsteakhouse
https://fogodechao.com/location/queens/ | https://www.instagram.com/fogo
https://www.eatatmomsnyc.com/ | https://www.instagram.com/momsmidtown
https://www.vistamarcityisland.com/ | https://www.instagram.com/vistamarcityisland
https://www.aquabxnyc.com/ | https://www.instagram.com/aqua_bar_grill
http://www.theheightsnyc.com/ | https://www.instagram.com/theheightsuws
https://theblackwhalefb.wixsite.com/theblackwhaleci | https://www.instagram.com/the_black_whale
http://www.theashfordjc.com/ | https://www.instagram.com/theashfordjc
https://www.hudsonandconj.com/ | https://www.instagram.com/hudsonandconj
https://linktr.ee/bigapplebrunch | https://instagram.com/bigapplebrunch
https://lifeafterrestaurant.com/ | https://www.instagram.com/lifeafterrestaurant
https://www.denovoeuropeanpub.com/edgewater | https://instagram.com/denovoedgewater
https://www.lululoungejersey.com/ | https://www.instagram.com/lululoungejersey
http://spiritbarrestaurant.com/ | https://www.instagram.com/spiritrestaurantbar
http://www.lejardin57.com/ | https://www.instagram.com/lejardin57nyc
http://www.nysapphire.com/ | https://www.instagram.com/sapphireclubny
https://www.concourseclubnj.com/ | https://www.instagram.com/concourseclub
https://linktr.ee/BoulevardDinerNJ | https://instagram.com/boulevarddinernj
https://www.faubourgnj.com/ | https://www.instagram.com/faubourgnj
http://www.rumbacubana.com/northbergen/ | https://www.instagram.com/rumbacubana_official
http://vaultnj.com/ | https://www.instagram.com/thevaultloungenj
https://www.njpac.org/venue/nico-kitchen-bar/ | https://www.instagram.com/njpac
http://agavemarianj.com/ | https://www.instagram.com/agavemaria.nj
http://destinolabnj.com/ | https://www.instagram.com/destinolabnj
http://bit.ly/2vdIePG | https://www.instagram.com/casa_dpaco
http://www.cornbreadsoul.com/ | https://www.instagram.com/Cornbreadsoul
https://highlawn.com/ | https://www.instagram.com/thehighlawn
https://www.frescodafranco.com/ | http://instagram.com/fresco_da_franco
`.trim();

console.log('\n📥 IMPORTING NEW GEMINI BATCH\n');
console.log('='.repeat(60));

const lines = newData.split('\n');
console.log(`\n✅ ${lines.length} entries to process\n`);

const venues = db.prepare(`
  SELECT id, name, website 
  FROM venues 
  WHERE state IN ('NY', 'NJ')
`).all();

let saved = 0;
let skipped = 0;

for (const line of lines) {
  const [websiteUrl, igUrl] = line.split('|').map(s => s.trim());
  
  const match = igUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (!match) continue;
  
  const handle = match[1].replace('/', '');
  
  // Normalize URLs for matching
  const cleanUrl = websiteUrl.toLowerCase()
    .replace(/https?:\/\/(www\.)?/, '')
    .split(/[?#]/)[0]
    .replace(/\/$/, '');
  
  const venue = venues.find(v => {
    if (!v.website) return false;
    const cleanVenue = v.website.toLowerCase()
      .replace(/https?:\/\/(www\.)?/, '')
      .split(/[?#]/)[0]
      .replace(/\/$/, '');
    
    return cleanUrl === cleanVenue || 
           cleanUrl.startsWith(cleanVenue) || 
           cleanVenue.startsWith(cleanUrl);
  });
  
  if (!venue) continue;
  
  try {
    db.prepare(`
      UPDATE venues SET instagram_handle = ? WHERE id = ?
    `).run(handle, venue.id);
    
    saved++;
    if (saved % 20 === 0) console.log(`   ✓ Saved ${saved}...`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      skipped++;
    } else {
      throw error;
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ IMPORT COMPLETE!`);
console.log(`   New handles: ${saved}`);
console.log(`   Duplicates: ${skipped}`);
console.log('='.repeat(60) + '\n');

db.close();
