#!/usr/bin/env python3
import sqlite3
import re

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Instagram data from scrape
instagram_data = """
babysallright.com|https://www.instagram.com/babysallright/
chelseatableandstage.com|https://www.instagram.com/chelseatableandstage/
bryantparkhotel.com|https://www.instagram.com/bryantparkhotel/
bushbk.com|https://www.instagram.com/bushdykebar/
amelias.nyc|https://www.instagram.com/ameliasparkave/
classiccarclubmanhattan.com|https://www.instagram.com/cccmanhattan/
jbespoke.com|https://www.instagram.com/jbespokenyc/
gildedlilyevents.com|https://www.instagram.com/gildedlilyevents/
goodroombk.com|https://www.instagram.com/goodroombk/
commoncountrybar.com|https://www.instagram.com/commoncountryeast/
commongroundnyc.com|https://www.instagram.com/commongroundbar/
littlemorenyc.com|https://www.instagram.com/littlemorenyc/
heartveinnyc.com|https://www.instagram.com/heartveinnyc/
lovesclubnyc.com|https://www.instagram.com/lovesclubnyc/
moxytimessquare.com|https://www.instagram.com/moxytimessquare/
lpr.com|https://www.instagram.com/lprnyc/
nowadays.nyc|https://www.instagram.com/nowadaysnyc/
nypienashville.com|https://www.instagram.com/realnypie/
pianosnyc.com|https://www.instagram.com/pianosnyc/
musicanewyork.net|https://www.instagram.com/musicanyc/
nublu.net|https://www.instagram.com/nublunyc/
racketnyc.com|https://www.instagram.com/racketnewyork/
publichousenyc.com|https://www.instagram.com/publichousenyc/
nyprincesscruises.com|https://www.instagram.com/newyorkprincesscruises/
selva.nyc|https://www.instagram.com/selva_nyc/
markethotel.org|https://www.instagram.com/market.hotel/
inhouse.scot|https://www.instagram.com/inhouse.scot/
sirhenrysnyc.com|https://www.instagram.com/sirhenrysnyc/
thesultanroom.com|https://www.instagram.com/thesultanroom/
electricroomnyc.com|https://www.instagram.com/electricroomnyc/
outerheaven.nyc|https://www.instagram.com/outerheaven.nyc/
tavern29.com|https://www.instagram.com/tavern29/
virgonewyork.com|https://www.instagram.com/virgopresents/
0000space.com|https://www.instagram.com/hwaneeplaylist/
230-fifth.com|https://www.instagram.com/230fifthrooftop/
taphaus33.net|https://www.instagram.com/taphaus/
addictivenyc.com|https://www.instagram.com/addictivenyc/
310bowery.nyc|https://www.instagram.com/310bowerybar/
versanyc.com|https://www.instagram.com/versanyc/
algonquinhotel.com|https://www.instagram.com/algonquinnyc/
bourbonorleans.com|https://www.instagram.com/bourbonorleanshotel/
bembe.us|https://www.instagram.com/bembebrooklyn/
blindbarber.com|https://www.instagram.com/blindbarber/
dnd-nyc.com|https://www.instagram.com/donotdisturb.ny/
corinnesplace.com|https://www.instagram.com/corinnesplace/
elsewhere.club|https://www.instagram.com/elsewherespace/
cmoneverybody.com|https://www.instagram.com/cmoneverybodybk/
follynyc.com|https://www.instagram.com/follynyc/
highvibe.com|https://www.instagram.com/highvibenyc/
handynasty.net|https://www.instagram.com/handynasty/
gyu-kaku.com|https://www.instagram.com/gyukakujbbq/
isolabrooklyn.com|https://www.instagram.com/isolabrooklyn/
likealocaltours.com|https://www.instagram.com/likealocaltours/
marqueeohio.com|https://www.instagram.com/marqueeohio/
mercuryeastpresents.com|https://www.instagram.com/mercuryeast/
mehanata.com|https://www.instagram.com/mehanata/
monarchrooftop.com|https://www.instagram.com/monarchnyc/
lillistarbk.com|https://www.instagram.com/lillistarbk/
prettyrickys.com|https://www.instagram.com/prettyrickysbar/
newworldstages.com|https://www.instagram.com/newworldstages/
my-little-paris.com|https://www.instagram.com/mylittlepariscafeplay/
republiclatinfusion.com|https://www.instagram.com/republiclatinfusion/
queensbp.org|https://www.instagram.com/queensbprichards/
roguegarms.com|https://www.instagram.com/roguegarms/
rodneysnewyorkcomedyclub.com|https://www.instagram.com/rodneycomedyclub/
printersalleynyc.com|https://www.instagram.com/printersalleynyc/
summerclubnyc.com|https://www.instagram.com/summerclubnyc/
stonestreettavernnyc.com|https://www.instagram.com/stonesttavern/
thepenthouseny.com|https://www.instagram.com/thepenthouseny/
supperclubnyc.com|https://www.instagram.com/supperclub_nyc/
terminal5nyc.com|https://www.instagram.com/terminal5nyc/
thecraftsmannyc.com|https://www.instagram.com/TheCraftsmanNYC/
toomuchawesomeness.com|https://www.instagram.com/toomuchawesomeness/
venuesnyc.com|https://www.instagram.com/venues_nyc/
theboardroomny.com|https://www.instagram.com/theboardroomny/
sweetwaterny.com|https://www.instagram.com/sweetwaterny/
wearethehouse.com|https://www.instagram.com/thehouse.nyc/
vivatoro.com|https://www.instagram.com/vivatoro/
y4as.com|https://www.instagram.com/yachtsforallseasons/
3dollarbillbk.com|https://www.instagram.com/3dollarbillbk/
bohemianhall.com|https://www.instagram.com/bohemianbeergarden/
bourbonstreetny.com|https://www.instagram.com/bourbonstreetny/
acoustikgardenlounge.com|https://www.instagram.com/acoustikgardenlounge/
capitaleny.com|https://www.instagram.com/capitalenyc/
broomestreetganesh.org|https://www.instagram.com/broomestreetganesh/
dallasbbq.com|https://www.instagram.com/dallasbbq/
ciprianievents.com|https://www.instagram.com/ciprianievents/
dineatbuca.com|https://www.instagram.com/bucadibeppo/
brooklynstorehouse.com|https://www.instagram.com/brooklynstorehouse/
chickiesandpetes.com|https://www.instagram.com/chickiesandpetes/
evolnyc.us|https://www.instagram.com/evolclubnyc/
dom-lounge.com|https://www.instagram.com/thedomnyc/
bryantparkgrillnyc.com|https://www.instagram.com/bryantparkgrill/
haswellgreens.com|https://www.instagram.com/haswellgreensnyc/
industrycity.com|https://www.instagram.com/industrycity/
laissezfaire.nyc|https://www.instagram.com/laissezfaire.nyc/
gloungechelsea.com|https://www.instagram.com/gloungechelsea/
headlesshorseman.com|https://www.instagram.com/headlesshorsemanattractions/
moodringnyc.club|https://www.instagram.com/moodringnyc/
musicforawhile.nyc|https://www.instagram.com/musicforawhile.nyc/
ironbarnyc.com|https://www.instagram.com/ironbarloungenyc/
nebulanewyork.com|https://www.instagram.com/nebulanewyork/
littleowleventsnyc.com|https://www.instagram.com/littleowlevents/
nycnewyears.com|https://www.instagram.com/nycnewyears/
parkavenuetavern.com|https://www.instagram.com/parkavetavern/
primeastoria.com|https://www.instagram.com/primeastoria/
planethollywoodnyc.com|https://www.instagram.com/planethollywood/
pioneerworks.org|https://www.instagram.com/pioneerworks/
rosevalenyc.com|https://www.instagram.com/rosevalecocktailroom/
shaymazaesthetics.com|https://www.instagram.com/shay_maz_aesthetics/
sonyhall.com|https://www.instagram.com/sonyhall/
rubytuesday.com|https://www.instagram.com/rubytuesday/
thebronzeowlnyc.com|https://www.instagram.com/bronzeowlnyc/
thedean-nyc.com|https://www.instagram.com/thedeannyc/
starchildrooftop.com|https://www.instagram.com/starchildrooftop/
taogroup.com|https://www.instagram.com/taogrouphospitality/
stksteakhouse.com|https://www.instagram.com/eatstk/
tajmahallounge.com|https://www.instagram.com/tajloungenyc/
theknickerbocker.com|https://www.instagram.com/theknicknyc/
treadwellpark.com|https://www.instagram.com/treadwellpark/
landsharkbarandgrill.com|https://www.instagram.com/margaritaville/
taodowntown.com|https://www.instagram.com/taodowntown/
thereservenyc.com|https://www.instagram.com/thereservenyc/
acehotel.com|https://www.instagram.com/acehotel/
virginhotels.com|https://www.instagram.com/virginhotels/
arlohotels.com|https://www.instagram.com/arlohotels/
cafeerzulie.com|https://www.instagram.com/cafe.erzulie/
bravokosherpizza.com|https://www.instagram.com/bravokosherpizza/
centralparknyc.org|https://www.instagram.com/centralparknyc/
atticurbanrooftop.com|https://www.instagram.com/attic_urbanrooftop/
catchrestaurants.com|https://www.instagram.com/catch/
bourbonsteaknyc.com|https://www.instagram.com/bourbonsteaknyc/
brooklynchophouse.com|https://www.instagram.com/brooklynchophouse/
damballa.nyc|https://www.instagram.com/damballa.nyc/
sugarmousenyc.com|https://www.instagram.com/SUGARMOUSE.NYC/
darlingrooftop.com|https://www.instagram.com/darlingrooftop/
deadletterno9.com|https://www.instagram.com/no9nyc/
cipriani.com|https://www.instagram.com/cipriani/
divebarbk.com|https://www.instagram.com/divebarbk/
bowerypresents.com|https://www.instagram.com/bowerypresents/
gabriela.nyc|https://www.instagram.com/gabriela90.nyc/
gansevoorthotelgroup.com|https://www.instagram.com/gansevoort/
firstroundsonme.co|https://www.instagram.com/firstroundsonme/
hkhall.com|https://www.instagram.com/hkhall_/
fishtownseafood.com|https://www.instagram.com/Fishtownseafood/
essexnyc.com|https://www.instagram.com/essexrestaurant.nyc/
hellobarinc.com|https://www.instagram.com/hellobarandbites/
elsierooftop.com|https://www.instagram.com/elsierooftop/
houstonhallny.com|https://www.instagram.com/houstonhallnyc/
hotelalameda.com|https://www.instagram.com/hotelalamedahighline/
hotelhaydennyc.com|https://www.instagram.com/hotelhaydennyc/
hotelchantellenyc.com|https://www.instagram.com/hotelchantelle/
lebainnewyork.com|https://www.instagram.com/lebainnyc/
lovejoysnyc.com|https://www.instagram.com/lovejoysnyc/
luckystrikeent.com|https://www.instagram.com/luckystrikeent/
lostinparadiserooftop.com|https://www.instagram.com/lostinparadiserooftop/
paragonbroadway.com|https://www.instagram.com/paragonbroadway/
masalakitchen.com|https://www.instagram.com/masalakitchenphilly/
newyorkencounter.org|https://www.instagram.com/nyencounter/
meguworldwide.com|https://www.instagram.com/meguworldwide/
margaritavilleresorts.com|https://www.instagram.com/margaritavillestays/
msg.com|https://www.instagram.com/thegarden/
penny-hotel.com|https://www.instagram.com/pennyhotel/
riffraffnyc.com|https://www.instagram.com/theriffraffclub/
marriott.com|https://www.instagram.com/marriottbonvoy/
secretprojectrobot.org|https://www.instagram.com/secretprojectrobot/
sampanphilly.com|https://www.instagram.com/sampanphilly/
ruthschris.com|https://www.instagram.com/ruthschris/
signalnyc.club|https://www.instagram.com/signalnyc/
sanantoniosnyc.com|https://www.instagram.com/sanantoniosnyc/
si-bk.com|https://www.instagram.com/superioringredients/
silobrooklyn.com|https://www.instagram.com/silobrooklyn/
thedickensnyc.com|https://www.instagram.com/thedickensnyc/
thecapitalgrille.com|https://www.instagram.com/thecapitalgrille/
thedelancey.com|https://www.instagram.com/thedelancey/
royaltonparkavenue.com|https://www.instagram.com/royaltonparkavenue/
thedl-nyc.com|https://www.instagram.com/thedlnyc/
sourmousenyc.com|https://www.instagram.com/SOURMOUSENYC/
hartbarnyc.com|https://www.instagram.com/hartbarnyc/
thebrooklynmonarch.com|https://www.instagram.com/thebrooklynmonarch/
apricotstonephilly.com|https://www.instagram.com/apricotstonephilly/
theredpavilion.com|https://www.instagram.com/redpavilionbk/
barcassettenyc.com|https://www.instagram.com/cassettenyc/
bkbackyard.com|https://www.instagram.com/bkbackyardbar/
consiglierewine.com|https://www.instagram.com/consiglierewine/
moxychelsea.com|https://www.instagram.com/moxychelsea/
knockdown.center|https://www.instagram.com/knockdowncenter/
framesnyc.com|https://www.instagram.com/framesnyc/
amctheatres.com|https://www.instagram.com/amctheatres/
millenniumhotels.com|https://www.instagram.com/millennium/
ilbastardonyc.com|https://www.instagram.com/ilbastardobrunchnyc/
"""

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== ADDING INSTAGRAM HANDLES ===\n")

updated = 0
failed = 0

for line in instagram_data.strip().split('\n'):
    if '|' not in line:
        continue
    
    domain, ig_url = line.split('|')
    
    # Extract handle
    match = re.search(r'instagram\.com/([a-zA-Z0-9._]+)', ig_url)
    if not match:
        continue
    
    ig_handle = match.group(1).rstrip('/')
    
    try:
        cursor.execute("""
            UPDATE venues
            SET instagram_handle = ?
            WHERE website LIKE ?
            AND instagram_handle IS NULL
        """, (ig_handle, f'%{domain}%'))
        
        if cursor.rowcount > 0:
            print(f"✅ {domain} → @{ig_handle}")
            updated += 1
    except sqlite3.IntegrityError:
        failed += 1

conn.commit()

print(f"\n{'='*60}")
print(f"✅ Updated: {updated}")
print(f"⏭️  Duplicates skipped: {failed}\n")

# Now delete venues with no Instagram
print("=== DELETING VENUES WITHOUT INSTAGRAM ===\n")

cursor.execute("""
    DELETE FROM venues
    WHERE instagram_handle IS NULL
    AND should_exclude = 0
    AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
                 'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
""")

deleted = cursor.rowcount
conn.commit()
conn.close()

print(f"🗑️  Deleted {deleted} venues without Instagram\n")

print(f"{'='*60}")
print(f"=== FINAL CLEANUP COMPLETE ===")
print(f"✅ Added Instagram: {updated}")
print(f"🗑️  Deleted no-Instagram venues: {deleted}")

