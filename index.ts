import express, { Request, Response } from "express";
import { checkRedisCache, checkShortUrlExists, createShortUrl, getURLFromDB, increClicks, putInRedis } from "./utils/db";
import { generateRandomBase62 } from "./utils/base62";
import cors from "cors";
import { isValidUrl } from "./utils/utils";

const app = express();
const port = 3000;

app.use(express.json()); // Add this line to parse JSON request bodies
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.post("/create", async (req: Request, res: Response) => {
  try {
    const { shortUrl, url } = req.body;
    //verify if long url is indeed a url
    const longUrl = url.includes("://") ? url : `https://${url}`;
    if (!isValidUrl(longUrl)) {
      return res
        .status(400)
        .send({ error: "Original url is not a valid url." });
    }
    let valid_shortUrl;
    //check if url exists
    if (shortUrl) {
      const exists = await checkShortUrlExists(shortUrl);
      if (exists.data) {
        return res.status(400).send({ error: "Short url not available!" });
      }
    } else {
      let found = false;

      while (!found) {
        valid_shortUrl = generateRandomBase62();
        const valid = await checkShortUrlExists(valid_shortUrl);
        if (!valid.data) {
          found = true;
        }
      }
    }

    //if not, then we get hold of a random available shorturl

    const createRes = await createShortUrl(
      valid_shortUrl ? valid_shortUrl : shortUrl,
      longUrl
    );
    if (createRes.error) {
      return res.status(500).send({ error: createRes.error });
    }

    return res.status(200).send({ data: createRes.data });
  } catch (err) {
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.get("/:shortUrl", async (req: Request, res: Response) => {
  try {
    const shortUrl = req.params.shortUrl;

    //check redis
    const existsInRedis = await checkRedisCache(shortUrl);
    if (existsInRedis.data){
      await increClicks(shortUrl);
      // If data is an object, use the correct property (e.g., long_url). If it's a string, use as is.
      const urlToRedirect = typeof existsInRedis.data === 'string'
        ? existsInRedis.data
        : (existsInRedis.data && typeof (existsInRedis.data as any).long_url === 'string'
            ? (existsInRedis.data as { long_url: string }).long_url
            : undefined);
      if (!urlToRedirect) {
        return res.status(400).send({ error: "Invalid data in cache." });
      }
      return res.redirect(urlToRedirect)
    }
    //check db
    const existsInDB = await getURLFromDB(shortUrl);
    if (!existsInDB.data || !Array.isArray(existsInDB.data) || existsInDB.data.length === 0) {
      return res.status(400).send({error: "Short url doesn't exist!"})
    }
    const longUrl = existsInDB.data[0].long_url
    //if not exist in db, return error message
    //put in redis
    await putInRedis(shortUrl, longUrl);
    await increClicks(shortUrl)
    return res.redirect(longUrl)
    //return redirect
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Running on ${port}`);
});
