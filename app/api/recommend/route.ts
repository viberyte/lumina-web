import path from "path";
import Database from "better-sqlite3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Quality = "strict" | "loose" | "none";
interface Ctx { city?:string; state?:string; area?:string; vibe?:string; cuisine?:string; musicGenre?:string; seed?:string; }

const norm = (s: unknown) => (s==null?"":String(s).toLowerCase().replace(/\s+/g," ").trim());

function isNJCity(rawCity: string): boolean {
  const c = norm(rawCity);
  if (!c) return false;
  if (c === "new jersey" || c === "nj") return true;
  const njTokens = [
    "jersey city","newark","hoboken","weehawken","bayonne","secaucus","clifton","montclair",
    "fort lee","teaneck","edison","paramus","princeton","camden","asbury park","red bank",
    "paterson","trenton","morristown","new brunswick","woodbridge","belmar","freehold","long branch",
    "north jersey","bergen","essex","hudson","union","middlesex","passaic","monmouth","morris","ocean"
  ];
  if (njTokens.some(t => c.includes(t))) return true;
  if (c.endsWith(", nj") || c.endsWith(" nj")) return true;
  return false;
}

const pickSource = (ctx: Ctx): "clean_venues" | "clean_nj_venues" =>
  isNJCity(norm(ctx.city || ctx.state || ctx.area)) ? "clean_nj_venues" : "clean_venues";

function offsetFromSeed(seed?: string): number {
  if (!seed) return 0;
  const s = String(seed); let acc = 0;
  for (let i=0;i<s.length;i++) acc += s.charCodeAt(i);
  return acc % 24;
}

function vibeSQL(vibeRaw: string) {
  const v = norm(vibeRaw);
  if (v === "dinner" || v === "restaurant") {
    return "(lower(category) = 'dining' OR lower(category) LIKE '%restaurant%')";
  }
  if (["lounge","club","nightlife"].includes(v)) {
    return "("+
      "lower(category) IN ('nightlife','lounge','bar','club') "+
      "OR lower(category) LIKE '%nightlife%' "+
      "OR lower(category) LIKE '%lounge%' "+
      "OR lower(name) LIKE '%lounge%' "+
      "OR lower(name) LIKE '%club%' "+
      "OR lower(name) LIKE '%bar%'"+
    ")";
  }
  return "(lower(category) IN ('dining','nightlife','lounge','bar','club') OR lower(category) LIKE '%restaurant%')";
}

function citySQL(table:"clean_venues"|"clean_nj_venues", raw:string){
  const c = norm(raw);
  if (!c) return { sql:"", params:[] as any[] };
  if (table === "clean_venues"){
    return { sql:"(lower(city)=? OR lower(neighborhood)=?)", params:[c,c] };
  }
  return { sql:"(lower(city)=? OR lower(neighborhood)=? OR lower(address) LIKE ? OR lower(address) LIKE '%, nj%')", params:[c,c,`%${c}%`] };
}

function cuisineSQL(raw?:string){
  const cu = norm(raw||""); if (!cu) return {sql:"",params:[] as any[]};
  return { sql:"lower(cuisine_json) LIKE ?", params:[`%"${cu}"%`] };
}

function musicSQL(raw?:string){
  const mg = norm(raw||""); if (!mg) return {sql:"",params:[] as any[]};
  // Be generous with hip hop variants
  const variants = mg === "hip hop"
    ? [`%"hip hop"%`,`%"hip-hop"%`,`%"hiphop"%`]
    : [`%"${mg}"%`];
  const ors = variants.map(()=> "lower(music_json) LIKE ?").join(" OR ");
  return { sql:`(${ors})`, params:variants };
}

function buildWhere(
  table:"clean_venues"|"clean_nj_venues",
  ctx: Ctx,
  opts:{ ignoreCity?:boolean; ignoreMusic?:boolean; ignoreCuisine?:boolean; keywordOnlyNJ?:boolean }
){
  const parts:string[] = ["COALESCE(should_exclude,0)=0","name IS NOT NULL","TRIM(name)<>''"];
  let params:any[] = [];

  // Base vibe
  if (!opts.keywordOnlyNJ) {
    parts.push(vibeSQL(ctx.vibe||""));
  } else {
    // Keyword-only for NJ emergency fallback
    parts.push("("+
      "lower(name) LIKE '%lounge%' OR lower(name) LIKE '%club%' OR lower(name) LIKE '%bar%' OR "+
      "lower(category) LIKE '%lounge%' OR lower(category) LIKE '%nightlife%' OR lower(category) LIKE '%bar%'"+
    ")");
  }

  if (!opts.ignoreCity){
    const cf = citySQL(table, ctx.city || ctx.state || ctx.area || "");
    if (cf.sql){ parts.push(cf.sql); params.push(...cf.params); }
  }
  if (!opts.ignoreCuisine){
    const cu = cuisineSQL(ctx.cuisine);
    if (cu.sql){ parts.push(cu.sql); params.push(...cu.params); }
  }
  if (!opts.ignoreMusic){
    const mu = musicSQL(ctx.musicGenre);
    if (mu.sql){ parts.push(mu.sql); params.push(...mu.params); }
  }

  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { where, params };
}

function runQuery(
  db: Database.Database,
  table:"clean_venues"|"clean_nj_venues",
  whereSQL:string,
  params:any[],
  offset:number
){
  const sql =
`SELECT id, name, city, neighborhood, address, rating, cuisine_json, music_json, photo_url, why_recommended
 FROM ${table}
 ${whereSQL}
 ORDER BY (photo_url IS NOT NULL AND TRIM(photo_url) <> '') DESC,
          rating DESC NULLS LAST,
          name ASC
 LIMIT 24 OFFSET ?`;
  return db.prepare(sql).all(...params, offset);
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({}));
    const ctx: Ctx = (body?.context ?? body ?? {}) as Ctx;

    const db = new Database(path.join(process.cwd(),"data","lumina.db"));
    const chosen = pickSource(ctx);
    let used: "clean_venues" | "clean_nj_venues" = chosen;
    const offset = offsetFromSeed(ctx.seed);

    let rows:any[] = [];

    if (chosen === "clean_nj_venues"){
      // NJ: relax early + keyword-only NJ fallback before NYC
      const njStages = [
        { ignoreCity:false, ignoreMusic:false, ignoreCuisine:false, keywordOnlyNJ:false }, // strict
        { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:false, keywordOnlyNJ:false }, // drop music
        { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false }, // drop cuisine
        { ignoreCity:true,  ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false }, // ignore city
        { ignoreCity:true,  ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:true  }, // keyword-only NJ
      ];
      for (const st of njStages){
        const f = buildWhere(used, ctx, st);
        rows = runQuery(db, used, f.where, f.params, offset);
        if (rows.length>0) break;
      }
      if (rows.length===0){
        used = "clean_venues";
        const nyStages = [
          { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:false, keywordOnlyNJ:false },
          { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false },
          { ignoreCity:true,  ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false },
        ];
        for (const st of nyStages){
          const f = buildWhere(used, ctx, st);
          rows = runQuery(db, used, f.where, f.params, offset);
          if (rows.length>0) break;
        }
      }
    } else {
      // NYC first: normal strict -> loose
      const nyStages = [
        { ignoreCity:false, ignoreMusic:false, ignoreCuisine:false, keywordOnlyNJ:false },
        { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:false, keywordOnlyNJ:false },
        { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false },
        { ignoreCity:true,  ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false },
      ];
      for (const st of nyStages){
        const f = buildWhere(used, ctx, st);
        rows = runQuery(db, used, f.where, f.params, offset);
        if (rows.length>0) break;
      }
      if (rows.length===0){
        // peek NJ if NYC empty
        used = "clean_nj_venues";
        const njPeek = [
          { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:false, keywordOnlyNJ:false },
          { ignoreCity:false, ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:false },
          { ignoreCity:true,  ignoreMusic:true,  ignoreCuisine:true,  keywordOnlyNJ:true  },
        ];
        for (const st of njPeek){
          const f = buildWhere(used, ctx, st);
          rows = runQuery(db, used, f.where, f.params, offset);
          if (rows.length>0) break;
        }
      }
    }

    const primary = rows.slice(0,5);
    let tryThis = rows.length>5 ? rows[5] : null;
    if (tryThis && primary.some(p=>p.id===tryThis.id)){
      tryThis = rows.find(r=>!primary.some(p=>p.id===r.id)) || null;
    }

    return NextResponse.json({
      ok: true,
      debug: {
        parsed: {
          city: ctx.city || "",
          vibe: ctx.vibe || "",
          cuisine: ctx.cuisine || "",
          musicGenre: ctx.musicGenre || ""
        },
        chosenTable: chosen,
        usedTable: used
      },
      sourceTable: used,
      count: primary.length,
      primary,
      tryThis
    });
  }catch(err:any){
    console.error("recommend error:", err);
    return NextResponse.json({ ok:false, error:String(err?.message||err) }, { status:500 });
  }
}
