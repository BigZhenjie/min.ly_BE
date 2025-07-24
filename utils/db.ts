// Interface for Redis cache data
interface RedisUrlData {
  long_url: string;
}
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const checkShortUrlExists = async (shortUrl: string) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { count, error } = await supabase
      .from("urls")
      .select("short_url", { count: "exact", head: true })
      .eq("short_url", shortUrl);
    if (error) return { error: error };
    // count will be 0 or 1
    const rowExists = count === 1;
    return { data: rowExists };
  } catch (error) {
    console.log("ERROR in func: checkShortUrlExists\nError:" + error);
    return { error: "ERROR in func: checkShortUrlExists\nError:" + error };
  }
};

const checkRedisCache = async (shortUrl: string): Promise<{ data: RedisUrlData | null; error?: any }> => {
  try {
    const redis = Redis.fromEnv();
    const res = await redis.get(shortUrl);
    if (!res) return { data: null };
    // If the value is a string, wrap it in the object
    if (typeof res === 'string') {
      return { data: { long_url: res } };
    }
    // If already an object, assume correct shape
    return { data: res as RedisUrlData };
  } catch (error) {
    console.log("ERROR in func: checkRedisCache\nError:" + error);
    return { data: null, error: "ERROR in func: checkRedisCache\nError:" + error };
  }
};

const getURLFromDB = async (shortUrl: string) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("urls")
      .select("long_url")
      .eq("short_url", shortUrl)
      .limit(1);

    if (error) return { error: error };
    if (!data) return { data: null };

    return { data: data };
  } catch (error) {
    console.log("ERROR in func: getURLFromDB\nError:" + error);
    return { error: "ERROR in func: getURLFromDB\nError:" + error };
  }
};

const increClicks = async (shortUrl: string) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.rpc("incrementclicks", {
      target_short_url: shortUrl,
    });
    
    if (error) {
      console.error("RPC Error:", error);
      return { error };
    }
    
    console.log("New click count:", data);
    return { clicks: data };
  } catch (error) {
    console.error("ERROR in func: increClicks", error);
    return { error: String(error) };
  }
};

const createShortUrl = async (shortUrl: string, longUrl: string) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("urls")
      .insert([
        {
          short_url: shortUrl,
          long_url: longUrl,
        },
      ])
      .select();
    if (error) return { error: error };
    return { data: data };
  } catch (error) {
    console.log("ERROR in func: increClicks\nError:" + error);
    return { error: "ERROR in func: increClicks\nError:" + error };
  }
};

const putInRedis = async (shortUrl: string, longUrl: string) => {
  try {
    const redis = Redis.fromEnv();
    // Store as JSON string for consistency
    const res = await redis.set(shortUrl, JSON.stringify({ long_url: longUrl }));
    if (!res) return { data: null };
    return { data: res };
  } catch (error) {
    console.log("ERROR in func: checkRedisCache\nError:" + error);
    return { error: "ERROR in func: checkRedisCache\nError:" + error };
  }
};

export {
  checkShortUrlExists,
  checkRedisCache,
  getURLFromDB,
  increClicks,
  createShortUrl,
  putInRedis,
};
